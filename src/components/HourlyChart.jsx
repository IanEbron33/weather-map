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
      if (new Date(hourly.time[i]) >= now) {
        startIdx = i;
        break;
      }
    }
    return {
      temps: hourly.temperature_2m.slice(startIdx, startIdx + 24),
      codes: hourly.weather_code.slice(startIdx, startIdx + 24),
      times: hourly.time.slice(startIdx, startIdx + 24),
    };
  }, [weatherData]);

  const dimensions = useMemo(() => ({
    padding: { top: 34, right: 20, bottom: 28, left: 38 },
    h: 150,
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
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
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

    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const val = minT + (rangeT / 4) * i;
      const y = getY(val);
      ctx.fillStyle = 'rgba(111, 85, 54, 0.55)';
      ctx.font = 'bold 10px var(--font-quicksand), sans-serif';
      ctx.fillText(`${Math.round(val)}°`, padding.left - 10, y + 4);
      ctx.strokeStyle = 'rgba(185, 151, 91, 0.22)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.beginPath();
    ctx.moveTo(getX(0), getY(temps[0]));
    for (let i = 1; i < temps.length; i++) {
      const xc = (getX(i - 1) + getX(i)) / 2;
      const yc = (getY(temps[i - 1]) + getY(temps[i])) / 2;
      ctx.quadraticCurveTo(getX(i - 1), getY(temps[i - 1]), xc, yc);
    }
    ctx.quadraticCurveTo(
      getX(temps.length - 2),
      getY(temps[temps.length - 2]),
      getX(temps.length - 1),
      getY(temps[temps.length - 1])
    );

    ctx.strokeStyle = '#5e3b25';
    ctx.lineWidth = 2.75;
    ctx.stroke();

    const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    grad.addColorStop(0, 'rgba(94, 59, 37, 0.16)');
    grad.addColorStop(1, 'rgba(94, 59, 37, 0)');
    ctx.lineTo(getX(temps.length - 1), padding.top + chartH);
    ctx.lineTo(getX(0), padding.top + chartH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    for (let i = 0; i < temps.length; i += 3) {
      ctx.beginPath();
      ctx.arc(getX(i), getY(temps[i]), 3.25, 0, Math.PI * 2);
      ctx.fillStyle = '#d08a55';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#fff8eb';
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(63, 42, 24, 0.78)';
    ctx.font = 'bold 10px var(--font-quicksand), sans-serif';
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
      const y = (padding.top + chartH - ((t - minT) / rangeT) * chartH) - 18;
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
          }}
        >
          <IconComp size={18} strokeWidth={2} />
        </div>
      );
    }).filter(Boolean);
  }, [chartData, dimensions, containerWidth]);

  if (!weatherData) return null;

  return (
    <div
      className="mx-6 mb-4 p-4 rounded-2xl max-md:mx-4 max-md:mb-3 max-md:p-3.5"
      style={{
        background: 'rgba(255, 249, 239, 0.96)',
        border: '1px solid #450a0a',
        boxShadow: '0 10px 28px rgba(107, 69, 40, 0.08)',
      }} 
    >
      <h2 className="text-md font-extrabold uppercase tracking-wide mb-1" style={{ color: '#3f2a18' }}>
        Next 24 Hours
      </h2>
      <div
        ref={containerRef}
        className="relative overflow-hidden"
        style={{ height: `${dimensions.h}px` }}
      >
        <canvas ref={canvasRef} className="block w-full" style={{ height: `${dimensions.h}px` }} />
        {icons}
      </div>
    </div>
  );
}
