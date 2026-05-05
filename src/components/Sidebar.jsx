import { useState, useEffect } from 'react';
import SearchBar from './SearchBar';
import Favorites from './Favorites';
import WeatherCard from './WeatherCard';
import AirQuality from './AirQuality';
import HourlyChart from './HourlyChart';
import HourlyStrip from './HourlyStrip';
import ForecastList from './ForecastList';
import MapLayers from './MapLayers';
import RadarControls from './RadarControls';
import Settings from './Settings';
import BestTime from './BestTime';
import { CloudSun } from 'lucide-react';

// Hook that re-evaluates on resize instead of reading window.innerWidth once at render
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= breakpoint);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);

  return isMobile;
}

export default function Sidebar({
  collapsed, onToggle,
  weatherData, aqiData, currentLocation,
  tempUnit, windUnit,
  favorites, isFavorite,
  radarFrames, currentLayerType, currentFrameIndex,
  onSetTempUnit, onSetWindUnit,
  onToggleFavorite, onShareLocation,
  onSelectLocation, onRemoveFavorite,
  onSetLayerType, onSetFrameIndex,
  showPagasaLayer, onTogglePagasaLayer,
  showToast,
}) {
  const isMobile = useIsMobile();

  return (
    <>
      {/* Mobile backdrop — now correctly reactive to resize */}
      {!collapsed && isMobile && (
        <div
          className="fixed inset-0 z-[1999]"
          style={{
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={onToggle}
        />
      )}

      <aside
        className={`absolute left-0 top-0 bottom-0 h-screen flex flex-col overflow-y-auto overflow-x-hidden z-[1000] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
          w-[380px] min-w-[380px]
          max-[1024px]:w-[340px] max-[1024px]:min-w-[340px]
          max-md:fixed max-md:w-full max-md:min-w-full max-md:h-[100dvh] max-md:z-[2000]
          ${collapsed ? '-translate-x-full !min-w-0 !w-0' : ''}`}
        style={{
          background: 'var(--bg-secondary)',
          borderRight: collapsed ? 'none' : '1px solid var(--border)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5 flex-shrink-0 sidebar-safe-top max-md:px-5 max-md:py-4 max-[400px]:px-4 max-[400px]:py-3.5"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center text-[var(--text-primary)]"><CloudSun size={28} /></span>
            <span className="text-xl font-bold brand-gradient tracking-tight max-[400px]:text-lg">
              WeatherScope
            </span>
          </div>
          <button
            onClick={onToggle}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all max-md:w-10 max-md:h-10"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-card)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
            aria-label="Toggle sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M13 4L7 10L13 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <SearchBar onSelectLocation={onSelectLocation} showToast={showToast} />
        <Favorites favorites={favorites} onSelectLocation={onSelectLocation} onRemoveFavorite={onRemoveFavorite} />

        {weatherData && (
          <>
            <WeatherCard
              weatherData={weatherData}
              currentLocation={currentLocation}
              tempUnit={tempUnit}
              windUnit={windUnit}
              isFavorite={isFavorite}
              onToggleFavorite={onToggleFavorite}
              onShareLocation={onShareLocation}
            />
            <BestTime weatherData={weatherData} tempUnit={tempUnit} />
            <AirQuality aqiData={aqiData} />
            <HourlyChart weatherData={weatherData} tempUnit={tempUnit} />
            <HourlyStrip weatherData={weatherData} tempUnit={tempUnit} />
            <ForecastList weatherData={weatherData} tempUnit={tempUnit} />
          </>
        )}

        <MapLayers currentLayerType={currentLayerType} onSetLayerType={onSetLayerType} />

        {/* PAGASA Toggle */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex flex-col">
            <span className="font-semibold text-[15px]" style={{ color: 'var(--text-primary)' }}>PAGASA Alerts</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>PH Typhoons & Warnings</span>
          </div>
          <button
            onClick={onTogglePagasaLayer}
            className={`w-12 h-6 rounded-full relative transition-colors ${showPagasaLayer ? 'bg-red-500' : 'bg-gray-600'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${showPagasaLayer ? 'left-7' : 'left-1'}`} />
          </button>
        </div>

        {currentLayerType === 'radar' && radarFrames.length > 0 && (
          <RadarControls
            radarFrames={radarFrames}
            currentFrameIndex={currentFrameIndex}
            onSetFrameIndex={onSetFrameIndex}
          />
        )}

        <Settings tempUnit={tempUnit} windUnit={windUnit} onSetTempUnit={onSetTempUnit} onSetWindUnit={onSetWindUnit} />
      </aside>
    </>
  );
}