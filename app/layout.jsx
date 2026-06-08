import '../src/index.css';

export const viewport = {
  themeColor: '#f7f5f0',
  width: 'device-width',
  initialScale: 1,
};

export const metadata = {
  metadataBase: new URL('https://weather-map-by-ianebron.vercel.app'),
  title: 'Cloudly — Interactive Weather Map & AI Assistant',
  description: 'Monitor real-time weather, rain radar overlays, and track typhoons with Cloudly. Ask our friendly AI assistant for safety recommendations.',
  keywords: ['Cloudly', 'weather map', 'rain radar', 'typhoon tracker', 'PAGASA bulletins', 'weather AI chat', 'weather assistant', 'interactive weather', 'typhoon path', 'GDACS', 'weather map web app', 'Ian Vincent Ebron', 'Ian vercel', 'Air quality', 'AQI'],
  verification: {
    google: 'lc13Z3NTf2yhb1ovRqmDsuTZmqAhQnG6bXWM9Am6c1E',
  },
  openGraph: {
    title: 'Cloudly — Interactive Weather Map & AI Assistant',
    description: 'Monitor real-time weather, rain radar overlays, and track typhoons with Cloudly. Ask our friendly AI assistant for safety recommendations.',
    url: 'https://weather-map-by-ianebron.vercel.app',
    siteName: 'Cloudly',
    images: [
      {
        url: '/cloudly-assessts/cloudly-header1.jpg',
        width: 1200,
        height: 630,
        alt: 'Cloudly Weather Map Banner',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cloudly — Interactive Weather Map & AI Assistant',
    description: 'Monitor real-time weather, rain radar overlays, and track typhoons with Cloudly. Ask our friendly AI assistant for safety recommendations.',
    images: ['/cloudly-assessts/cloudly-header1.jpg'],
  },
  icons: {
    icon: '/cloudly-assessts/cloudly-mark.png',
    shortcut: '/cloudly-assessts/cloudly-mark.png',
    apple: '/cloudly-assessts/cloudly-mark.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(reg) {
                      console.log('Cloudly ServiceWorker registered successfully:', reg.scope);
                    },
                    function(err) {
                      console.log('Cloudly ServiceWorker registration failed:', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </head>
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}
