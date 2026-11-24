import { createHmac } from 'node:crypto';
import type { ConfigService } from '@nestjs/config';
import { WebhookSignatureValidator } from './webhook-signature.validator.js';

describe('WebhookSignatureValidator', () => {
  const secret = 'segredo-webhook-teste-bleep';
  const configMock = {
    getOrThrow: vi.fn((key: string) => {
      if (key === 'MP_WEBHOOK_SECRET') {
        return secret;
      }
      throw new Error(`Unexpected config key: ${key}`);
    }),
  } as unknown as ConfigService;

  const validator = new WebhookSignatureValidator(configMock);

  function sign(
    dataId: string,
    requestId: string,
    ts: string,
    signingSecret = secret,
  ): string {
    const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
    return createHmac('sha256', signingSecret).update(manifest).digest('hex');
  }

  it('aceita assinatura HMAC-SHA256 válida no formato ts=...,v1=...', () => {
    const dataId = '123456789';
    const requestId = 'req-abc-001';
    const ts = '1732470000';
    const v1 = sign(dataId, requestId, ts);

    expect(
      validator.isValid({
        signatureHeader: `ts=${ts},v1=${v1}`,
        requestId,
        dataId,
      }),
    ).toBe(true);
  });

  it('aceita espaços opcionais e ordem invertida (v1 antes de ts)', () => {
    const dataId = '987654321';
    const requestId = 'req-abc-002';
    const ts = '1732470100';
    const v1 = sign(dataId, requestId, ts);

    expect(
      validator.isValid({
        signatureHeader: `v1=${v1}, ts=${ts}`,
        requestId,
        dataId,
      }),
    ).toBe(true);
  });

  it('normaliza data.id alfanumérico para minúsculas no manifesto conforme documentação do Mercado Pago', () => {
    const dataId = 'PAY-ABC-999';
    const requestId = 'req-alpha-003';
    const ts = '1732470200';
    const v1 = sign('pay-abc-999', requestId, ts);

    expect(
      validator.isValid({
        signatureHeader: `ts=${ts},v1=${v1}`,
        requestId,
        dataId,
      }),
    ).toBe(true);
  });

  it('rejeita quando x-signature está ausente ou vazio', () => {
    expect(
      validator.isValid({
        signatureHeader: undefined,
        requestId: 'req-1',
        dataId: '123',
      }),
    ).toBe(false);

    expect(
      validator.isValid({
        signatureHeader: '   ',
        requestId: 'req-1',
        dataId: '123',
      }),
    ).toBe(false);
  });

  it('rejeita quando x-request-id está ausente ou vazio', () => {
    const ts = '1732470300';
    const v1 = sign('123', 'req-1', ts);

    expect(
      validator.isValid({
        signatureHeader: `ts=${ts},v1=${v1}`,
        requestId: undefined,
        dataId: '123',
      }),
    ).toBe(false);

    expect(
      validator.isValid({
        signatureHeader: `ts=${ts},v1=${v1}`,
        requestId: '   ',
        dataId: '123',
      }),
    ).toBe(false);
  });

  it('rejeita quando data.id está ausente ou vazio', () => {
    const ts = '1732470400';
    const v1 = sign('123', 'req-1', ts);

    expect(
      validator.isValid({
        signatureHeader: `ts=${ts},v1=${v1}`,
        requestId: 'req-1',
        dataId: undefined,
      }),
    ).toBe(false);

    expect(
      validator.isValid({
        signatureHeader: `ts=${ts},v1=${v1}`,
        requestId: 'req-1',
        dataId: '',
      }),
    ).toBe(false);
  });

  it('rejeita assinatura gerada com segredo diferente', () => {
    const dataId = '123456789';
    const requestId = 'req-wrong-secret';
    const ts = '1732470500';
    const v1 = sign(dataId, requestId, ts, 'outro-segredo');

    expect(
      validator.isValid({
        signatureHeader: `ts=${ts},v1=${v1}`,
        requestId,
        dataId,
      }),
    ).toBe(false);
  });

  it('rejeita quando o manifesto é adulterado (data.id, request-id ou ts diferente)', () => {
    const ts = '1732470600';
    const v1 = sign('123456789', 'req-original', ts);

    expect(
      validator.isValid({
        signatureHeader: `ts=${ts},v1=${v1}`,
        requestId: 'req-original',
        dataId: '999999999',
      }),
    ).toBe(false);

    expect(
      validator.isValid({
        signatureHeader: `ts=${ts},v1=${v1}`,
        requestId: 'req-adulterado',
        dataId: '123456789',
      }),
    ).toBe(false);

    expect(
      validator.isValid({
        signatureHeader: `ts=1732470601,v1=${v1}`,
        requestId: 'req-original',
        dataId: '123456789',
      }),
    ).toBe(false);
  });

  it('rejeita x-signature malformado, v1 não-hex ou com tamanho diferente sem lançar RangeError', () => {
    expect(
      validator.isValid({
        signatureHeader: 'formato-invalido',
        requestId: 'req-1',
        dataId: '123',
      }),
    ).toBe(false);

    expect(
      validator.isValid({
        signatureHeader: 'ts=1732470700',
        requestId: 'req-1',
        dataId: '123',
      }),
    ).toBe(false);

    expect(
      validator.isValid({
        signatureHeader: 'ts=1732470700,v1=abcd',
        requestId: 'req-1',
        dataId: '123',
      }),
    ).toBe(false);

    expect(
      validator.isValid({
        signatureHeader: 'ts=1732470700,v1=zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz',
        requestId: 'req-1',
        dataId: '123',
      }),
    ).toBe(false);
  });
});
