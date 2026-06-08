export default function sitemap() {
  return [
    {
      url: 'https://weather-map-by-ianebron.vercel.app',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
  ];
}
