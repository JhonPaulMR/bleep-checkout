# Parecer de Código — Tarefa 1

**Veredito:** APONTAMENTOS

Rodei `npm test`, `npm run lint` e `npm run test:e2e`. Os três passam: o e2e dá 4 testes verdes e o lint do web passa. Só vi o final da saída do lint, então não conferi o trecho do oxlint da API.

## Apontamentos (bloqueiam)
1. **Dependência `tsx` entra sem constar no architecture.md** — `apps/api/package.json` (devDependencies) e `apps/api/prisma.config.ts:7` (`seed: 'tsx prisma/seed.ts'`).
   Regra violada: §2 "Definição estrita: nenhuma dependência entra sem aparecer aqui. Esta seção e o `package.json` contam a mesma história". O `argon2` está listado na seção 2. O `tsx` não está em nenhuma seção.
   Prejuízo concreto: `package.json` e documento passam a divergir, e a decisão de como rodar TypeScript fora do Nest fica sem registro. Ou o `tsx` é ratificado no architecture.md (o usuário decide, via bump de versão e histórico), ou o seed troca de runner por algo já previsto.

2. **O e2e fixa `expect(total).toBe(2)` sobre a tabela inteira** — `apps/api/test/seed.e2e-spec.ts:47`
   Regra violada: "teste acoplado a detalhe de implementação, que quebra em qualquer refatoração". O ID8 do architecture.md manda e2e contra banco real, e esse banco é compartilhado.
   Prejuízo concreto: o teste não mede idempotência, mede "só existem 2 usuários no banco". Ele quebra assim que outro e2e ou um cadastro manual criar um `User`, o que a Issue #11 (cadastro de operadores) fará, e o `TODO #11` do próprio seed já prevê isso. Também quebra num banco de desenvolvimento que já tenha outros usuários. Mudar a contagem para `count({ where: { email: { in: [os dois e-mails] } } })` resolve.

## Sugestões (não bloqueiam)
- `env.validation.ts:1-6` valida 4 das 6 variáveis do ID17. Faltam `MP_ACCESS_TOKEN` e `MP_WEBHOOK_SECRET`. Se a omissão for deliberada, porque ainda não são usadas, vale um comentário dizendo que elas entram quando o módulo `payments` chegar. Sem o comentário, parece esquecimento.
- `prisma.module.ts:5,7` importa `ConfigModule` embora ele já seja `isGlobal: true`. A importação é redundante.
- `seed.ts:25,29` chama `argon2.hash` a cada execução e sobrescreve o `passwordHash` no `update`. Isso é inofensivo para um seed, mas reescreve o hash num banco que já tenha a senha trocada. Pode ser intencional, e o comentário do arquivo poderia dizer isso.
- O seed monta o `PrismaClient` com adapter por conta própria, duplicando o que o `PrismaService` faz. Isso é justificável, porque o seed roda fora do Nest, e não é apontamento. Um comentário curto no seed explicaria a duplicação.
- `seed.e2e-spec.ts:15` roda `npx prisma db seed` via `execSync`. É lento (timeout de 60 s), mas aceitável para um teste que existe justamente para exercitar o seed.

## Observações fora do escopo deste diff
- O `prisma.config.ts` ainda usa `DATABASE_URL` no `datasource`, e o ID19 manda `DIRECT_URL`. Isso é a Issue #22, já informada, e não conta como apontamento.
- O `vite-tsconfig-paths` gera um aviso de depreciação no Vitest. O Vite já resolve paths do tsconfig nativamente, então vale uma Issue de manutenção.
- O architecture.md §3 diz que `ConfigModule` e a validação ficam em `src/config/`. O diff só cria o `env.validation.ts` lá, e o `ConfigModule.forRoot` continua no `app.module.ts`. Isso é aceitável agora, mas vale revisitar quando a pasta crescer.
