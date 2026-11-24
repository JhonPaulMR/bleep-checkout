import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const HEX_PATTERN = /^[0-9a-f]+$/i;

export interface WebhookSignatureInput {
  signatureHeader?: string;
  requestId?: string;
  dataId?: string;
}

@Injectable()
export class WebhookSignatureValidator {
  constructor(private readonly config: ConfigService) {}

  isValid(input: WebhookSignatureInput): boolean {
    if (
      typeof input.signatureHeader !== 'string' ||
      input.signatureHeader.trim().length === 0 ||
      typeof input.requestId !== 'string' ||
      input.requestId.trim().length === 0 ||
      typeof input.dataId !== 'string' ||
      input.dataId.trim().length === 0
    ) {
      return false;
    }

    const parsed = this.parseSignatureHeader(input.signatureHeader);
    if (!parsed) {
      return false;
    }

    const { ts, v1 } = parsed;
    if (!HEX_PATTERN.test(v1) || v1.length % 2 !== 0) {
      return false;
    }

    const secret = this.config.getOrThrow<string>('MP_WEBHOOK_SECRET');
    const manifest = `id:${input.dataId.toLowerCase()};request-id:${input.requestId};ts:${ts};`;
    const expectedHex = createHmac('sha256', secret)
      .update(manifest)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedHex, 'hex');
    const receivedBuffer = Buffer.from(v1, 'hex');
    if (receivedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(receivedBuffer, expectedBuffer);
  }

  private parseSignatureHeader(
    header: string,
  ): { ts: string; v1: string } | null {
    let ts: string | undefined;
    let v1: string | undefined;

    for (const part of header.split(',')) {
      const separatorIndex = part.indexOf('=');
      if (separatorIndex === -1) {
        return null;
      }

      const key = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();
      if (!key || !value) {
        return null;
      }

      if (key === 'ts') {
        ts = value;
      } else if (key === 'v1') {
        v1 = value;
      }
    }

    if (!ts || !v1) {
      return null;
    }

    return { ts, v1 };
  }
}
