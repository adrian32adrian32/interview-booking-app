/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/admin/stats',
        destination: '/admin/statistics',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;