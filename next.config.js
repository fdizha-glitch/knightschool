/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Suppress 'critical dependency' warning from chess.js
    config.module.exprContextCritical = false;
    return config;
  },
};

module.exports = nextConfig;
