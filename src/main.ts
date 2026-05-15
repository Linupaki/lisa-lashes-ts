import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
  app.enableCors({
    origin: '*', // DO NOT use '*' when credentials are true. Specify your exact frontend origin layout here.
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept', // We don't even need 'Authorization' here anymore!
    credentials: true, // CRITICAL: Permits the browser to store and send the cookie automatically
  })
  bootstrap()
};
