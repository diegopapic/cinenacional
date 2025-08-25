// src/lib/redis.ts
import { Redis } from 'ioredis';

const getRedisUrl = () => {
  // Si hay una URL explícita, usarla
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }
  
  // En desarrollo local, no intentar conectar a Redis por defecto
  if (process.env.NODE_ENV === 'development') {
    return null;
  }
  
  // En producción (Docker), usar el hostname del servicio
  return 'redis://redis:6379';
};

class RedisClient {
  private static instance: Redis | null = null;
  private static isRedisEnabled: boolean = true;
  private static connectionAttempted: boolean = false;
  
  static getInstance(): Redis | null {
    // Si ya intentamos y falló, no reintentar
    if (this.connectionAttempted && !this.instance) {
      return null;
    }
    
    if (!this.instance) {
      const redisUrl = getRedisUrl();
      
      // Si no hay URL (desarrollo sin Redis), marcar como deshabilitado
      if (!redisUrl) {
        this.isRedisEnabled = false;
        this.connectionAttempted = true;
        console.log('📌 Redis deshabilitado - usando solo caché en memoria');
        return null;
      }
      
      try {
        this.connectionAttempted = true;
        this.instance = new Redis(redisUrl, {
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
          retryStrategy: (times) => {
            if (times > 1) {
              this.isRedisEnabled = false;
              console.log('⚠️ Redis no disponible - continuando con caché en memoria');
              return null;
            }
            return 500;
          },
          lazyConnect: true,
          connectTimeout: 3000,
        });

        // Solo mostrar errores una vez
        let errorShown = false;
        this.instance.on('error', (err) => {
          if (!errorShown) {
            console.log('⚠️ Redis no disponible - usando caché en memoria');
            errorShown = true;
          }
          this.isRedisEnabled = false;
        });

        this.instance.on('connect', () => {
          console.log('✅ Redis conectado exitosamente');
          this.isRedisEnabled = true;
        });

        // Intentar conectar de forma asíncrona
        this.instance.connect().catch(() => {
          this.isRedisEnabled = false;
          this.instance = null;
        });

      } catch (error) {
        this.isRedisEnabled = false;
        this.instance = null;
        console.log('⚠️ Redis no configurado - usando caché en memoria');
      }
    }
    
    return this.isRedisEnabled ? this.instance : null;
  }

  static async get(key: string): Promise<string | null> {
    if (!this.isRedisEnabled) return null;
    
    const client = this.getInstance();
    if (!client) return null;
    
    try {
      return await client.get(key);
    } catch (error) {
      return null;
    }
  }

  static async set(
    key: string, 
    value: string, 
    expirationInSeconds?: number
  ): Promise<boolean> {
    if (!this.isRedisEnabled) return false;
    
    const client = this.getInstance();
    if (!client) return false;
    
    try {
      if (expirationInSeconds) {
        await client.setex(key, expirationInSeconds, value);
      } else {
        await client.set(key, value);
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  static async del(key: string): Promise<boolean> {
    if (!this.isRedisEnabled) return false;
    
    const client = this.getInstance();
    if (!client) return false;
    
    try {
      await client.del(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  static async flush(): Promise<boolean> {
    if (!this.isRedisEnabled) return false;
    
    const client = this.getInstance();
    if (!client) return false;
    
    try {
      await client.flushdb();
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default RedisClient;