import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import SplashScreen from './components/SplashScreen';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import AiSummary from './components/AiSummary';
import GeminiIcon from './components/GeminiIcon';
import PagasaBulletin from './components/PagasaBulletin';
import { fetchWeatherData, fetchAirQualityData, fetchRainViewerData, reverseGeocode } from './utils/api';
import { isMobile } from './utils/helpers';
import { X, CloudLightning } from 'lucide-react';
import FloatingMapControls from './components/FloatingMapControls';

const WeatherMap = lazy(() => import('./components/WeatherMap'));

export default function App() {
  const [theme, setThemeState] = useState(() => localStorage.getItem('ws_theme') || 'dark');
  const [tempUnit, setTempUnitState] = useState(() => localStorage.getItem('ws_temp') || 'celsius');
  const [windUnit, setWindUnitState] = useState(() => localStorage.getItem('ws_wind') || 'kmh');
  const [showSplash, setShowSplash] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [aqiData, setAqiData] = useState(null);
  const [currentLocation, setCurrentLocation] = useState({ lat: null, lon: null, city: '' });
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ws_favs') || '[]'); }
    catch { return []; }
  });
  const [radarFrames, setRadarFrames] = useState([]);
  const [currentLayerType, setCurrentLayerType] = useState('none');
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [toast, setToast] = useState(null);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [showTyphoonLayer, setShowTyphoonLayer] = useState(false);
  const [typhoonData, setTyphoonData] = useState(null);
  const [showPagasaBulletin, setShowPagasaBulletin] = useState(false);
  const mapRef = useRef(null);
  const initialFetchDone = useRef(false);

  // Store latest unit values in refs so callbacks don't go stale
  const tempUnitRef = useRef(tempUnit);
  const windUnitRef = useRef(windUnit);
  useEffect(() => { tempUnitRef.current = tempUnit; }, [tempUnit]);
  useEffect(() => { windUnitRef.current = windUnit; }, [windUnit]);

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
  }, [theme]);

  const showToast = useCallback((msg, isError = false, type = '') => {
    setToast({ msg, isError, type, id: Date.now() });
    setTimeout(() => setToast(null), 3800);
  }, []);

  const handleFetchWeather = useCallback(async (lat, lon, unit, wUnit) => {
    // Always fall back to the latest unit from refs if not explicitly passed
    const resolvedUnit = unit ?? tempUnitRef.current;
    const resolvedWUnit = wUnit ?? windUnitRef.current;
    try {
      const [weather, aqi, cityName] = await Promise.all([
        fetchWeatherData(lat, lon, resolvedUnit, resolvedWUnit),
        fetchAirQualityData(lat, lon),
        reverseGeocode(lat, lon)
      ]);
      setWeatherData(weather);
      setAqiData(aqi);
      setCurrentLocation({ lat, lon, city: cityName });
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch weather data.', true);
    }
  }, [showToast]); // no longer depends on tempUnit/windUnit — uses refs instead

  const geoLocate = useCallback(() => {
    if (!navigator.geolocation) {
      showToast('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (mapRef.current) {
          mapRef.current.setView([latitude, longitude], 10, { animate: true });
        }
        handleFetchWeather(latitude, longitude);
      },
      () => showToast('Unable to get location. Click the map instead.')
    );
  }, [handleFetchWeather, showToast]);

  useEffect(() => {
    let cancelled = false;
    // Track timeout IDs so we can cancel them on cleanup
    const timeouts = [];

    async function init() {
      try {
        const frames = await fetchRainViewerData();
        if (!cancelled) setRadarFrames(frames);
      } catch (err) {
        console.error('RainViewer load failed:', err);
      }

      timeouts.push(setTimeout(() => {
        if (!cancelled) setShowSplash(false);
      }, 1200));

      timeouts.push(setTimeout(() => {
        if (cancelled || initialFetchDone.current) return;
        initialFetchDone.current = true;

        const params = new URLSearchParams(window.location.search);
        const urlLat = parseFloat(params.get('lat'));
        const urlLon = parseFloat(params.get('lon'));

        if (!isNaN(urlLat) && !isNaN(urlLon)) {
          if (mapRef.current) {
            mapRef.current.setView([urlLat, urlLon], 10, { animate: true });
          }
          handleFetchWeather(urlLat, urlLon);
        } else {
          geoLocate();
        }
      }, 1500));
    }

    init();
    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
  }, [handleFetchWeather, geoLocate]); // deps are now stable (handleFetchWeather uses refs)

  useEffect(() => {
    localStorage.setItem('ws_favs', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    if (isMobile() && !showSplash) {
      setSidebarCollapsed(true);
    }
  }, [showSplash]);

  useEffect(() => {
    if (showTyphoonLayer && typhoonData && typhoonData.activeCyclones && typhoonData.activeCyclones.length === 0) {
      showToast('Typhoon Tracker: No active storms in the Western Pacific at this time.', false, 'info');
    }
  }, [showTyphoonLayer, typhoonData, showToast]);

  const setTheme = useCallback((t) => {
    setThemeState(t);
    localStorage.setItem('ws_theme', t);
  }, []);

  const setTempUnit = useCallback((u) => {
    setTempUnitState(u);
    tempUnitRef.current = u;
    localStorage.setItem('ws_temp', u);
    if (currentLocation.lat) {
      handleFetchWeather(currentLocation.lat, currentLocation.lon, u, windUnitRef.current);
    }
  }, [currentLocation, handleFetchWeather]);

  const setWindUnit = useCallback((u) => {
    setWindUnitState(u);
    windUnitRef.current = u;
    localStorage.setItem('ws_wind', u);
    if (currentLocation.lat) {
      handleFetchWeather(currentLocation.lat, currentLocation.lon, tempUnitRef.current, u);
    }
  }, [currentLocation, handleFetchWeather]);

  const toggleFavorite = useCallback(() => {
    if (!currentLocation.lat || !currentLocation.city) return;
    const idx = favorites.findIndex((f) => f.name === currentLocation.city);
    if (idx >= 0) {
      setFavorites((prev) => prev.filter((_, i) => i !== idx));
      showToast('Removed from favorites');
    } else {
      setFavorites((prev) => [...prev, {
        name: currentLocation.city,
        lat: currentLocation.lat,
        lon: currentLocation.lon,
      }]);
      showToast('Added to favorites!', false, 'success');
    }
  }, [currentLocation, favorites, showToast]);

  const shareLocation = useCallback(() => {
    if (!currentLocation.lat) return;
    const url = `${window.location.origin}${window.location.pathname}?lat=${currentLocation.lat.toFixed(4)}&lon=${currentLocation.lon.toFixed(4)}`;
    navigator.clipboard.writeText(url).then(
      () => showToast('Link copied to clipboard!', false, 'success'),
      () => showToast('Failed to copy link', true)
    );
  }, [currentLocation, showToast]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const handleMapClick = useCallback((lat, lon) => {
    handleFetchWeather(lat, lon);
  }, [handleFetchWeather]);

  const handleSelectLocation = useCallback((lat, lon) => {
    if (mapRef.current) {
      mapRef.current.setView([lat, lon], 10, { animate: true });
    }
    handleFetchWeather(lat, lon);
    if (isMobile()) setSidebarCollapsed(true);
  }, [handleFetchWeather]);

  const handleRemoveFavorite = useCallback((idx) => {
    setFavorites((prev) => prev.filter((_, i) => i !== idx));
    showToast('Removed from favorites');
  }, [showToast]);

  const isFavorite = favorites.some((f) => f.name === currentLocation.city);

  return (
    <>
      <SplashScreen visible={showSplash} />
      {!showSplash && (
        <div className="h-screen w-screen relative block" style={{ background: 'var(--bg-primary)' }}>
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={toggleSidebar}
            weatherData={weatherData}
            aqiData={aqiData}
            currentLocation={currentLocation}
            tempUnit={tempUnit}
            windUnit={windUnit}
            favorites={favorites}
            isFavorite={isFavorite}
            radarFrames={radarFrames}
            currentLayerType={currentLayerType}
            currentFrameIndex={currentFrameIndex}
            onSetTempUnit={setTempUnit}
            onSetWindUnit={setWindUnit}
            onToggleFavorite={toggleFavorite}
            onShareLocation={shareLocation}
            onSelectLocation={handleSelectLocation}
            onRemoveFavorite={handleRemoveFavorite}
            onSetLayerType={setCurrentLayerType}
            onSetFrameIndex={setCurrentFrameIndex}
            showTyphoonLayer={showTyphoonLayer}
            onToggleTyphoonLayer={() => setShowTyphoonLayer(p => !p)}
            showToast={showToast}
          />
          <Suspense fallback={<div className="absolute inset-0 bg-[var(--bg-primary)] flex items-center justify-center text-[var(--text-muted)]">Loading Map...</div>}>
            <WeatherMap
              mapRef={mapRef}
              theme={theme}
              currentLayerType={currentLayerType}
              radarFrames={radarFrames}
              currentFrameIndex={currentFrameIndex}
              weatherData={weatherData}
              currentLocation={currentLocation}
              tempUnit={tempUnit}
              windUnit={windUnit}
              sidebarCollapsed={sidebarCollapsed}
              onMapClick={handleMapClick}
              onGeoLocate={geoLocate}
              onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              onToggleSidebar={toggleSidebar}
              showTyphoonLayer={showTyphoonLayer}
              onTyphoonDataLoaded={setTyphoonData}
              onOpenBulletin={() => setShowPagasaBulletin(true)}
            />
          </Suspense>

          {/* Floating Map Controls - Top Right */}
          <FloatingMapControls
            currentLayerType={currentLayerType}
            onSetLayerType={setCurrentLayerType}
            showTyphoonLayer={showTyphoonLayer}
            onToggleTyphoonLayer={() => setShowTyphoonLayer(p => !p)}
            tempUnit={tempUnit}
            onSetTempUnit={setTempUnit}
            windUnit={windUnit}
            onSetWindUnit={setWindUnit}
          />

          {/* GDACS Watermark — shown only when Typhoon Tracker is active */}
          {showTyphoonLayer && (
            <div 
              className="absolute bottom-6 left-6 z-[900] pointer-events-none transition-all duration-500"
              style={{ animation: 'fadeIn 0.5s ease-out' }}
            >
              <img 
                src="/GDACS-Image.jpg" 
                alt="GDACS Source" 
                className="h-10 opacity-60 rounded-md grayscale hover:grayscale-0 hover:opacity-100 transition-all shadow-sm"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
              />
            </div>
          )}

          {/* PAGASA Bulletin Toggle Button — shown when typhoon layer is active */}
          {showTyphoonLayer && (
            <button
              id="pagasa-bulletin-btn"
              onClick={() => setShowPagasaBulletin(p => !p)}
              className="fixed z-[1002] flex items-center gap-2 px-4 py-2.5 rounded-2xl font-semibold text-sm transition-all hover:scale-105 active:scale-95"
              style={{
                bottom: '24px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: showPagasaBulletin
                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                  : 'var(--bg-card)',
                border: showPagasaBulletin
                  ? '1px solid rgba(239,68,68,0.6)'
                  : '1px solid var(--border)',
                backdropFilter: 'blur(12px)',
                color: showPagasaBulletin ? 'white' : 'var(--text-primary)',
                boxShadow: showPagasaBulletin
                  ? '0 8px 32px rgba(239,68,68,0.4)'
                  : '0 8px 32px rgba(0,0,0,0.2)',
                animation: 'fadeIn 0.4s ease-out',
                display: showPagasaBulletin ? 'none' : 'flex',
              }}
            >
              <CloudLightning size={15} />
              PAGASA Bulletin
            </button>
          )}

          {/* PAGASA Bulletin Panel */}
          <PagasaBulletin
            visible={showPagasaBulletin && showTyphoonLayer}
            onClose={() => setShowPagasaBulletin(false)}
          />

          {/* Floating AI Summary Button — fixed bottom right */}
          {weatherData && (
            <button
              onClick={() => setShowAiPanel(p => !p)}
              className={`ai-panel-btn fixed z-[1002] flex items-center gap-2 px-4 py-2.5 rounded-2xl font-semibold text-sm transition-all hover:scale-105 active:scale-95 ${showAiPanel ? 'ai-btn-active' : ''}`}
              style={{
                bottom: '148px',
                right: '24px',
                background: showAiPanel ? 'var(--accent-primary)' : 'var(--bg-card)',
                border: showAiPanel ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
                backdropFilter: 'blur(12px)',
                color: showAiPanel ? 'white' : 'var(--text-primary)',
                boxShadow: showAiPanel
                  ? '0 8px 32px rgba(99,102,241,0.5)'
                  : '0 8px 32px rgba(0,0,0,0.2)',
                transition: 'background 0.25s ease, color 0.25s ease, box-shadow 0.25s ease, transform 0.15s ease',
              }}
            >
              <GeminiIcon size={16} id="btn" />
              Gemini
            </button>
          )}

          {/* Mobile backdrop — fades in smoothly */}
          {showAiPanel && (
            <div
              className="ai-panel-backdrop fixed inset-0 z-[1003] md:hidden"
              style={{ background: 'rgba(0,0,0,0.45)' }}
              onClick={() => setShowAiPanel(false)}
            />
          )}

          {/* AI Summary Panel */}
          {showAiPanel && weatherData && (
            <div
              className="ai-panel ai-panel-enter fixed z-[1004]"
              style={{
                top: '50%',
                right: '24px',
                transform: 'translateY(-50%)',
                width: '380px',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                backdropFilter: 'blur(20px)',
                borderRadius: '20px',
                boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
              }}
            >
              {/* Mobile top bar: drag handle + close button */}
              <div className="flex items-center justify-between px-4 pt-3 pb-2 md:hidden flex-shrink-0">
                <div className="w-8" /> {/* spacer */}
                <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
                <button
                  onClick={() => setShowAiPanel(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-full transition-all hover:scale-110"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                >
                  <X size={13} />
                </button>
              </div>

              {/* Desktop close button */}
              <button
                onClick={() => setShowAiPanel(false)}
                className="hidden md:flex absolute top-3 right-3 z-10 w-7 h-7 items-center justify-center rounded-full transition-all hover:scale-110"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              >
                <X size={13} />
              </button>

              <AiSummary
                weatherData={weatherData}
                aqiData={aqiData}
                currentLocation={currentLocation}
                pagasaData={showTyphoonLayer ? typhoonData : null}
              />
            </div>
          )}


          <Toast toast={toast} />
        </div>
      )}
    </>
  );
}