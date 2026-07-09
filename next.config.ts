import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@church-saas/types', '@church-saas/utils'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: '**.amazonaws.com' },
    ],
  },
};

export default nextConfig;
