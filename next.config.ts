import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  turbopack: {
    root: process.cwd(),
  },
  allowedDevOrigins: ['192.168.10.2'],
};

export default nextConfig;
