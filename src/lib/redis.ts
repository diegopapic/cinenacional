// src/lib/redis.ts
import { Redis } from 'ioredis';

const getRedisUrl = () => {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }
  // Fallback para desarrollo local
  return 'redis://redis:6379';
};

class RedisClient {
  private static instance: Redis | null = null;
  
  static getInstance(): Redis | null {
    if (!this.instance) {
      try {
        this.instance = new Redis(getRedisUrl(), {
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => {
            if (times > 3) {
              console.error('Redis connection failed after 3 retries');
              return null;
            }
            return Math.min(times * 200, 2000);
          },
          lazyConnect: true,
        });

        this.instance.on('error', (err) => {
          console.error('Redis Client Error:', err);
        });

        this.instance.on('connect', () => {
          console.log('✅ Redis connected successfully');
        });

      } catch (error) {
        console.error('Failed to create Redis client:', error);
        this.instance = null;
      }
    }
    return this.instance;
  }

  static async get(key: string): Promise<string | null> {
    const client = this.getInstance();
    if (!client) return null;
    
    try {
      return await client.get(key);
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  static async set(
    key: string, 
    value: string, 
    expirationInSeconds?: number
  ): Promise<boolean> {
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
      console.error('Redis SET error:', error);
      return false;
    }
  }

  static async del(key: string): Promise<boolean> {
    const client = this.getInstance();
    if (!client) return false;
    
    try {
      await client.del(key);
      return true;
    } catch (error) {
      console.error('Redis DEL error:', error);
      return false;
    }
  }

  static async flush(): Promise<boolean> {
    const client = this.getInstance();
    if (!client) return false;
    
    try {
      await client.flushdb();
      return true;
    } catch (error) {
      console.error('Redis FLUSH error:', error);
      return false;
    }
  }
}

export default RedisClient;