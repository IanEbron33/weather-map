import { useMemo } from 'react';
import { Sun } from 'lucide-react';

export default function BestTime({ weatherData, tempUnit }) {
  const unitSym = tempUnit === 'celsius' ? '°C' : '°F';

  const bestHour = useMemo(() => {
    if (!weatherData?.hourly) return null;
    
    const now = new Date();
    const hourly = weatherData.hourly;
    
    // Find sunset today
    let sunsetTime = null;
    if (weatherData.daily?.sunset?.[0]) {
      sunsetTime = new Date(weatherData.daily.sunset[0]);
    }
    
    let best = null;
    let highestScore = -999;
    
    for (let i = 0; i < hourly.time.length; i++) {
      const time = new Date(hourly.time[i]);
      
      // Skip past hours
      if (time < now) continue; 
      
      // Stop looking at the end of today
      if (time.getDate() !== now.getDate()) break; 
      
      // Stop looking after sunset
      if (sunsetTime && time >= sunsetTime) continue; 
      
      let score = 0;
      const temp = hourly.temperature_2m[i];
      const precip = hourly.precipitation_probability[i];
      const code = hourly.weather_code[i];
      
      // Clear skies = huge bonus
      if (code === 0 || code === 1) score += 20;
      if (code >= 51) score -= 100; // Rain/Snow is terrible
      
      // Perfect temp is ~22C
      const tempC = tempUnit === 'fahrenheit' ? (temp - 32) * 5/9 : temp;
      score -= Math.abs(22 - tempC) * 2; 
      
      // High rain probability is bad
      score -= precip;

      if (score > highestScore) {
        highestScore = score;
        best = {
          time,
          temp,
          desc: code === 0 || code === 1 ? 'Clear skies' : (code < 51 ? 'Partly cloudy' : 'Rainy')
        };
      }
    }
    
    return best;
  }, [weatherData, tempUnit]);

  if (!bestHour) return null;

  return (
    <div className="mx-6 mb-4 p-4 rounded-2xl max-md:mx-4 max-md:mb-3 flex items-center justify-between" 
         style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div>
        <h3 className="text-sm font-bold flex items-center gap-2 mb-1.5" style={{ color: 'var(--text-primary)' }}>
          <Sun size={16} className="text-yellow-500" /> Best Time to Go Outside
        </h3>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {bestHour.time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} • {bestHour.desc}, {Math.round(bestHour.temp)}{unitSym}
        </p>
      </div>
    </div>
  );
}
