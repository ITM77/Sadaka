/** @type {import('next').NextConfig} */

// Адрес Go-бэкенда для сервера Next.js. Браузер ходит на /api/v1 того же
// домена, а Next проксирует запросы сюда — CORS не нужен.
const API_URL = process.env.API_URL || 'http://localhost:8080/api/v1';

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { hostname: 'localhost' },
      { hostname: 'api.sadaka.tj' },
      { hostname: 'cdn.sadaka.tj' },
    ],
    unoptimized: process.env.NODE_ENV === 'development',
  },
  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: `${API_URL}/:path*` }];
  },
};

module.exports = nextConfig;
