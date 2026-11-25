# Parecer de Conformidade — Tarefa 1
**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA1 (lado da API) — `POST /products` por `MANAGER` com dados válidos persiste produto com `active: true`, devolve `201` e disponibiliza na listagem do caixa (`GET /products`) | atendido | `apps/api/src/modules/products/products.controller.ts:19-38`, `apps/api/src/modules/products/products.service.ts:14-43`, `apps/api/src/modules/products/products.service.spec.ts:28-59`, `apps/api/test/products.e2e-spec.ts:50-93` |
| CA2 (lado da API) — `barcode` duplicado recusado com `409` e mensagem `"Já existe um produto com este código de barras."` sem criar produto duplicado | atendido | `apps/api/src/modules/products/products.service.ts:6-43`, `apps/api/src/modules/products/products.service.spec.ts:61-98`, `apps/api/test/products.e2e-spec.ts:95-132` |
| CA3 (lado da API) — entrada inválida (nome vazio ou apenas espaços, `barcode` ausente ou diferente de 13 dígitos numéricos, `priceCents` ausente, zero ou negativo, ou campo extra não permitido como `active`) recusada com `400` em `POST /products` | atendido | `apps/api/src/modules/products/dto/create-product.dto.ts:1-25`, `apps/api/test/products.e2e-spec.ts:134-191` |
| CA4 (lado da API) — `OPERATOR` recebe `403` em `POST /products`; `GET /products` acessível para `OPERATOR` (apenas ativos) e `MANAGER` (catálogo completo) | atendido | `apps/api/src/modules/products/products.controller.ts:19-64`, `apps/api/src/modules/products/products.service.ts:45-53`, `apps/api/src/modules/products/products.service.spec.ts:101-152`, `apps/api/test/products.e2e-spec.ts:193-255` |
| CA5 — requisição sem token ou com token inválido/adulterado ou expirado em `POST /products` ou `GET /products` recusada com `401` pelo `JwtAuthGuard` | atendido | `apps/api/src/modules/products/products.controller.ts:19-64`, `apps/api/test/products.e2e-spec.ts:257-304` |
| CA1–CA4 (lado da UI), CA6, CA7 (lado da UI), CA8, CA9 | fora desta tarefa | `specs/001-cadastrar-produto/spec.md:18-26` |

## Apontamentos

*(Sem apontamentos.)*

---
**Evidência de execução dos testes (rodada 2):**
- `npm run test -w apps/api`: 12 arquivos, 137 testes passaram (incluindo os 5 testes unitários em `apps/api/src/modules/products/products.service.spec.ts`).
- `npm run test:e2e -w apps/api -- test/products.e2e-spec.ts`: 1 arquivo, 16 testes passaram contra PostgreSQL real (5.35s), comprovando em execução os contratos HTTP `201`, `409`, `400`, `403`, `200` e `401`, a persistência/listagem no banco e os guards globais.
- Nomenclatura (`Product`, `name`, `barcode`, `priceCents`, `active`, `Role.MANAGER`, `Role.OPERATOR`) aderente ao glossário de `docs/architecture.md` §5.1 e sem escopo inflado.
