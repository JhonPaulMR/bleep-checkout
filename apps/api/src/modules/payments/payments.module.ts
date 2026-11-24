import { Module } from '@nestjs/common';
import { MercadoPagoGateway } from './mercadopago.gateway.js';
import { PAYMENT_GATEWAY } from './payment-gateway.interface.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';

@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    {
      provide: PAYMENT_GATEWAY,
      useClass: MercadoPagoGateway,
    },
  ],
  exports: [PAYMENT_GATEWAY],
})
export class PaymentsModule {}
