import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { loadServerConfig } from '@avitus/config';

async function bootstrap(): Promise<void> {
  const config = loadServerConfig();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.enableCors({ origin: config.ADMIN_ORIGIN, credentials: false });
  app.enableShutdownHooks();
  await app.listen(config.PORT, config.API_LISTEN_HOST);
  console.log(`Avitus Materia API listening on ${config.API_LISTEN_HOST}:${config.PORT}`);
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
