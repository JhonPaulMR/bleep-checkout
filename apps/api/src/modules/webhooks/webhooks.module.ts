import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module.js';
import { WebhookSignatureValidator } from './webhook-signature.validator.js';
import { WebhooksController } from './webhooks.controller.js';
import { WebhooksService } from './webhooks.service.js';

@Module({
  imports: [PaymentsModule],
  controllers: [WebhooksController],
  providers: [WebhookSignatureValidator, WebhooksService],
})
export class WebhooksModule {}
