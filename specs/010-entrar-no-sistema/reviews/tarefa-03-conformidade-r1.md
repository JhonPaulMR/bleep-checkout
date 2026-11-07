# Parecer de Conformidade — Tarefa 3

**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA2 (lado da API): e-mail inexistente recusado com "E-mail ou senha inválidos." | atendido | `apps/api/src/modules/auth/auth.service.ts:14-23`; `apps/api/test/auth.e2e-spec.ts:41-74` |
| CA2 (lado da API): e-mail existente com senha errada recusado com a mesma mensagem | atendido | `apps/api/src/modules/auth/auth.service.ts:14-23`; `apps/api/test/auth.e2e-spec.ts:41-74` |
| Os dois 401 têm o mesmo formato `{ statusCode, error, message, path, timestamp }` (texto da tarefa no plan.md) | atendido | `apps/api/src/common/filters/http-exception.filter.ts`; registrado via `APP_FILTER` em `apps/api/src/app.module.ts` |
| O e-mail preenchido na tela de entrada | fora desta tarefa | É lado da tela, não da API |
| CA1, CA3, CA4 a CA8 | fora desta tarefa | Não pertencem a esta tarefa |

Testes que rodei:
- `npm test`: 2 de 2 passaram.
- `npm run test:e2e`: 5 de 5 passaram.

## Apontamentos
Nenhum.

## Observações (não são apontamentos)
- **`main.ts` não foi alterado**, apesar de estar nos arquivos previstos. O filtro entra por `APP_FILTER` no `AppModule`, então vale em produção e no e2e. A tarefa continua atendida.
- **O e2e prova a mesma mensagem e o formato dos dois 401.** Ele compara as chaves do corpo, `statusCode`, `error`, `message`, `path` e `timestamp`. A asserção não é fraca.
- **O hash descartável em `auth.service.ts` não aparece na spec.** Ele serve ao mesmo fim da CA2, que é não revelar se o e-mail existe, então o tratei como parte da tarefa e não como escopo inflado. Não achei teste que o cubra, mas a spec não exige.
- **O tratamento de 500 sem vazar detalhes está no filtro e no spec do filtro.** É infraestrutura do formato de erro, não regra nova de negócio.
