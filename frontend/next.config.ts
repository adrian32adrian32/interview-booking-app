import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Ignoră erorile ESLint în timpul build-ului
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Opțional: ignoră și erorile TypeScript dacă apar
    ignoreBuildErrors: true,
  },
};

export default nextConfig;