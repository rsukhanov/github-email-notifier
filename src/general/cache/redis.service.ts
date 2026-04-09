import { createClient } from 'redis';

export class RedisService {

  constructor(
    private client = createClient({ url: process.env.REDIS_URL })
  ) {
    this.client.on('error', (err) => console.error('❌ Redis Client Error', err));
  }

  async connect() {
    await this.client.connect();
    console.log('✅ Connected to Redis');
  }

  async disconnect() {
    await this.client.disconnect();
    console.log('🛑 Disconnected from Redis');
  }

  async set(key: string, value: string, ttlSeconds: number) {
    await this.client.setEx(key, ttlSeconds, value);
  }

  async get(key: string) {
    return await this.client.get(key);
  }
}

export const redis = new RedisService();