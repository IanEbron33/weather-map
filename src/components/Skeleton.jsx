import React from 'react';

export default function Skeleton({ width, height, borderRadius = '12px', className = '' }) {
  return (
    <div
      className={`skeleton-shimmer ${className}`}
      style={{
        width: width || '100%',
        height: height || '20px',
        borderRadius,
        background: 'var(--bg-card)',
        position: 'relative',
        overflow: 'hidden',
      }}
    />
  );
}
