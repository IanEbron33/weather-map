import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { getWeatherInfo } from '../utils/weatherCodes';
import { Sun, Moon, CloudSun, CloudMoon, Cloud, Cloudy, CloudFog, CloudDrizzle, CloudRain, CloudSnow, Snowflake, CloudLightning, Thermometer, HelpCircle } from 'lucide-react';

const WeatherIcons = { Sun, Moon, CloudSun, CloudMoon, Cloud, Cloudy, CloudFog, CloudDrizzle, CloudRain, CloudSnow, Snowflake, CloudLightning, Thermometer, HelpCircle };

export default function HourlyChart({ weatherData, tempUnit }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const chartData = useMemo(() => {
    if (!weatherData) return null;
    const hourly = weatherData.hourly;
    const now = new Date();
    let startIdx = 0;
    for (let i = 0; i < hourly.time.length; i++) {
      if (new Date(hourly.time[i]) >= now) { startIdx = i; break; }
    }
    return {
      temps: hourly.temperature_2m.slice(startIdx, startIdx + 24),
      codes: hourly.weather_code.slice(startIdx, startIdx + 24),
      times: hourly.time.slice(startIdx, startIdx + 24),
    };
  }, [weatherData]);

  const dimensions = useMemo(() => ({
    padding: { top: 48, right: 24, bottom: 32, left: 44 },
    h: 160,
  }), []);

  const draw = useCallback(() => {
    if (!chartData || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const container = containerRef.current;
    const w = container.clientWidth;
    const h = dimensions.h;

    if (w <= 0) return;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const { temps } = chartData;
    const { padding } = dimensions;
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const minT = Math.floor(Math.min(...temps)) - 1;
    const maxT = Math.ceil(Math.max(...temps)) + 1;
    const rangeT = maxT - minT || 1;

    const xStep = chartW / (temps.length - 1);
    const getX = (i) => padding.left + i * xStep;
    const getY = (t) => padding.top + chartH - ((t - minT) / rangeT) * chartH;

    // Draw grid lines
    ctx.textAlign = 'right';
    const ySteps = 4;
    for (let i = 0; i <= ySteps; i++) {
      const val = minT + (rangeT / ySteps) * i;
      const y = getY(val);
      ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.fillText(`${Math.round(val)}°`, padding.left - 10, y + 4);
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
    }

    // Draw main curve
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(temps[0]));
    for (let i = 1; i < temps.length; i++) {
      const xc = (getX(i - 1) + getX(i)) / 2;
      const yc = (getY(temps[i - 1]) + getY(temps[i])) / 2;
      ctx.quadraticCurveTo(getX(i - 1), getY(temps[i - 1]), xc, yc);
    }
    ctx.quadraticCurveTo(getX(temps.length - 2), getY(temps[temps.length - 2]), getX(temps.length - 1), getY(temps[temps.length - 1]));

    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    grad.addColorStop(0, 'rgba(99,102,241,0.2)');
    grad.addColorStop(1, 'rgba(99,102,241,0)');
    ctx.lineTo(getX(temps.length - 1), padding.top + chartH);
    ctx.lineTo(getX(0), padding.top + chartH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Draw dots
    for (let i = 0; i < temps.length; i += 3) {
      ctx.beginPath();
      ctx.arc(getX(i), getY(temps[i]), 3, 0, Math.PI * 2);
      ctx.fillStyle = '#818cf8';
      ctx.fill();
    }

    // Draw time labels
    ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < chartData.times.length; i += 3) {
      const d = new Date(chartData.times[i]);
      const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
      ctx.fillText(timeStr, getX(i), h - 10);
    }
  }, [chartData, dimensions]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setContainerWidth(entries[0].contentRect.width);
        draw();
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [draw]);

  const icons = useMemo(() => {
    if (!chartData || containerWidth <= 0) return [];
    const { temps, codes } = chartData;
    const { padding, h } = dimensions;
    const w = containerWidth;
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    const minT = Math.floor(Math.min(...temps)) - 1;
    const maxT = Math.ceil(Math.max(...temps)) + 1;
    const rangeT = maxT - minT || 1;
    const xStep = chartW / (temps.length - 1);

    return temps.map((t, i) => {
      if (i % 3 !== 0) return null;
      const x = padding.left + i * xStep;
      const y = (padding.top + chartH - ((t - minT) / rangeT) * chartH) - 20;
      const info = getWeatherInfo(codes[i], true);
      const IconComp = WeatherIcons[info.icon] || WeatherIcons.HelpCircle;
      return (
        <div 
          key={i} 
          className="absolute transition-all duration-300 pointer-events-none" 
          style={{ 
            left: `${x}px`, 
            top: `${y}px`, 
            transform: 'translate(-50%, -50%)', 
            color: 'var(--text-primary)',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
          }}
        >
          <IconComp size={18} strokeWidth={2} />
        </div>
      );
    }).filter(Boolean);
  }, [chartData, dimensions, containerWidth]);

  if (!weatherData) return null;

  return (
    <div className="px-6 pb-4 max-md:px-4 max-md:pb-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
        📊 Next 24 Hours
      </h3>
      <div
        ref={containerRef}
        className="rounded-xl mb-2.5 relative overflow-hidden"
        style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border)',
          height: `${dimensions.h}px`
        }}
      >
        <canvas ref={canvasRef} className="block w-full" style={{ height: `${dimensions.h}px` }} />
        {icons}
      </div>
    </div>
  );
}