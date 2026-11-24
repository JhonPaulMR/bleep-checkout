import { Injectable, UnauthorizedException } from '@nestjs/common';
import { WebhookSignatureValidator } from './webhook-signature.validator.js';

export interface MercadoPagoWebhookInput {
  signatureHeader?: string;
  requestId?: string;
  query: Record<string, unknown>;
  body: Record<string, unknown>;
}

@Injectable()
export class WebhooksService {
  constructor(private readonly signatureValidator: WebhookSignatureValidator) {}

  handleMercadoPago(input: MercadoPagoWebhookInput): { received: true } {
    const dataId = this.extractDataId(input.query);

    const valid = this.signatureValidator.isValid({
      signatureHeader: input.signatureHeader,
      requestId: input.requestId,
      dataId,
    });
    if (!valid) {
      throw new UnauthorizedException('Assinatura do webhook inválida.');
    }

    return { received: true };
  }

  private extractDataId(query: Record<string, unknown>): string | undefined {
    const rawDataId =
      query['data.id'] ??
      (typeof query['data'] === 'object' && query['data'] !== null
        ? (query['data'] as Record<string, unknown>)['id']
        : undefined);

    return typeof rawDataId === 'string' ? rawDataId : undefined;
  }
}
