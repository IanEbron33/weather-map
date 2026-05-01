import { Star } from 'lucide-react';

export default function Favorites({ favorites, onSelectLocation, onRemoveFavorite }) {
  if (!favorites.length) return null;

  return (
    <div className="px-6 pb-3 max-md:px-4">
      <h3
        className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: 'var(--text-secondary)' }}
      >
        <Star size={14} /> Favorites
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {favorites.map((f, i) => (
          <div
            // FIX: use lat/lon as key — stable even if city names collide or list reorders
            key={`${f.lat.toFixed(4)}-${f.lon.toFixed(4)}`}
            onClick={() => onSelectLocation(f.lat, f.lon)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer whitespace-nowrap transition-all"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--accent-glow)';
              e.currentTarget.style.borderColor = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-card)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            <span>{f.name}</span>
            <span
              className="text-sm leading-none ml-0.5 cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFavorite(i);
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              ✕
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}