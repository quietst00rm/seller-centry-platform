import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Multi-tenant subdomain support
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images-na.ssl-images-amazon.com',
      },
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
      },
    ],
  },
  // Resolve workspace root warning
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
