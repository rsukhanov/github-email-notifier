import { PrismaClient } from '@prisma/client';

export class PrismaService extends PrismaClient {
  async connect() {
    try {
      await this.$connect();
      console.log('✅ Successfully connected to the database');
    } catch (error) {
      console.error('❌ Error connecting to the database:', error);
      process.exit(1);
    }
  }

  async disconnect() {
    await this.$disconnect();
    console.log('🛑 Successfully disconnected from the database');
  }
}

export const prisma = new PrismaService();