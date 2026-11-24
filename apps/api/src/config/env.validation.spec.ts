import { validateEnv } from './env.validation.js';

describe('validateEnv', () => {
  const validConfig = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    DIRECT_URL: 'postgresql://user:pass@localhost:5432/db',
    JWT_SECRET: 'test-jwt-secret',
    WEB_ORIGIN: 'http://localhost:4200',
    MP_ACCESS_TOKEN: 'TEST-access-token',
    MP_PUBLIC_KEY: 'TEST-public-key',
    MP_WEBHOOK_SECRET: 'test-webhook-secret',
  };

  it('retorna a configuração quando todas as variáveis obrigatórias estão presentes', () => {
    expect(validateEnv({ ...validConfig })).toEqual(validConfig);
  });

  it.each(['MP_ACCESS_TOKEN', 'MP_PUBLIC_KEY', 'MP_WEBHOOK_SECRET'] as const)(
    'lança erro quando %s está ausente',
    (missingVar) => {
      const config: Record<string, unknown> = { ...validConfig };
      delete config[missingVar];

      expect(() => validateEnv(config)).toThrow(missingVar);
    },
  );

  it.each(['MP_ACCESS_TOKEN', 'MP_PUBLIC_KEY', 'MP_WEBHOOK_SECRET'] as const)(
    'lança erro quando %s está vazia ou só com espaços',
    (emptyVar) => {
      expect(() =>
        validateEnv({ ...validConfig, [emptyVar]: '' }),
      ).toThrow(emptyVar);

      expect(() =>
        validateEnv({ ...validConfig, [emptyVar]: '   ' }),
      ).toThrow(emptyVar);
    },
  );

  it.each(['DATABASE_URL', 'DIRECT_URL', 'JWT_SECRET', 'WEB_ORIGIN'] as const)(
    'lança erro quando %s está ausente',
    (missingVar) => {
      const config: Record<string, unknown> = { ...validConfig };
      delete config[missingVar];

      expect(() => validateEnv(config)).toThrow(missingVar);
    },
  );
});
