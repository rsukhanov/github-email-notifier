import { buildAppContainer } from './container';
import { redis } from './general/cache/redis.service';
import { prisma } from './general/db/prisma.service';
import dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  await prisma.connect();
  await redis.connect();

  const application = buildAppContainer();
  const port = process.env.PORT || 4200;

  const server = application.app.listen(port, () => {
    console.log(`🚀 Service started on http://localhost:${port}`);
  });

  const shutdown = async () => {
    console.log('\nStopping the server...');
    server.close(async () => {
      await prisma.disconnect();
      await redis.disconnect();
      console.log('Server has stopped successfully.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap();