import {
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter.js';

function criarHost(url: string) {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('HttpExceptionFilter', () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  it('formata erro HTTP com as cinco chaves', () => {
    const { host, status, json } = criarHost('/rota');

    new HttpExceptionFilter().catch(new BadRequestException('ruim'), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      statusCode: 400,
      error: 'Bad Request',
      message: 'ruim',
      path: '/rota',
      timestamp: expect.any(String),
    });
  });

  it('transforma erro não-HTTP em 500 sem vazar detalhes internos', () => {
    const { host, status, json } = criarHost('/rota');

    new HttpExceptionFilter().catch(new Error('senha do banco: 123'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    const corpo = json.mock.calls[0][0];
    expect(corpo).toEqual({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Erro interno do servidor.',
      path: '/rota',
      timestamp: expect.any(String),
    });
    expect(JSON.stringify(corpo)).not.toContain('senha do banco');
  });
});
