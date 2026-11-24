import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { WebhooksService } from './webhooks.service.js';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Public()
  @Post('mercadopago')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Recebe notificações de webhook assinadas do Mercado Pago',
  })
  @ApiResponse({
    status: 200,
    description: 'Notificação autenticada e recebida com sucesso',
  })
  @ApiResponse({
    status: 401,
    description: 'Assinatura HMAC-SHA256 ausente, malformada ou inválida',
  })
  handleMercadoPago(
    @Headers('x-signature') signatureHeader: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Query() query: Record<string, unknown>,
    @Body() body: Record<string, unknown>,
  ): Promise<{ received: true }> {
    return this.webhooks.handleMercadoPago({
      signatureHeader,
      requestId,
      query,
      body,
    });
  }
}
