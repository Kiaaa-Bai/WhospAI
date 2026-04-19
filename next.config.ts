import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow LAN access in dev so the server can be tested from phones on the
  // same Wi-Fi. Without this, Next.js 15+ blocks /_next/webpack-hmr and other
  // dev resources from non-localhost origins, which breaks hydration — the
  // UI renders but React never wires up, so clicks/inputs do nothing.
  allowedDevOrigins: ['192.168.88.62'],
};

export default nextConfig;
