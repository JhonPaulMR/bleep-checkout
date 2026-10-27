# Parecer de Código — Tarefa 1 (Rodada 2)

**Veredito:** APROVADO

Rodei na raiz `npm test`, `npm run lint` e `npm run test:e2e`. Os três passaram: web com 2 testes, oxlint e ng lint sem erro, e e2e da API com 2 arquivos e 4 testes.

O diff respeita as camadas do `architecture.md`:
- **ID8 (dados):** `PrismaService` é o único ponto de acesso ao banco na aplicação.
- **ID9 (autenticação):** o hash é gerado com argon2.
- **ID17 (segredos):** não há segredo no código. Os valores de teste vivem só no `.env.example`, e o `ConfigModule` valida as variáveis no boot.
- **Fora do ID17:** o seed lê `process.env` por conta própria porque roda fora do Nest. Isso é esperado.

O apontamento 2 da rodada 1 (aceito) foi corrigido. O teste de idempotência agora conta só os e-mails do seed, com `where: { email: { in: seedEmails } }`, e não a tabela inteira. O apontamento 1 (`tsx`, recusado) não foi reapontado.

## Apontamentos (bloqueiam)
Nenhum.

## Sugestões (não bloqueiam)
- `apps/api/src/config/env.validation.ts` não tem teste de unidade. É código de produção novo, e o §4 do `architecture.md` pede TDD. Um `env.validation.spec.ts` ao lado cobriria os casos de variável ausente e de string vazia. O plano previa só o e2e do seed para esta tarefa, então não bloqueia.
- `apps/api/src/prisma/prisma.module.ts` importa `ConfigModule`, mas o `AppModule` já o registra com `isGlobal: true`. O import é redundante. Ele só faz diferença se o `PrismaModule` for usado isolado, como no e2e, e nesse caso o `ConfigService` precisa estar disponível. Hoje funciona.
- `apps/api/prisma/seed.ts` (`upsertUser`) regrava o `passwordHash` a cada execução. Isso é coerente com um seed de dados de teste, porque a senha do `.env` sempre prevalece. Se um dia o seed rodar em ambiente com senha trocada, ele a sobrescreve. Vale uma linha de comentário sobre essa intenção.
- `apps/api/test/seed.e2e-spec.ts` chama `execSync('npx prisma db seed')` sem `cwd`. Ele depende de rodar a partir de `apps/api`, o que o script do workspace garante. Passar `cwd` explícito tornaria o teste robusto a outra forma de invocação.

## Observações fora do escopo deste diff
- O `architecture.md` ID17 lista `MP_ACCESS_TOKEN` e `MP_WEBHOOK_SECRET` como obrigatórias no boot. O `validateEnv` ainda não as exige, o que o `plan.md` justifica ("entram com a história de pagamento"). Convém registrar esse ajuste na Issue de pagamento.
- Trocar `DATABASE_URL` por `DIRECT_URL` no `prisma.config.ts` (ID19) pertence à Issue #22, como informado.
- `apps/api/.env.example` e o `architecture.md` §7 (Histórico) não mencionam as variáveis `SEED_*`. Podem ser documentadas quando o `architecture.md` for revisado.
