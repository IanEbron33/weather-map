import { useState, useEffect, memo } from 'react';
import SearchBar from './SearchBar';
import Favorites from './Favorites';
import WeatherCard from './WeatherCard';
import AirQuality from './AirQuality';
import HourlyChart from './HourlyChart';
import HourlyStrip from './HourlyStrip';
import ForecastList from './ForecastList';
import BestTime from './BestTime';
import Skeleton from './Skeleton';

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

const MemoSearchBar = memo(SearchBar);
const MemoFavorites = memo(Favorites);
const MemoWeatherCard = memo(WeatherCard);
const MemoBestTime = memo(BestTime);
const MemoAirQuality = memo(AirQuality);
const MemoHourlyChart = memo(HourlyChart);
const MemoHourlyStrip = memo(HourlyStrip);
const MemoForecastList = memo(ForecastList);

export default function Sidebar({
  collapsed, onToggle,
  weatherData, aqiData, currentLocation,
  tempUnit, windUnit,
  favorites, isFavorite,
  onToggleFavorite, onShareLocation,
  onSelectLocation, onRemoveFavorite,
  showToast,
  showSkeleton,
}) {
  const isMobile = useIsMobile();
  const [mountHeavySections, setMountHeavySections] = useState(() => window.innerWidth > 768);

  useEffect(() => {
    let timer;

    if (!isMobile) {
      setMountHeavySections(!collapsed);
      return;
    }

    if (collapsed) {
      setMountHeavySections(false);
      return;
    }

    timer = window.setTimeout(() => {
      setMountHeavySections(true);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [isMobile, collapsed]);

  return (
    <>
      {/* Mobile backdrop — now correctly reactive to resize */}
      {!collapsed && isMobile && (
        <div
          className="fixed inset-0 z-[1999]"
          style={{
            background: 'rgba(0,0,0,0.5)',
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={onToggle}
        />
      )}

      <aside
        className={`absolute left-0 top-0 bottom-0 h-screen flex flex-col overflow-y-auto overflow-x-hidden z-[1000]
          w-[380px] min-w-[380px]
          max-[1024px]:w-[340px] max-[1024px]:min-w-[340px]
          ${isMobile
            ? `sidebar-mobile-sheet max-md:z-[2000] ${collapsed ? 'sidebar-mobile-sheet-hidden' : ''}`
            : `transition-transform ease-[cubic-bezier(0.4,0,0.2,1)] ${collapsed ? '-translate-x-full pointer-events-none' : 'translate-x-0'}`
          }`}
        style={{
          background: 'var(--bg-secondary)',
          borderRight: (!isMobile && collapsed) ? 'none' : (!isMobile ? '1px solid var(--border)' : 'none'),
          backdropFilter: isMobile ? 'none' : 'blur(6px)',
          WebkitBackdropFilter: isMobile ? 'none' : 'blur(6px)',
          transitionDuration: isMobile ? '0ms' : '300ms',
          willChange: 'transform',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Mobile drag handle */}
        {isMobile && (
          <div className="sidebar-sheet-handle">
            <div className="sidebar-sheet-handle-bar" />
          </div>
        )}
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5 flex-shrink-0 sidebar-safe-top max-md:px-5 max-md:py-4 max-[400px]:px-4 max-[400px]:py-3.5"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/cloudly-assessts/cloudly-header1.jpg"
              alt="Cloudly"
              className="h-14 w-14 flex-shrink-0 rounded-full object-cover"
              draggable="false"
            />
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[22px] font-extrabold max-[400px]:text-[22px]" style={{ color: '#5b351f' }}>
                Cloudly
              </div>
              <div className="truncate text-[15px] font-bold max-[400px]:text-[13px]" style={{ color: '#8a6b43' }}>
                a friendly weather companion
              </div>
            </div>
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
              {isMobile ? (
                <path d="M4 7L10 13L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M13 4L7 10L13 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
          </button>
        </div>

        {showSkeleton ? (
          <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto" style={{ minHeight: 0 }}>
            {/* Search bar placeholder */}
            <Skeleton height="40px" borderRadius="10px" />
            
            {/* Favorites placeholder */}
            <div className="flex flex-col gap-2 mt-2">
              <Skeleton height="18px" width="120px" borderRadius="6px" />
              <div className="flex gap-2">
                <Skeleton height="32px" width="80px" borderRadius="16px" />
                <Skeleton height="32px" width="85px" borderRadius="16px" />
                <Skeleton height="32px" width="70px" borderRadius="16px" />
              </div>
            </div>

            {/* Weather Card placeholder */}
            <Skeleton height="180px" borderRadius="20px" className="mt-2" />

            {/* Best Time placeholder */}
            <Skeleton height="76px" borderRadius="16px" />

            {/* AQI placeholder */}
            <Skeleton height="114px" borderRadius="16px" />

            {/* Hourly charts placeholder */}
            <Skeleton height="90px" borderRadius="16px" />
          </div>
        ) : (
          <>
            <MemoSearchBar onSelectLocation={onSelectLocation} showToast={showToast} />
            <MemoFavorites favorites={favorites} onSelectLocation={onSelectLocation} onRemoveFavorite={onRemoveFavorite} />

            {mountHeavySections && weatherData ? (
              <>
                <MemoWeatherCard
                  weatherData={weatherData}
                  currentLocation={currentLocation}
                  tempUnit={tempUnit}
                  windUnit={windUnit}
                  isFavorite={isFavorite}
                  onToggleFavorite={onToggleFavorite}
                  onShareLocation={onShareLocation}
                />
                <MemoBestTime weatherData={weatherData} tempUnit={tempUnit} />
                <MemoAirQuality aqiData={aqiData} />
                <MemoHourlyChart weatherData={weatherData} tempUnit={tempUnit} />
                <MemoHourlyStrip weatherData={weatherData} tempUnit={tempUnit} />
                <MemoForecastList weatherData={weatherData} tempUnit={tempUnit} />
              </>
            ) : mountHeavySections ? (
              <div className="px-6 py-4 flex flex-col gap-4">
                <Skeleton height="180px" />
                <Skeleton height="80px" />
                <Skeleton height="140px" />
                <Skeleton height="100px" />
              </div>
            ) : null}
          </>
        )}
      </aside>
    </>
  );
}
