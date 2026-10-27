# Parecer de Conformidade — Tarefa 1

**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA1 (pré-requisito técnico): existem acessos de gerente e operador no banco para poderem entrar. O texto da tarefa pede `User` `MANAGER` e `OPERATOR` com `passwordHash` diferente da senha. | atendido | `apps/api/prisma/schema.prisma` (model `User`, enum `Role`), `apps/api/prisma/seed.ts:35-57`, `apps/api/test/seed.e2e-spec.ts:25-41` |
| Assume que: o gerente e o operador vêm de um seed com dados de teste, com `// TODO` no seed junto ao operador inicial, apontando para #11. | atendido | `apps/api/prisma/seed.ts:51` (`// TODO #11`) |
| Teste da tarefa: o e2e roda o seed e confere o papel e o hash. | atendido | `apps/api/test/seed.e2e-spec.ts` |
| CA2 a CA8 (login, guards, sessão, rede). | fora desta tarefa | não se aplicam |

## Evidência dos testes
- `npm test` passou (web: 2 testes; o teste unitário da api também passou).
- `npm run test:e2e` passou (2 arquivos, 4 testes).
- O teste e2e confere que o papel é o esperado, que o hash difere da senha e que `argon2.verify` aceita a senha. Também confere que rodar o seed duas vezes dá exatamente 2 usuários.
- A asserção não é fraca.

## Apontamentos
Nenhum.

## Observações (não são apontamentos)
- `.env.example`, `env.validation.ts` e o `package.json` trazem `JWT_SECRET` e `WEB_ORIGIN`. Esses itens só serão usados por tarefas seguintes (JWT e CORS). O plano prevê `env.validation.ts` e `.env.example` nesta tarefa, então não conta como escopo inflado.
- O `DIRECT_URL` obrigatório em `env.validation.ts` não conflita com a troca de datasource que ficou na #22.
- O modelo `User` e o enum `Role` batem com o glossário do `docs/architecture.md:160`.
