# Parecer de Código — Tarefa 2

**Veredito:** APROVADO

**Validações executadas:**
- Diff analisado: `git diff 9796b8843d897e5b760be60ff937a5dda16bd31e`
- Testes (`cd apps/web; npm test`): **17 arquivos, 174 testes passando** (incluindo os 3 novos de `PendingSalesService` e o novo de `CheckoutService.reopenSale`).
- Lint (`cd apps/web; npm run lint`): **0 erros / 0 avisos**.

**Conformidade com `docs/architecture.md`:**
- Camada de dados (§4): `PendingSalesService` criado em `apps/web/src/app/features/pending-sales/data/pending-sales.service.ts`, isolando `HttpClient`, URL via token `API_URL` e desembrulhamento do envelope `{ data }` (ID10).
- Dependências entre pastas (§4): nenhuma importação cruzada entre `features/pending-sales` e `features/checkout`; ambas importam apenas de `core/config/api-url`.
- Padrões Angular (§2): uso de `inject()` para `HttpClient` e `API_URL`, sem injeção por construtor.
- Testes (§2): Vitest + `HttpTestingController` testando contrato HTTP (método, URL com `encodeURIComponent`, payload e desembrulhamento de `{ data }`), sem acoplamento a detalhes internos.

## Apontamentos (bloqueiam)
Nenhum.

## Sugestões (não bloqueiam)
- **Compartilhamento de tipos de `Sale` entre `checkout` e `pending-sales`** — `apps/web/src/app/features/pending-sales/data/pending-sales.service.ts:6-67` e `apps/web/src/app/features/checkout/data/checkout.service.ts:15-78`: os 8 tipos/interfaces (`PendingSale*`) espelham integralmente os tipos `Sale*` do `CheckoutService`, e os métodos `cancelSale`/`reopenSale` chamam os mesmos endpoints. O isolamento local respeita a regra de não importar entre features (§4) e segue o padrão atual do repositório (onde `Product` e `CheckoutCustomer` também são locais no `CheckoutService`), mas caso surjam mais features consumindo `Sale` ou mudanças frequentes no contrato da venda, vale subir os tipos comuns (ex.: `Sale`, `SaleItem`, `Payment`) para `apps/web/src/app/shared/` ou `core/` para evitar divergência entre contratos.

## Observações fora do escopo deste diff
- `apps/web/src/app/features/checkout/data/checkout.service.ts` (linhas 165, 216 e 222 — pré-existentes): `getSale`, `payWithCard` e `payWithPix` interpolam `${saleId}` diretamente na URL sem `encodeURIComponent(saleId)`, diferente dos métodos mais recentes (`cancelSale`, `reopenSale`, `payWithCustomerCredit`, `payExternal`). Candidata a padronização em manutenção futura.
