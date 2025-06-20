/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.unsplash.com'],
  },
  // Optimizaciones para Vercel
  swcMinify: true,
  // Configuración para el build
  experimental: {
    // Reducir el uso de memoria durante el build
    workerThreads: false,
    cpus: 1
  },
  // Configuración de webpack para optimizar el build
  webpack: (config, { isServer }) => {
    // Optimizaciones para reducir el tamaño del bundle
    config.optimization.minimize = true;
    
    // Resolver problema de módulos de Node.js en el cliente
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
  // Deshabilitar el source map en producción para reducir memoria
  productionBrowserSourceMaps: false,
}

module.exports = nextConfig