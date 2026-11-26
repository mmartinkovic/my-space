import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@projectu/core-i18n', '@projectu/core-schemas'],
};

export default nextConfig;
