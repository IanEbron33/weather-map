export const WEATHER_ICON_ASSETS = {
  Sun: '/weather-icons/sun.webp',
  Moon: '/weather-icons/night.webp',
  CloudSun: '/weather-icons/partly-cloudy.webp',
  CloudMoon: '/weather-icons/night.webp',
  Cloud: '/weather-icons/cloud.webp',
  Cloudy: '/weather-icons/cloud.webp',
  CloudFog: '/weather-icons/fog.webp',
  CloudDrizzle: '/weather-icons/rain.webp',
  CloudRain: '/weather-icons/heavy-rain.webp',
  CloudSnow: '/weather-icons/cloud.webp',
  Snowflake: '/weather-icons/cloud.webp',
  CloudLightning: '/weather-icons/thunderstorm.webp',
  Thermometer: '/weather-icons/sun.webp',
  HelpCircle: '/weather-icons/cloud.webp',
};

export function getWeatherIconAsset(iconName) {
  return WEATHER_ICON_ASSETS[iconName] || WEATHER_ICON_ASSETS.HelpCircle;
}
