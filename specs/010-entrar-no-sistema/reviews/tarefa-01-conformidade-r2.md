# Parecer de Conformidade — Tarefa 1 (rodada 2)

**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA1 (pré-requisito técnico): existem `User` `MANAGER` e `OPERATOR` no banco, com `passwordHash` diferente da senha em texto | atendido | `apps/api/prisma/schema.prisma` (model `User`, enum `Role`), migration `20261027015348_create_user`, `apps/api/prisma/seed.ts:35-57`, `apps/api/test/seed.e2e-spec.ts:25-41` |
| Assume que: gerente e operador vêm de um seed com dados de teste, com `// TODO` no seed junto ao operador inicial apontando para #11 | atendido | `apps/api/prisma/seed.ts:51` (`// TODO #11`) |
| Teste da tarefa: o e2e roda o seed e confere papel e hash | atendido | `apps/api/test/seed.e2e-spec.ts`: confere `role`, `passwordHash !== senha` e `argon2.verify`. Também confere que um segundo seed não duplica. A asserção é forte. |
| CA2 a CA8 (login, guards, sessão, rede) | fora desta tarefa | não se aplicam |

## Evidência dos testes
- `npm test` passou (web: 2 testes).
- `npm run test:e2e` passou (2 arquivos, 4 testes).
- A correção aceita na decisão 2 da rodada 1 foi aplicada. O teste de idempotência agora conta só os e-mails do seed (`where: { email: { in: seedEmails } }`) e não a tabela `User` inteira.

## Apontamentos
Nenhum.

## Observações (não são apontamentos)
- `JWT_SECRET` e `WEB_ORIGIN` estão em `env.validation.ts` e no `.env.example`, mas só serão usados por tarefas seguintes. O plano prevê esses dois arquivos nesta tarefa, e a rodada 1 já tratou isso como não sendo escopo inflado.
- O `DIRECT_URL` obrigatório em `env.validation.ts` não conflita com a troca de datasource que ficou na Issue #22.
- O `tsx` foi recusado como apontamento na rodada 1, e a justificativa consta no plano. Não o reavaliei aqui.
