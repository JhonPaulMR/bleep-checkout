# Plano — Issue #7

## Decisões técnicas

- **API — Vendas (`apps/api/src/modules/sales/`):**
  - `CreateSaleDto` ganha campo opcional `customerId?: string` (`@IsOptional() @IsString() @IsNotEmpty()` com `@ApiPropertyOptional()`).
  - `SalesService.create`: se `dto.customerId` for informado, valida `prisma.customer.findUnique({ where: { id: dto.customerId } })`; se não existir, lança `UnprocessableEntityException('Cliente não encontrado.')` (`422`). Persiste `customerId` em `Sale` e inclui `customer: true` no `include` de `create` e `findByIdForOperator`.
- **API — Pagamentos (`apps/api/src/modules/payments/`):**
  - Novo endpoint `POST /sales/:id/payments/credit` em `PaymentsController` com `@Roles(Role.OPERATOR)` e documentação Swagger (`201`, `401`, `403`, `404`, `422`).
  - Novo método `PaymentsService.payWithCustomerCredit(saleId: string, operatorId: string)`:
    1. Busca a venda com `customer`: se não existir → `NotFoundException('Venda não encontrada.')` (`404`); se `sale.operatorId !== operatorId` → `ForbiddenException` (`403`).
    2. Valida `sale.status === SaleStatus.OPEN` (e `sale.totalCents > 0`), senão → `UnprocessableEntityException('Venda não está aberta para pagamento.')` (`422`).
    3. Valida `sale.customerId`, senão → `UnprocessableEntityException('Selecione um cliente para pagar com crédito.')` (`422`, RN04).
    4. Dentro de `prisma.$transaction`:
       - Executa débito atômico condicional `tx.customer.updateMany({ where: { id: sale.customerId, balanceCents: { gte: sale.totalCents } }, data: { balanceCents: { decrement: sale.totalCents } } })`. Se `count === 0` → lança `UnprocessableEntityException('Saldo insuficiente.')` (`422`, RN03/RN09, sem alterar saldo!).
       - Atualiza a venda com `tx.sale.updateMany({ where: { id: sale.id, status: SaleStatus.OPEN }, data: { status: SaleStatus.COMPLETED, completedAt: new Date() } })` (se `count === 0` → `UnprocessableEntityException`, abortando a transação e revertendo o débito).
       - Cria `Payment` (`method: PaymentMethod.CUSTOMER_CREDIT`, `status: PaymentStatus.APPROVED`, `amountCents: sale.totalCents`).
       - Cria `CreditTransaction` (`customerId: sale.customerId`, `saleId: sale.id`, `type: CreditType.SALE_DEBIT`, `amountCents: sale.totalCents`).
       - Busca o cliente atualizado e a venda atualizada (com `items`, `payments`, `customer`) e retorna `{ sale, payment, customerBalanceCents }`.
- **Frontend (`apps/web/src/app/features/checkout/`):**
  - `CheckoutService`: adiciona interface `CheckoutCustomer` (`id`, `name`, `cpf`, `balanceCents`), `customer?: CheckoutCustomer | null` em `Sale`, `listCustomers(): Observable<CheckoutCustomer[]>`, `customerId?: string` opcional em `createSale(items, customerId?)` e `payWithCustomerCredit(saleId: string)`.
  - `CheckoutPage`:
    - Card **Cliente da Venda `[F3]`** na coluna direita (removendo `TODO #7`) + modal de identificação de cliente (`GET /customers` com filtro por nome/CPF, atalho `F3`, `Esc`/cancelar sem alterar).
    - Opção **Crédito do cliente** na tela de pagamento (`CUSTOMER_CREDIT`, fiel a `pagamento.html`): aviso sem cliente (`"Selecione um cliente para pagar com crédito."`), bloqueio visual quando `balanceCents < totalCents` (`"Saldo insuficiente — o saldo não será alterado"`), prévia de `Saldo atual` e `Saldo restante` quando suficiente, e botão `Debitar R$ ... do crédito` concluindo a venda em `COMPLETED`, além de tratamento de `401` (via `authInterceptor`) e falha de rede.

## Tarefas

- [x] **Tarefa 1 — Suportar `customerId` opcional em `POST /sales` e implementar `POST /sales/:id/payments/credit` na API (unit + e2e)**
  - Cobre: CA1 (lado da API + transação atômica), CA2 (lado da API — `422` saldo insuficiente sem alterar saldo), CA3 (lado da API — `422` sem cliente), CA4 (lado da API — venda não `OPEN`), CA5 (lado da API — `customerId` em `POST /sales`), CA6 (`401`/`403`/`404`)
  - Teste primeiro: testes unitários em `sales.service.spec.ts` e `payments.service.spec.ts` (`payWithCustomerCredit` debitando via `updateMany` condicional, gravando `Payment(CUSTOMER_CREDIT, APPROVED)` + `CreditTransaction(SALE_DEBIT)` + `Sale(COMPLETED)`; `422` quando `count === 0` por saldo insuficiente, sem cliente ou venda não `OPEN`; `403` outro operador; `404` venda inexistente) e testes e2e em `apps/api/test/sales.e2e-spec.ts` e `apps/api/test/payments.e2e-spec.ts` contra PostgreSQL real; falham porque DTO e endpoint ainda não existem
  - Arquivos previstos: `apps/api/src/modules/sales/dto/create-sale.dto.ts`, `apps/api/src/modules/sales/sales.service.ts`, `apps/api/src/modules/sales/sales.service.spec.ts`, `apps/api/src/modules/payments/payments.controller.ts`, `apps/api/src/modules/payments/payments.service.ts`, `apps/api/src/modules/payments/payments.service.spec.ts`, `apps/api/test/sales.e2e-spec.ts`, `apps/api/test/payments.e2e-spec.ts`

- [x] **Tarefa 2 — Adicionar `listCustomers()`, `customerId?` em `createSale()` e `payWithCustomerCredit()` em `CheckoutService`**
  - Cobre: CA1 (serviço de débito), CA5 (serviço de listagem de clientes e envio de `customerId`)
  - Teste primeiro: testes unitários em `checkout.service.spec.ts` verificando `listCustomers()` (`GET /customers`), `createSale(items, customerId)` enviando `customerId` quando informado e omitindo quando ausente, e `payWithCustomerCredit(saleId)` (`POST /sales/:id/payments/credit`) desembrulhando `{ data }`; falham porque os métodos ainda não existem
  - Arquivos previstos: `apps/web/src/app/features/checkout/data/checkout.service.ts`, `apps/web/src/app/features/checkout/data/checkout.service.spec.ts`

- [ ] **Tarefa 3 — Implementar card "Cliente da Venda [F3]" e modal de identificação de cliente na `CheckoutPage`**
  - Cobre: CA5 (identificação de cliente no caixa + envio de `customerId` em `POST /sales`), CA7 (erro de rede e `401` ao carregar clientes), CA8 (fechar modal / `Esc` sem selecionar)
  - Teste primeiro: testes em `checkout.page.spec.ts` cobrindo abertura do modal por botão e por `F3`, filtro por nome/CPF, seleção exibindo nome/CPF/saldo verde no card lateral e enviando `customerId` em `createSale`, troca e remoção de cliente, fechamento por `Esc`/Cancelar sem alterar estado, e erro de rede ao listar clientes; falham porque o card e o modal ainda não existem
  - Arquivos previstos: `apps/web/src/app/features/checkout/pages/checkout.page.ts`, `apps/web/src/app/features/checkout/pages/checkout.page.html`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts`

- [ ] **Tarefa 4 — Implementar pagamento por "Crédito do cliente" na `CheckoutPage` (saldo suficiente, insuficiente, sem cliente, `401` e rede)**
  - Cobre: CA1 (interface de débito e conclusão), CA2 (bloqueio visual em saldo insuficiente), CA3 (aviso sem cliente identificado), CA4 (venda vazia bloqueada), CA7 (`401` via `authInterceptor` e falha de rede ao debitar), CA8 (trocar forma de pagamento sem debitar)
  - Teste primeiro: testes em `checkout.page.spec.ts` cobrindo seleção da aba `Crédito do cliente` sem cliente (`"Selecione um cliente para pagar com crédito."`), com saldo insuficiente (`"Saldo insuficiente — o saldo não será alterado"` e botão desabilitado), com saldo suficiente exibindo saldo atual/restante e debitando via `payWithCustomerCredit` concluindo a venda em `COMPLETED`, troca de método sem debitar, erro de rede mantendo `OPEN` e teste integrado `401` com `authInterceptor`; falham porque a opção `CUSTOMER_CREDIT` ainda não existe
  - Arquivos previstos: `apps/web/src/app/features/checkout/pages/checkout.page.ts`, `apps/web/src/app/features/checkout/pages/checkout.page.html`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts`

## Critérios sem tarefa
