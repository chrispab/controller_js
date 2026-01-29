import zoneInfo from '../controller/src/config/zoneInfo.js';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_API_URL: zoneInfo.apiUrl,
    NEXT_PUBLIC_WEBSOCKET_URL: zoneInfo.websocketUrl,
  },
};

export default nextConfig;