export default function manifest() {
  return {
    name: 'Cloudly Weather',
    short_name: 'Cloudly',
    description: 'Monitor real-time weather maps, track storm/typhoon forecasts, and chat with Cloudly AI.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#f7f5f0',
    icons: [
      {
        src: '/cloudly-assessts/cloudly-mark.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/cloudly-assessts/cloudly-mark.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  };
}
