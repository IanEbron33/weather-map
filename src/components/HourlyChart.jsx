import { useEffect, useRef, useCallback } from 'react';

export default function HourlyChart({ weatherData, tempUnit }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const draw = useCallback(() => {
    if (!weatherData || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const container = containerRef.current;
    const w = container.clientWidth - 16;
    const h = 160;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const hourly = weatherData.hourly;
    const now = new Date();
    let startIdx = 0;
    for (let i = 0; i < hourly.time.length; i++) {
      if (new Date(hourly.time[i]) >= now) { startIdx = i; break; }
    }
    const temps = hourly.temperature_2m.slice(startIdx, startIdx + 24);
    const precip = hourly.precipitation_probability.slice(startIdx, startIdx + 24);
    const times = hourly.time.slice(startIdx, startIdx + 24);

    if (temps.length < 2) return;

    const padding = { top: 24, right: 12, bottom: 28, left: 36 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const minT = Math.floor(Math.min(...temps)) - 1;
    const maxT = Math.ceil(Math.max(...temps)) + 1;
    const rangeT = maxT - minT || 1;

    const xStep = chartW / (temps.length - 1);
    const getX = (i) => padding.left + i * xStep;
    const getY = (t) => padding.top + chartH - ((t - minT) / rangeT) * chartH;

    ctx.fillStyle = 'rgba(96, 165, 250, 0.15)';
    for (let i = 0; i < precip.length; i++) {
      if (precip[i] > 0) {
        const barH = (precip[i] / 100) * chartH;
        const barW = Math.max(xStep * 0.5, 4);
        ctx.fillRect(getX(i) - barW / 2, padding.top + chartH - barH, barW, barH);
      }
    }

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

    for (let i = 0; i < temps.length; i += 3) {
      ctx.beginPath();
      ctx.arc(getX(i), getY(temps[i]), 3, 0, Math.PI * 2);
      ctx.fillStyle = '#818cf8';
      ctx.fill();
    }

    ctx.fillStyle = '#5c6078';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < times.length; i += 3) {
      const d = new Date(times[i]);
      const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
      ctx.fillText(timeStr, getX(i), h - 6);
    }

    ctx.textAlign = 'right';
    const unitSym = '°';
    const ySteps = 4;
    for (let i = 0; i <= ySteps; i++) {
      const val = minT + (rangeT / ySteps) * i;
      const y = getY(val);
      ctx.fillStyle = '#5c6078';
      ctx.fillText(`${Math.round(val)}${unitSym}`, padding.left - 8, y + 4);
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
    }
  }, [weatherData, tempUnit]);

  // Redraw whenever data/unit changes
  useEffect(() => {
    draw();
  }, [draw]);

  // Also redraw whenever the container resizes (e.g. sidebar open/close)
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => draw());
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [draw]);

  if (!weatherData) return null;

  return (
    <div className="px-6 pb-4 max-md:px-4 max-md:pb-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
        📊 Next 24 Hours
      </h3>
      <div
        ref={containerRef}
        className="p-3 pb-2 rounded-lg mb-2.5"
        style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border)',
        }}
      >
        <canvas ref={canvasRef} className="block w-full" style={{ height: '160px' }} />
      </div>
    </div>
  );
}