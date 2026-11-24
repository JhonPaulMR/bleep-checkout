import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../../../generated/prisma/enums.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import type { JwtPayload } from '../../common/guards/jwt-auth.guard.js';
import { PayWithCardDto } from './dto/pay-with-card.dto.js';
import { PaymentsService } from './payments.service.js';

@ApiTags('payments')
@ApiBearerAuth()
@Controller()
export class PaymentsController {
  constructor(
    private readonly config: ConfigService,
    private readonly payments: PaymentsService,
  ) {}

  @Get('payments/config')
  @Roles(Role.OPERATOR)
  @ApiOperation({
    summary:
      'Retorna a chave pública do gateway de pagamento para o Checkout Transparente',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuração pública do gateway de pagamento',
  })
  @ApiResponse({
    status: 401,
    description: 'Sessão ausente, inválida ou expirada',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso permitido apenas para operadores de caixa',
  })
  getConfig(): { publicKey: string } {
    return {
      publicKey: this.config.getOrThrow<string>('MP_PUBLIC_KEY'),
    };
  }

  @Post('sales/:id/payments/card')
  @Roles(Role.OPERATOR)
  @ApiOperation({
    summary: 'Cobra uma venda em aberto via cartão de crédito no gateway',
  })
  @ApiResponse({
    status: 201,
    description: 'Cobrança processada pelo gateway (aprovada, recusada ou em análise)',
  })
  @ApiResponse({ status: 400, description: 'Corpo da requisição inválido' })
  @ApiResponse({
    status: 401,
    description: 'Sessão ausente, inválida ou expirada',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado para outro operador ou gerente',
  })
  @ApiResponse({ status: 404, description: 'Venda não encontrada.' })
  @ApiResponse({
    status: 422,
    description: 'A venda não está aberta para pagamento.',
  })
  payWithCard(
    @Param('id') saleId: string,
    @Body() body: PayWithCardDto,
    @Req() request: { user: JwtPayload },
  ) {
    return this.payments.payWithCard(saleId, body, request.user.sub);
  }
}
