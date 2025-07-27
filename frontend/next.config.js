/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  generateBuildId: async () => {
    // Generează un ID unic pentru fiecare build pentru a evita cache-ul
    return Date.now().toString();
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