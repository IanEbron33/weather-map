/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pubfiles.pagasa.dost.gov.ph',
      },
    ],
  },
};

export default nextConfig;
