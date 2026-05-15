import { useMemo } from 'react';
import { Sun } from 'lucide-react';

export default function BestTime({ weatherData, tempUnit }) {
  const unitSym = tempUnit === 'celsius' ? '°C' : '°F';

  const bestHour = useMemo(() => {
    if (!weatherData?.hourly) return null;
    
    const now = new Date();
    const hourly = weatherData.hourly;
    
    let best = null;
    let highestScore = -999;
    
    for (let i = 0; i < hourly.time.length; i++) {
      const time = new Date(hourly.time[i]);
      
      // Skip past hours
      if (time < now) continue; 
      
      // Stop looking after 24 hours to find the *next* best time
      if (time.getTime() - now.getTime() > 24 * 60 * 60 * 1000) break;
      
      // Skip nighttime
      if (hourly.is_day?.[i] === 0) continue; 
      
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

  const isTomorrow = bestHour.time.getDate() !== new Date().getDate();

  return (
    <div className="mx-6 mb-4 p-4 rounded-2xl max-md:mx-4 max-md:mb-3 flex items-center justify-between" 
         style={{ background: 'var(--bg-card)', border: '1px solid #450a0a' }}>
      <div>
        <h3 className="text-md font-bold flex items-center gap-2 mb-1.5" style={{ color: 'var(--text-primary)' }}>
          <Sun size={16} className="text-yellow-500" /> Best Time to Go Outside
        </h3>
        <p className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
          {isTomorrow ? 'Tomorrow, ' : 'Today, '}{bestHour.time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} • {bestHour.desc}, {Math.round(bestHour.temp)}{unitSym}
        </p>
      </div>
    </div>
  );
}
