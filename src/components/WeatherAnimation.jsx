import { useMemo } from 'react';
import { getWeatherInfo } from '../utils/weatherCodes';

export default function WeatherAnimation({ code, isDay }) {
  const w = useMemo(() => getWeatherInfo(code, isDay), [code, isDay]);

  const particles = useMemo(() => {
    if (w.type === 'rain') {
      return Array.from({ length: 30 }, (_, i) => ({
        key: `rain-${i}`,
        type: 'raindrop',
        style: {
          left: `${Math.random() * 100}%`,
          height: `${15 + Math.random() * 25}px`,
          animationDuration: `${0.5 + Math.random() * 0.7}s`,
          animationDelay: `${Math.random() * 1.5}s`,
        },
      }));
    }
    if (w.type === 'snow') {
      return Array.from({ length: 20 }, (_, i) => {
        const size = 3 + Math.random() * 5;
        return {
          key: `snow-${i}`,
          type: 'snowflake',
          style: {
            left: `${Math.random() * 100}%`,
            width: `${size}px`,
            height: `${size}px`,
            animationDuration: `${2 + Math.random() * 3}s`,
            animationDelay: `${Math.random() * 3}s`,
          },
        };
      });
    }
    if (w.type === 'storm') {
      const drops = Array.from({ length: 35 }, (_, i) => ({
        key: `storm-rain-${i}`,
        type: 'raindrop',
        style: {
          left: `${Math.random() * 100}%`,
          height: `${20 + Math.random() * 30}px`,
          animationDuration: `${0.4 + Math.random() * 0.5}s`,
          animationDelay: `${Math.random() * 1}s`,
        },
      }));
      const bolts = Array.from({ length: 2 }, (_, i) => ({
        key: `bolt-${i}`,
        type: 'lightning',
        style: {
          left: `${20 + Math.random() * 60}%`,
          top: `${Math.random() * 40}%`,
          animationDelay: `${Math.random() * 4}s`,
        },
      }));
      return [...drops, ...bolts];
    }
    if (w.type === 'cloud') {
      return Array.from({ length: 3 }, (_, i) => ({
        key: `cloud-${i}`,
        type: 'cloud-shape',
        style: {
          width: `${60 + Math.random() * 80}px`,
          height: `${20 + Math.random() * 20}px`,
          top: `${10 + Math.random() * 60}%`,
          animationDuration: `${12 + Math.random() * 10}s`,
          animationDelay: `${Math.random() * 8}s`,
        },
      }));
    }
    return [];
  }, [w.type]);

  const isSun = w.type === 'sun' && isDay;

  return (
    <div
      className={`absolute inset-0 pointer-events-none z-0 overflow-hidden ${isSun ? 'sun-glow' : ''}`}
      style={{ background: 'var(--gradient-card)' }}
    >
      {particles.map((p) => (
        <div key={p.key} className={p.type} style={p.style} />
      ))}
    </div>
  );
}
