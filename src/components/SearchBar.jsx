import { useState, useEffect } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { searchCities } from '../utils/api';

export default function SearchBar({ onSelectLocation, showToast }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const debouncedQuery = useDebounce(query, 350);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await searchCities(debouncedQuery);
        if (!cancelled) {
          setResults(data);
          setShowResults(data.length > 0);
        }
      } catch {
        if (!cancelled) showToast('Search failed.');
      }
    })();

    return () => { cancelled = true; };
  }, [debouncedQuery, showToast]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('.search-container')) setShowResults(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const handleSelect = (r) => {
    setQuery(`${r.name}${r.admin1 ? ', ' + r.admin1 : ''}`);
    setShowResults(false);
    onSelectLocation(r.latitude, r.longitude);
  };

  return (
    <div className="search-container px-6 py-4 relative flex-shrink-0 max-md:px-4 max-md:py-3">
      {/* Search input */}
      <div
        className="flex items-center gap-2.5 px-3.5 rounded-xl transition-all"
        style={{
          background: 'var(--bg-input)',
          border: '1.5px solid var(--border)',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-focus)';
          e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-glow)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <svg className="flex-shrink-0" style={{ color: 'var(--text-muted)' }} width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="M20 20L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && setShowResults(false)}
          placeholder="Search city..."
          autoComplete="off"
          className="flex-1 py-3 bg-transparent border-none text-sm outline-none max-md:py-3.5 max-md:text-base"
          style={{ color: 'var(--text-primary)' }}
        />
      </div>

      {/* Results dropdown */}
      {showResults && results.length > 0 && (
        <div
          className="absolute top-full left-6 right-6 max-h-[260px] overflow-y-auto z-[100] rounded-xl max-md:left-4 max-md:right-4"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {results.map((r, i) => (
            <div
              key={`${r.latitude}-${r.longitude}-${i}`}
              onClick={() => handleSelect(r)}
              className="px-4 py-3 cursor-pointer text-sm last:border-b-0 transition-colors max-md:py-3.5 max-md:text-[15px]"
              style={{ borderBottom: '1px solid var(--border)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {r.name}{r.admin1 ? ', ' + r.admin1 : ''}
              <span className="ml-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                {r.country_code || ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
