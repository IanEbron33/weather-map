import { useState, useEffect, useCallback, useRef } from 'react';
import SplashScreen from './components/SplashScreen';
import Sidebar from './components/Sidebar';
import WeatherMap from './components/WeatherMap';
import Toast from './components/Toast';
import { fetchWeatherData, fetchAirQualityData, fetchRainViewerData, reverseGeocode } from './utils/api';
import { isMobile } from './utils/helpers';

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
      const [weather, aqi] = await Promise.all([
        fetchWeatherData(lat, lon, resolvedUnit, resolvedWUnit),
        fetchAirQualityData(lat, lon),
      ]);
      const cityName = await reverseGeocode(lat, lon);
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
      showToast('⭐ Added to favorites!', false, 'success');
    }
  }, [currentLocation, favorites, showToast]);

  const shareLocation = useCallback(() => {
    if (!currentLocation.lat) return;
    const url = `${window.location.origin}${window.location.pathname}?lat=${currentLocation.lat.toFixed(4)}&lon=${currentLocation.lon.toFixed(4)}`;
    navigator.clipboard.writeText(url).then(
      () => showToast('📋 Link copied to clipboard!', false, 'success'),
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
            showToast={showToast}
          />
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
          />
          <Toast toast={toast} />
        </div>
      )}
    </>
  );
}