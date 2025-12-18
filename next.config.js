/** @type {import('next').NextConfig} */

// Función helper para calcular la década
function getDecade(year) {
  const decadeStart = Math.floor(year / 10) * 10;
  return `${decadeStart}s`;
}

// Generar redirecciones para URLs antiguas de estrenos (1933-2025)
function generateEsterenosRedirects() {
  const redirects = [];
  for (let year = 1933; year <= 2025; year++) {
    const period = getDecade(year);
    // Con trailing slash
    redirects.push({
      source: `/estrenos/${year}/`,
      destination: `/listados/estrenos?period=${period}&year=${year}`,
      permanent: true,
    });
    // Sin trailing slash
    redirects.push({
      source: `/estrenos/${year}`,
      destination: `/listados/estrenos?period=${period}&year=${year}`,
      permanent: true,
    });
  }
  return redirects;
}

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Cambiar a standalone para Docker
  output: 'standalone',
  
  reactStrictMode: true,
  poweredByHeader: false,
  
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
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        pathname: '/**',
      }
    ],
  },
  
  swcMinify: true,
  
  experimental: {
    workerThreads: false,
    cpus: 1,
    serverActions: {
      bodySizeLimit: '10mb',
    },
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
  
  // Redirecciones 301 para URLs antiguas
  async redirects() {
    return [
      ...generateEsterenosRedirects(),
    ];
  },
  
  // CSP actualizada para incluir Google Analytics, AdSense y YouTube
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://res.cloudinary.com https://upload-widget.cloudinary.com https://pagead2.googlesyndication.com https://adservice.google.com https://*.googlesyndication.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' blob: data: https://res.cloudinary.com https://*.cloudinary.com https://images.unsplash.com https://img.youtube.com https://i.ytimg.com https://www.googletagmanager.com https://www.google-analytics.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "connect-src 'self' https://res.cloudinary.com https://api.cloudinary.com https://*.cloudinary.com https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://www.googletagmanager.com https://region1.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://pagead2.googlesyndication.com https://*.googlesyndication.com",
              "frame-src 'self' https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com https://upload-widget.cloudinary.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://*.googlesyndication.com",
              "media-src 'self' https://res.cloudinary.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'"
            ].join('; ')
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig