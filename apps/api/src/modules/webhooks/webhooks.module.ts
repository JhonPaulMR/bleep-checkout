import { Module } from '@nestjs/common';
import { WebhookSignatureValidator } from './webhook-signature.validator.js';
import { WebhooksController } from './webhooks.controller.js';
import { WebhooksService } from './webhooks.service.js';

@Module({
  controllers: [WebhooksController],
  providers: [WebhookSignatureValidator, WebhooksService],
})
export class WebhooksModule {}
