const REQUIRED_VARS = [
  'DATABASE_URL',
  'DIRECT_URL',
  'JWT_SECRET',
  'WEB_ORIGIN',
  'MP_ACCESS_TOKEN',
  'MP_PUBLIC_KEY',
  'MP_WEBHOOK_SECRET',
] as const;

export function validateEnv(config: Record<string, unknown>) {
  const missing = REQUIRED_VARS.filter((name) => {
    const value = config[name];
    return typeof value !== 'string' || value.trim() === '';
  });

  if (missing.length > 0) {
    throw new Error(
      `Variáveis de ambiente obrigatórias ausentes: ${missing.join(', ')}`,
    );
  }

  return config;
}
