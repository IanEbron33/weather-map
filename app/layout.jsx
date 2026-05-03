import '../src/index.css';

export const metadata = {
  title: 'WeatherScope — Interactive Weather Map',
  description: 'Interactive weather map with real-time data, hourly forecasts, air quality, and radar overlays. 100% free, no API key required.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}
