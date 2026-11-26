# Parecer de Conformidade — Tarefa 2

**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA1 — Camada de serviço no frontend: `POST /customers/:id/credits` enviando `{ amountCents }` e retornando `Customer` atualizado desembrulhado de `{ data }` | atendido | `apps/web/src/app/features/customers/data/customers.service.ts:37-43`, `apps/web/src/app/features/customers/data/customers.service.spec.ts:75-97` |
| CA1 — Backend (`POST /customers/:id/credits`, `prisma.$transaction`, `TOP_UP`) e UI (modal, prévia, atualização da tabela/cards) | fora desta tarefa | — |
| CA2 — Validação de valor inválido no modal e `ValidationPipe` (`400`) | fora desta tarefa | — |
| CA3 — `RolesGuard` (`403` para operador) | fora desta tarefa | — |
| CA4 — `JwtAuthGuard` (`401` sem token/token inválido) | fora desta tarefa | — |
| CA5 — Cliente inexistente (`404`) | fora desta tarefa | — |
| CA6 — Sessão expirada ao enviar recarga (`401` + interceptor global) | fora desta tarefa | — |
| CA7 — Erro de rede/indisponibilidade no modal | fora desta tarefa | — |
| CA8 — Cancelar modal ou fechar aba sem enviar requisição | fora desta tarefa | — |

## Apontamentos
*(nenhum)*

---

**Verificações executadas:**
- Diff conferido contra `6de108af8f5444e0e979350d4d75e584e38706bb --cached`: apenas `customers.service.ts` e `customers.service.spec.ts` alterados, sem escopo inflado e com nomenclatura fiel ao glossário de `docs/architecture.md` (`Customer`, `customerId`, `amountCents`, `balanceCents`).
- Testes executados com `npm run test -w apps/web`: **PASSOU** (16 arquivos, 110 testes, incluindo `customers.service.spec.ts` com 3 testes).
