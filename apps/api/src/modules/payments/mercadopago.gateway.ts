import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import type {
  CreateCardPaymentInput,
  CreatePixPaymentInput,
  GatewayPaymentResult,
  PaymentGateway,
} from './payment-gateway.interface.js';

type MercadoPagoPaymentResponse = Awaited<ReturnType<Payment['get']>>;

@Injectable()
export class MercadoPagoGateway implements PaymentGateway {
  private readonly paymentClient: Payment;

  constructor(config: ConfigService) {
    const accessToken = config.getOrThrow<string>('MP_ACCESS_TOKEN');
    const client = new MercadoPagoConfig({ accessToken });
    this.paymentClient = new Payment(client);
  }

  async createCardPayment(
    input: CreateCardPaymentInput,
  ): Promise<GatewayPaymentResult> {
    const response = await this.paymentClient.create({
      body: {
        transaction_amount: input.transactionAmount,
        token: input.token,
        payment_method_id: input.paymentMethodId,
        installments: input.installments,
        external_reference: input.externalReference,
        description: input.description,
        payer: {
          email: input.payerEmail,
          identification: {
            type: input.identification.type,
            number: input.identification.number,
          },
        },
      },
      requestOptions: { idempotencyKey: input.idempotencyKey },
    });

    return this.mapResponse(response);
  }

  async createPixPayment(
    input: CreatePixPaymentInput,
  ): Promise<GatewayPaymentResult> {
    const response = await this.paymentClient.create({
      body: {
        transaction_amount: input.transactionAmount,
        payment_method_id: 'pix',
        external_reference: input.externalReference,
        description: input.description,
        payer: {
          email: input.payerEmail,
        },
      },
      requestOptions: { idempotencyKey: input.idempotencyKey },
    });

    return this.mapResponse(response);
  }

  async getPayment(gatewayPaymentId: string): Promise<GatewayPaymentResult> {
    const response = await this.paymentClient.get({ id: gatewayPaymentId });
    return this.mapResponse(response);
  }

  private mapResponse(
    response: MercadoPagoPaymentResponse,
  ): GatewayPaymentResult {
    const transactionData = response.point_of_interaction?.transaction_data;
    return {
      id: String(response.id ?? ''),
      status: response.status ?? 'pending',
      transactionAmount: response.transaction_amount ?? 0,
      externalReference: response.external_reference ?? null,
      qrCode: transactionData?.qr_code ?? null,
      qrCodeBase64: transactionData?.qr_code_base64 ?? null,
    };
  }
}
