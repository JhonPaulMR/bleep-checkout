import {
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { HttpExceptionFilter } from './http-exception.filter.js';

function criarHost(url: string, method = 'GET') {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url, method }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('HttpExceptionFilter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  const MSG_BRUTA =
    'Invalid `prisma.user.create()` invocation: SELECT "User"."email" FROM "User"';

  function erroPrisma(code: string, meta?: Record<string, unknown>) {
    return new Prisma.PrismaClientKnownRequestError(MSG_BRUTA, {
      code,
      clientVersion: 'test',
      meta,
    });
  }

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

  it('P2002 vira 409 Conflict com mensagem própria citando o campo', () => {
    const { host, status, json } = criarHost('/users', 'POST');

    new HttpExceptionFilter().catch(
      erroPrisma('P2002', { target: ['email'] }),
      host,
    );

    expect(status).toHaveBeenCalledWith(409);
    const corpo = json.mock.calls[0][0];
    expect(corpo).toEqual({
      statusCode: 409,
      error: 'Conflict',
      message: 'Já existe um registro com este valor de email.',
      path: '/users',
      timestamp: expect.any(String),
    });
    const texto = JSON.stringify(corpo);
    expect(texto).not.toContain('SELECT');
    expect(texto).not.toContain('"User"');
    expect(texto).not.toContain('prisma.user');
  });

  it('P2002 sem meta.target usa mensagem genérica de conflito', () => {
    const { host, json } = criarHost('/users', 'POST');

    new HttpExceptionFilter().catch(erroPrisma('P2002'), host);

    const corpo = json.mock.calls[0][0];
    expect(corpo.statusCode).toBe(409);
    expect(corpo.message).toBe('Já existe um registro com estes dados.');
    expect(JSON.stringify(corpo)).not.toContain('SELECT');
  });

  it('P2025 vira 404 Not Found com mensagem própria', () => {
    const { host, status, json } = criarHost('/users/1', 'DELETE');

    new HttpExceptionFilter().catch(erroPrisma('P2025'), host);

    expect(status).toHaveBeenCalledWith(404);
    const corpo = json.mock.calls[0][0];
    expect(corpo).toEqual({
      statusCode: 404,
      error: 'Not Found',
      message: 'Registro não encontrado.',
      path: '/users/1',
      timestamp: expect.any(String),
    });
    expect(JSON.stringify(corpo)).not.toContain('SELECT');
  });

  it('outro erro do Prisma vira 500 genérico sem vazar a mensagem', () => {
    const { host, status, json } = criarHost('/users', 'POST');

    new HttpExceptionFilter().catch(erroPrisma('P2003'), host);

    expect(status).toHaveBeenCalledWith(500);
    const corpo = json.mock.calls[0][0];
    expect(corpo.message).toBe('Erro interno do servidor.');
    const texto = JSON.stringify(corpo);
    expect(texto).not.toContain('SELECT');
    expect(texto).not.toContain('"User"');
  });

  it('erro Prisma mapeado é logado com warn incluindo o código', () => {
    const warn = vi.spyOn(Logger.prototype, 'warn');
    const { host } = criarHost('/users', 'POST');

    new HttpExceptionFilter().catch(
      erroPrisma('P2002', { target: ['email'] }),
      host,
    );

    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('POST /users');
    expect(String(warn.mock.calls[0][0])).toContain('P2002');
  });

  it('erro inesperado é logado com error com método e url', () => {
    const error = vi.spyOn(Logger.prototype, 'error');
    const { host } = criarHost('/rota', 'PUT');

    new HttpExceptionFilter().catch(new Error('x'), host);

    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0][0]).toBe('PUT /rota');
    expect(String(error.mock.calls[0][1])).toContain('Error: x');
  });
});
