# Parecer de Conformidade — Tarefa 9

**Veredito:** APROVADO

Testes: `npm run test -w apps/web -- --watch=false` rodou com 7 arquivos e 24 testes, todos passando.

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA4: operador conectado em /cadastros é impedido e volta ao Caixa | atendido | `apps/web/src/app/app.routes.ts:11` (`canMatch: [roleGuard('MANAGER')]`); `apps/web/src/app/core/auth/role.guard.ts:11-17` redireciona o operador para `/caixa`; teste em `role.guard.spec.ts:35-38` |
| CA5: gerente conectado em /caixa é impedido e volta a Cadastros | atendido | `apps/web/src/app/app.routes.ts:17` (`canMatch: [roleGuard('OPERATOR')]`); `role.guard.ts` redireciona o gerente para `/cadastros`; teste em `role.guard.spec.ts:40-43` |
| Tarefa 9: sem sessão, os dois vão ao login | atendido | `role.guard.ts:14`; teste em `role.guard.spec.ts:45-48` |
| Tarefa 9: o papel certo passa | atendido | testes `role.guard.spec.ts:25-33` (gerente em Cadastros, operador no Caixa) |
| Escopo da tarefa: só os arquivos previstos e o que eles exigem | atendido | A extração de `AREA_BY_ROLE` do `login.page.ts` para o `role.guard.ts` é só reuso. Ela não muda o comportamento da tela de entrada. |

## Apontamentos
Nenhum.
