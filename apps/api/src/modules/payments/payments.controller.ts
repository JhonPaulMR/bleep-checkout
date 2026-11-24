import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../../../generated/prisma/enums.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly config: ConfigService) {}

  @Get('config')
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
}
