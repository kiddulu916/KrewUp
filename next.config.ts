import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';
import createMDX from '@next/mdx';
import withBundleAnalyzer from '@next/bundle-analyzer';

// Enable bundle analyzer with ANALYZE=true
const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  pageExtensions: ['ts', 'tsx', 'mdx', 'md', 'js', 'jsx', 'json'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'vfjcpxaplapnuwtzvord.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // Optimize image sizes for better performance
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Use modern formats
    formats: ['image/avif', 'image/webp'],
    // Enable minimumCacheTTL for better caching
    minimumCacheTTL: 60,
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        {
          key: "Document-Policy",
          value: "js-profiling",
        },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "script-src 'self' 'sha256-OBTN3RiyCV4Bq7dFqZ5a2pAXjnCcCYeTJMO2I/LYKeo=' 'sha256-ADi78Fkqkj3Tc6ZoBk0tVaGM4xoFjyMAhKSaVM9YusI=' 'sha256-LFbjsMCPcXVYQprqfJ4LImMtkqWUjSg16VPiANQblcU=' 'sha256-GOv7QUkQI4SLji3P9tbCcpsfIUYtwH+xGi7kTO8DKkU=' 'sha256-NQNaI4l+DcatPP5WQy08+vmerm0uLXck21E5jajW+8Y=' 'sha256-lUy0HuELAwGNRm6gol0w4OjBj67B/XTRP5IrqfDi5TQ=' https://js.stripe.com https://*.stripe.com https://maps.googleapis.com https://*.ingest.sentry.io https://*.sentry.io https://*.vercel-analytics.com https://*.vercel-insights.com https://pagead2.googlesyndication.com https://www.googletagmanager.com",
            "worker-src 'self' blob:",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com https://*.stripe.com https://maps.googleapis.com https://*.gstatic.com",
            "connect-src 'self' https://*.supabase.co https://js.stripe.com https://*.stripe.com https://maps.googleapis.com https://*.googleapis.com https://*.ingest.sentry.io https://*.sentry.io https://*.vercel-analytics.com https://*.vercel-insights.com https://pagead2.googlesyndication.com https://www.googletagmanager.com",
            "frame-src 'self' https://js.stripe.com https://*.stripe.com",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'self'",
            "upgrade-insecure-requests"
          ].join("; "),
        },
        {
          key: "X-Frame-Options",
          value: "SAMEORIGIN",
        },
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=(self), payment=(self)",
        },
      ],
    }];
  },
};

const withMDX = createMDX({
  extension: /\.(md|mdx)$/,
});

export default bundleAnalyzer(withMDX(withSentryConfig(nextConfig, {
  org: "corey-tb",
  project: "krewup",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
})));
