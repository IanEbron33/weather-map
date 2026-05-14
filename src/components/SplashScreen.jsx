import { useEffect, useState } from 'react';

const CLOUDLY_VIDEO = '/cloudly-assessts/cloudly-animation.webm';
const CLOUDLY_POSTER = '/cloudly-assessts/cloudly-poster.jpg';

export default function SplashScreen({ visible }) {
  const [videoFailed, setVideoFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setReducedMotion(mediaQuery.matches);

    updateMotionPreference();
    mediaQuery.addEventListener('change', updateMotionPreference);
    return () => mediaQuery.removeEventListener('change', updateMotionPreference);
  }, []);

  if (!visible) return null;

  const showPosterOnly = reducedMotion || videoFailed;

  return (
    <div
      className="cloudly-splash fixed inset-0 z-[9999] flex items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label="Loading WeatherScope"
    >
      <div className="cloudly-splash-shell text-center">
        <div className="cloudly-splash-media" aria-hidden="true">
          {!showPosterOnly && (
            <video
              className="cloudly-splash-video"
              autoPlay
              muted
              playsInline
              loop
              preload="metadata"
              poster={CLOUDLY_POSTER}
              onError={() => setVideoFailed(true)}
            >
              <source src={CLOUDLY_VIDEO} type="video/webm" />
            </video>
          )}
          {showPosterOnly && (
            <img
              className="cloudly-splash-poster"
              src={CLOUDLY_POSTER}
              alt=""
              draggable="false"
            />
          )}
        </div>

        <h1 className="cloudly-splash-title">
          Cloudly
        </h1>

        <p className="cloudly-splash-subtitle">
          Your friendly neighborhood weather companion
        </p>

        <div className="cloudly-splash-loader" aria-hidden="true">
          <span />
        </div>
      </div>
    </div>
  );
}
