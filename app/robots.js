export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: 'https://weather-map-by-ianebron.vercel.app/sitemap.xml',
  };
}
