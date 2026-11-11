import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Cabeçalhos de segurança em todas as respostas; remove o X-Powered-By.
  app.useSecurityHeaders();
  app.enableCors({ origin: app.get(ConfigService).getOrThrow<string>('WEB_ORIGIN') });

  const config = new DocumentBuilder()
    .setTitle('Bleep Checkout API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, () => SwaggerModule.createDocument(app, config));

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
