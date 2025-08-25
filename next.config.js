/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      }
    ],
  },
  swcMinify: true,
  experimental: {
    workerThreads: false,
    cpus: 1
  },
  webpack: (config, { isServer }) => {
    config.optimization.minimize = true;
    
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    
    return config;
  },
  productionBrowserSourceMaps: false,
  
  // AGREGAR ESTA SECCIÓN PARA RESOLVER EL PROBLEMA DE CSP
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://res.cloudinary.com https://upload-widget.cloudinary.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' blob: data: https://res.cloudinary.com https://*.cloudinary.com https://images.unsplash.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "connect-src 'self' https://res.cloudinary.com https://api.cloudinary.com https://*.cloudinary.com",
              "frame-src 'self' https://upload-widget.cloudinary.com",
              "media-src 'self' https://res.cloudinary.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests"
            ].join('; ')
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig