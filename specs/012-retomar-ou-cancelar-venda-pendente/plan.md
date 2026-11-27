# Plano — Issue #12

## Decisões técnicas

- **API — Vendas (`apps/api/src/modules/sales/`):**
  - Novo DTO `ListSalesQueryDto` em `apps/api/src/modules/sales/dto/list-sales-query.dto.ts` com `status?: SaleStatus` (`@IsOptional() @IsEnum(SaleStatus)` e `@ApiPropertyOptional({ enum: SaleStatus })`).
  - Novo endpoint `GET /sales` (com query opcional `?status=PENDING`) em `SalesController` com `@Roles(Role.OPERATOR)` e Swagger (`200`, `400`, `401`, `403`), delegando para `SalesService.findAllForOperator(operatorId, status?)`, filtrando estritamente por `operatorId === requesterId` (e `status` quando informado), ordenado por `createdAt: 'desc'`, com `include: SALE_DETAILS_INCLUDE`.
  - Novo endpoint `POST /sales/:id/reopen` em `SalesController` com `@Roles(Role.OPERATOR)` e Swagger (`201`, `401`, `403`, `404`, `422`), delegando para `SalesService.reopen(id, requesterId)`:
    1. Busca a venda: se não existir → `404` (`"Venda não encontrada."`); se `sale.operatorId !== requesterId` → `403`.
    2. Se `sale.status !== SaleStatus.PENDING` ou `!canTransitionSale(sale.status, SaleStatus.OPEN)` → `422` (`"A venda não está pendente para reabertura."`).
    3. Dentro de `prisma.$transaction`:
       - Atualização condicional `tx.sale.updateMany({ where: { id: sale.id, status: SaleStatus.PENDING }, data: { status: SaleStatus.OPEN } })`; se `count === 0` → `422` (`"A venda não está pendente para reabertura."`).
       - Abandona pagamentos pendentes via `tx.payment.updateMany({ where: { saleId: sale.id, status: PaymentStatus.PENDING }, data: { status: PaymentStatus.ABANDONED } })`.
       - Retorna a venda atualizada via `tx.sale.findUniqueOrThrow({ where: { id: sale.id }, include: SALE_DETAILS_INCLUDE })`.
- **Frontend — Separação entre features (`docs/architecture.md` §4):**
  - Como uma feature não importa de outra, nasce `apps/web/src/app/features/pending-sales/` com sua própria camada de dados (`data/pending-sales.service.ts` contendo `listPendingSales()`, `cancelSale(saleId)` e `reopenSale(saleId)`) e sua página (`pages/pending-sales.page.ts/html`).
  - `CheckoutService` ganha `reopenSale(saleId: string): Observable<Sale>` (`POST /sales/:id/reopen`).
  - Navegação: nova rota `/pendentes` em `app.routes.ts` protegida por `canMatch: [roleGuard('OPERATOR')]` e novo item `{ label: 'Vendas pendentes', path: '/pendentes' }` no `MENU_BY_ROLE.OPERATOR` em `core/layout/header.ts`.
  - `CheckoutPage` lê `ActivatedRoute.snapshot.queryParamMap.get('saleId')` na inicialização: quando presente, carrega a venda via `GET /sales/:id`, restaura `sale` e `lastPayment` (o pagamento `PENDING` ou `APPROVED` mais recente), retoma polling automaticamente se `status === 'PENDING'` (exibindo o mesmo QR Code sem gerar nova cobrança) e oferece o botão **Trocar forma de pagamento** em vendas PIX pendentes (chamando `reopenSale` para voltar a `OPEN` e liberar todas as formas de pagamento).

## Tarefas

- [x] **Tarefa 1 — Implementar `GET /sales?status=PENDING` e `POST /sales/:id/reopen` na API (unit + e2e)**
  - Cobre: CA1 (lado da API — listagem de vendas `PENDING` apenas do operador autenticado com `customer`, `items` e `payments`), CA2 (lista vazia `[]`), CA5 (lado da API — `POST /sales/:id/reopen` transitando `Sale` `PENDING → OPEN` e `Payment` `PENDING → ABANDONED` em `prisma.$transaction`, mantendo proteção contra webhook PIX atrasado), CA6 (`422` `"A venda não está pendente para reabertura."` para `OPEN`/`COMPLETED`/`CANCELED`, `403` para `MANAGER`/outro `OPERATOR` e `404` venda inexistente)
  - Teste primeiro: testes unitários em `sales.service.spec.ts` (`findAllForOperator` filtrando por operador e status, e `reopen` em `PENDING`, `404`, `403`, `422` em `OPEN`/`COMPLETED`/`CANCELED` e corrida `updateMany.count === 0`) e testes e2e em `apps/api/test/sales.e2e-spec.ts` contra PostgreSQL real cobrindo `GET /sales?status=PENDING` (isolamento entre operadores, lista vazia, `403` `MANAGER`, `400` status inválido) e `POST /sales/:id/reopen` (`201`, `401`, `403`, `404`, `422` e webhook PIX atrasado após `reopen` ignorado sem concluir a venda); falham porque as rotas e métodos ainda não existem
  - Arquivos previstos: `apps/api/src/modules/sales/dto/list-sales-query.dto.ts`, `apps/api/src/modules/sales/sales.controller.ts`, `apps/api/src/modules/sales/sales.service.ts`, `apps/api/src/modules/sales/sales.service.spec.ts`, `apps/api/test/sales.e2e-spec.ts`

- [x] **Tarefa 2 — Criar `PendingSalesService` e adicionar `reopenSale()` ao `CheckoutService`**
  - Cobre: CA1 (`listPendingSales()` chamando `GET /sales?status=PENDING`), CA4 (`cancelSale()` em `PendingSalesService`), CA5 (`reopenSale()` em `PendingSalesService` e `CheckoutService` chamando `POST /sales/:id/reopen` com `encodeURIComponent`)
  - Teste primeiro: testes unitários em `pending-sales.service.spec.ts` e `checkout.service.spec.ts` validando os endpoints HTTP, `encodeURIComponent(saleId)` e desembrulho de `{ data }`; falham porque `PendingSalesService` e `CheckoutService.reopenSale` ainda não existem
  - Arquivos previstos: `apps/web/src/app/features/pending-sales/data/pending-sales.service.ts`, `apps/web/src/app/features/pending-sales/data/pending-sales.service.spec.ts`, `apps/web/src/app/features/checkout/data/checkout.service.ts`, `apps/web/src/app/features/checkout/data/checkout.service.spec.ts`

- [x] **Tarefa 3 — Criar `PendingSalesPage` (`/pendentes`), rota protegida e item "Vendas pendentes" no `Header`**
  - Cobre: CA1 (listagem com número, total, data/hora, cliente quando houver, selo pendente e botões **Retomar**, **Trocar forma** e **Cancelar** + rota `/pendentes` com `roleGuard('OPERATOR')` e link no cabeçalho), CA2 (estado vazio informando que não há vendas pendentes + atalho para `/caixa`), CA3 (ação **Retomar** navegando para `/caixa?saleId=<id>`), CA4 (cancelamento com confirmação explícita removendo a venda da lista), CA5 (ação **Trocar forma** chamando `reopenSale` e navegando para `/caixa?saleId=<id>`), CA7 (desistência da confirmação por `Voltar`/`Esc`, botões desabilitados durante envio e tratamento de erro de rede com retentativa)
  - Teste primeiro: testes em `pending-sales.page.spec.ts` e `header.spec.ts` cobrindo link **Vendas pendentes** no menu do operador, renderização da lista com e sem cliente, estado vazio, navegação de **Retomar**, confirmação/desistência de **Cancelar**, ação **Trocar forma**, carregamento e erros de rede; falham porque a página, rota e item de menu ainda não existem
  - Arquivos previstos: `apps/web/src/app/features/pending-sales/pages/pending-sales.page.ts`, `apps/web/src/app/features/pending-sales/pages/pending-sales.page.html`, `apps/web/src/app/features/pending-sales/pages/pending-sales.page.spec.ts`, `apps/web/src/app/app.routes.ts`, `apps/web/src/app/core/layout/header.ts`, `apps/web/src/app/core/layout/header.spec.ts`

- [x] **Tarefa 4 — Suportar retomada por `?saleId=` e botão "Trocar forma de pagamento" em PIX pendente na `CheckoutPage`**
  - Cobre: CA3 (carregar venda `PENDING` via `?saleId=<id>` exibindo o mesmo QR Code PIX sem gerar nova cobrança e retomando o polling), CA5 (botão **Trocar forma de pagamento** na tela PIX `PENDING` chamando `reopenSale`, encerrando polling e liberando as formas de pagamento em `OPEN`), CA7 (erro de rede ao carregar venda por `saleId` ou ao trocar forma mantendo estado e permitindo repetir, removendo `TODO #12`)
  - Teste primeiro: testes em `checkout.page.spec.ts` cobrindo inicialização com `?saleId=<id>` restaurando QR Code PIX + polling sem chamar `payWithPix`, clique em **Trocar forma de pagamento** em PIX `PENDING` chamando `reopenSale` e liberando seletores de forma em `OPEN`, desabilitação em carregamento e erro de rede; falham porque a `CheckoutPage` ainda não lê `saleId` nem possui o botão de troca de forma
  - Arquivos previstos: `apps/web/src/app/features/checkout/pages/checkout.page.ts`, `apps/web/src/app/features/checkout/pages/checkout.page.html`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts`

## Critérios sem tarefa

*(nenhum)*
