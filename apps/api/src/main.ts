import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { loadServerConfig } from '@avitus/config';

async function bootstrap(): Promise<void> {
  const config = loadServerConfig();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.enableCors({ origin: config.ADMIN_ORIGIN, credentials: false });
  app.enableShutdownHooks();
  await app.listen(config.PORT, '0.0.0.0');
  console.log(`Avitus Materia API listening on :${config.PORT}`);
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
