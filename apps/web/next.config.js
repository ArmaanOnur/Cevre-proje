/** @type {import('next').NextConfig} */

// T8 Optimization: bundle-analyzer can be enabled via ANALYZE=true npm run build
const withBundleAnalyzer =
  process.env.ANALYZE === 'true'
    ? require('@next/bundle-analyzer')({ enabled: true })
    : (config) => config

const nextConfig = {
  // T8: Enable strict mode to surface double-render bugs in dev
  reactStrictMode: true,

  // T8: Remove X-Powered-By header (minor security hardening)
  poweredByHeader: false,

  // T8: Enable gzip/brotli compression at Next.js level
  compress: true,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
    // T8: Prefer modern formats — avif ~50% smaller than webp, webp ~30% smaller than jpeg
    formats: ['image/avif', 'image/webp'],
    // T8: Cache optimised images for 60 s minimum (CDN-friendly)
    minimumCacheTTL: 60,
  },

  // T8: Strip console.log in production builds; keep console.error/warn
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? { exclude: ['error', 'warn'] }
        : false,
  },

  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3001', 'localhost:3000'],
    },
  },
}

module.exports = withBundleAnalyzer(nextConfig)
