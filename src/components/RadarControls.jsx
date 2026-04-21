import { useState, useEffect, useRef, useCallback } from 'react';
import { formatUnixShort } from '../utils/helpers';

export default function RadarControls({ radarFrames, currentFrameIndex, onSetFrameIndex }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef(null);
  const initializedRef = useRef(false); // guard so we only jump to last frame once

  useEffect(() => {
    if (radarFrames.length > 0 && !initializedRef.current) {
      initializedRef.current = true;
      onSetFrameIndex(radarFrames.length - 1);
    }
  }, [radarFrames.length, onSetFrameIndex]); // onSetFrameIndex now included

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

  const currentTime = formatUnixShort(
    radarFrames[Math.min(currentFrameIndex, radarFrames.length - 1)].time
  );

  return (
    <div className="px-6 pb-4 max-md:px-4 max-md:pb-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
        Radar Timeline
      </h3>
      <div className="mb-2.5">
        <input
          type="range"
          min="0"
          max={radarFrames.length - 1}
          value={currentFrameIndex}
          onChange={(e) => onSetFrameIndex(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
          <span>{formatUnixShort(radarFrames[0].time)}</span>
          <span className="font-semibold" style={{ color: 'var(--accent-hover)' }}>{currentTime}</span>
          <span>{formatUnixShort(radarFrames[radarFrames.length - 1].time)}</span>
        </div>
      </div>
      <div className="flex justify-center">
        <button
          onClick={toggleAnimation}
          className="w-10 h-10 flex items-center justify-center rounded-full transition-all max-md:w-12 max-md:h-12"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent)';
            e.currentTarget.style.borderColor = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--bg-card)';
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
          title="Play/Pause"
        >
          {isPlaying ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}