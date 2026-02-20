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
      // =============================================
      // Redirecciones de estrenos (1933-2025)
      // =============================================
      ...generateEsterenosRedirects(),
      
      // =============================================
      // index.php a home
      // =============================================
      {
        source: '/index.php',
        destination: '/',
        permanent: true,
      },
      
      // =============================================
      // /personas/ (plural) a /persona/ (singular)
      // =============================================
      {
        source: '/personas/:slug/',
        destination: '/persona/:slug',
        permanent: true,
      },
      {
        source: '/personas/:slug',
        destination: '/persona/:slug',
        permanent: true,
      },
      
      // =============================================
      // Eliminar sufijos de URLs de personas
      // /persona/[slug]/[cualquier-cosa] → /persona/[slug]
      // =============================================
      {
        source: '/persona/:slug/:rest+/',
        destination: '/persona/:slug',
        permanent: true,
      },
      {
        source: '/persona/:slug/:rest+',
        destination: '/persona/:slug',
        permanent: true,
      },
      
      // =============================================
      // Eliminar sufijos de URLs de películas
      // /pelicula/[slug]/[cualquier-cosa] → /pelicula/[slug]
      // =============================================
      {
        source: '/pelicula/:slug/:rest+/',
        destination: '/pelicula/:slug',
        permanent: true,
      },
      {
        source: '/pelicula/:slug/:rest+',
        destination: '/pelicula/:slug',
        permanent: true,
      },
      
      // =============================================
      // Obituarios: /obituarios/[año] → /listados/obituarios?year=[año]
      // =============================================
      {
        source: '/obituarios/:year(\\d{4})/',
        destination: '/listados/obituarios?year=:year',
        permanent: true,
      },
      {
        source: '/obituarios/:year(\\d{4})',
        destination: '/listados/obituarios?year=:year',
        permanent: true,
      },
    ];
  },
  
  // Security headers se manejan en middleware.ts para evitar duplicación
}

module.exports = nextConfig