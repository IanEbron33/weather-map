import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause } from 'lucide-react';
import { formatUnixShort, formatUnixFull } from '../utils/helpers';

export default function RadarControls({ radarFrames, currentFrameIndex, onSetFrameIndex }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef(null);
  const initializedRef = useRef(false); // guard so we only jump to last frame once

  useEffect(() => {
    if (radarFrames.length > 0 && !initializedRef.current) {
      initializedRef.current = true;
      onSetFrameIndex(radarFrames.length - 1);
    }
  }, [radarFrames.length, onSetFrameIndex]);

  const stopAnimation = useCallback(() => {
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startAnimation = useCallback(() => {
    setIsPlaying(true);
    intervalRef.current = setInterval(() => {
      onSetFrameIndex((prev) => (prev + 1) % radarFrames.length);
    }, 700);
  }, [radarFrames.length, onSetFrameIndex]);

  const toggleAnimation = useCallback(() => {
    if (isPlaying) stopAnimation();
    else startAnimation();
  }, [isPlaying, stopAnimation, startAnimation]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (!radarFrames.length) return null;

  const currentIdx = Math.max(0, Math.min(currentFrameIndex, radarFrames.length - 1));
  const currentFrame = radarFrames[currentIdx];
  const currentTimeLabel = formatUnixFull(currentFrame.time);

  return (
    <div
      className="radar-timeline-panel fixed z-[1000] left-4 right-4 bottom-[calc(84px+env(safe-area-inset-bottom))] md:bottom-6 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-auto md:min-w-[580px] flex flex-col md:flex-row md:items-center gap-4 px-5 py-3.5 rounded-2xl shadow-lg border transition-all duration-300"
      style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Mobile Title */}
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] md:hidden">
        Rain Radar Timeline
      </h3>

      <div className="flex items-center gap-3 flex-shrink-0">
        <button
          onClick={toggleAnimation}
          className="w-10 h-10 md:w-9 md:h-9 flex items-center justify-center rounded-full transition-all text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] active:scale-95"
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border)',
          }}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause size={16} className="fill-[var(--text-primary)] text-[var(--text-primary)]" />
          ) : (
            <Play size={16} className="fill-[var(--text-primary)] text-[var(--text-primary)]" />
          )}
        </button>

        {/* Current Active Time Pill */}
        <div 
          className="px-3.5 py-1.5 md:py-1 rounded-full text-xs font-bold text-white whitespace-nowrap shadow-sm"
          style={{
            background: 'var(--accent-primary)',
          }}
        >
          {currentTimeLabel}
        </div>
      </div>

      {/* Slider & Limits */}
      <div className="flex-grow flex items-center gap-3 min-w-[200px] md:min-w-[340px]">
        <span className="text-[10px] font-semibold text-[var(--text-muted)] flex-shrink-0">
          {formatUnixShort(radarFrames[0].time)}
        </span>
        
        <input
          type="range"
          min="0"
          max={radarFrames.length - 1}
          value={currentFrameIndex}
          onChange={(e) => onSetFrameIndex(parseInt(e.target.value, 10))}
          className="custom-radar-slider flex-grow cursor-pointer"
        />

        <span className="text-[10px] font-semibold text-[var(--text-muted)] flex-shrink-0">
          {formatUnixShort(radarFrames[radarFrames.length - 1].time)}
        </span>
      </div>
    </div>
  );
}