# Plano — Issue #6

## Decisões técnicas

- **API — Pagamentos (`apps/api/src/modules/payments/`):**
  - Novo DTO `PayExternalDto` em `apps/api/src/modules/payments/dto/pay-external.dto.ts`:
    - `method`: `@IsIn([PaymentMethod.EXTERNAL_CREDIT, PaymentMethod.EXTERNAL_DEBIT])` com `@ApiProperty({ enum: [PaymentMethod.EXTERNAL_CREDIT, PaymentMethod.EXTERNAL_DEBIT] })`.
    - `approved`: `@IsBoolean()` com `@ApiProperty({ type: Boolean })`.
    - Com o `ValidationPipe` global (`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`), payload sem `approved` booleano ou com `method` fora de `EXTERNAL_CREDIT` | `EXTERNAL_DEBIT` é rejeitado com `400` sem criar `Payment` nem alterar `Sale`.
  - Novo endpoint `POST /sales/:id/payments/external` em `PaymentsController` com `@Roles(Role.OPERATOR)` e documentação Swagger (`201`, `400`, `401`, `403`, `404`, `422`).
  - Novo método `PaymentsService.payExternal(saleId: string, dto: PayExternalDto, operatorId: string)`:
    1. Reutiliza `findOpenOwnedSale(saleId, operatorId)`: responde `404` (`"Venda não encontrada."`) se a venda não existir, `403` se `sale.operatorId !== operatorId`, e `422` (`"A venda não está aberta para pagamento."`) se `sale.status !== SaleStatus.OPEN`.
    2. Dentro de `prisma.$transaction`:
       - Quando `dto.approved === true`:
         - Atualiza a venda condicionalmente via `tx.sale.updateMany({ where: { id: sale.id, status: SaleStatus.OPEN }, data: { status: SaleStatus.COMPLETED, completedAt: new Date() } })`. Se `count === 0`, lança `UnprocessableEntityException('A venda não está aberta para pagamento.')` (`422`), protegendo contra duplo clique ou corrida.
         - Cria `Payment` com `{ saleId: sale.id, method: dto.method, status: PaymentStatus.APPROVED, amountCents: sale.totalCents }`.
         - Busca a venda atualizada (com `items: { include: { product: true } }`, `payments: true`, `customer: true`) e retorna `{ payment, sale: updatedSale }`.
       - Quando `dto.approved === false`:
         - Confirma que a venda permanece `OPEN` dentro da transação (`tx.sale.findFirst({ where: { id: sale.id, status: SaleStatus.OPEN }, include: { items: { include: { product: true } }, payments: true, customer: true } })`); se não estiver mais `OPEN`, lança `UnprocessableEntityException('A venda não está aberta para pagamento.')` (`422`).
         - Cria `Payment` com `{ saleId: sale.id, method: dto.method, status: PaymentStatus.DECLINED, amountCents: sale.totalCents }`.
         - Mantém a `Sale` em `OPEN` com `completedAt: null` e retorna `{ payment, sale }` (incluindo o novo pagamento em `payments`).
- **Frontend (`apps/web/src/app/features/checkout/`):**
  - `CheckoutService`:
    - Adiciona tipo `ExternalPaymentMethod = 'EXTERNAL_CREDIT' | 'EXTERNAL_DEBIT'` e interface `PayExternalPayload { method: ExternalPaymentMethod; approved: boolean }`.
    - Adiciona método `payExternal(saleId: string, payload: PayExternalPayload): Observable<PaymentResponse>` chamando `POST ${this.apiUrl}/sales/${encodeURIComponent(saleId)}/payments/external` e desembrulhando `{ data }`.
  - `CheckoutPage`:
    - Amplia `CheckoutPaymentMethod` para `'CARD' | 'PIX' | 'CUSTOMER_CREDIT' | 'EXTERNAL_CREDIT' | 'EXTERNAL_DEBIT'`.
    - Adiciona botões de seleção **Crédito externo** (`EXTERNAL_CREDIT`) e **Débito externo** (`EXTERNAL_DEBIT`) na tela de pagamento quando `sale.status === 'OPEN'`.
    - Exibe painel de confirmação manual para pagamento externo sem aprovar automaticamente, com dois botões explícitos: **Aprovado na máquina** (`approved: true`) e **Não aprovado na máquina** (`approved: false`), ambos desabilitados em estado de carregamento enquanto `submittingPayment()` for `true`.
    - Em caso de aprovação (`approved: true`), exibe a tela de venda concluída indicando explicitamente a forma registrada (*Crédito externo* ou *Débito externo*).
    - Em caso de não aprovação (`approved: false`), mantém a venda em `OPEN`, exibe mensagem clara informando que o pagamento externo não foi aprovado (sem exibir o botão específico de retentativa de cartão de gateway) e permite tentar novamente ou trocar de forma de pagamento.
    - Em caso de falha de rede ou erro `422`, exibe mensagem clara e reabilita os botões para nova tentativa; trocar de forma de pagamento ou sair sem clicar nunca envia aprovação ao servidor.

## Tarefas

- [x] **Tarefa 1 — Implementar `POST /sales/:id/payments/external` com `PayExternalDto` e transação atômica na API (unit + e2e)**
  - Cobre: CA1 (lado da API — `Payment` `APPROVED` + `Sale` `COMPLETED` com `completedAt` em transação atômica), CA2 (lado da API — `Payment` `DECLINED` mantendo `Sale` `OPEN` e `completedAt` nulo), CA3 (lado da API — `400` para payload inválido sem criar `Payment` nem alterar `Sale`), CA4 (`403` para `MANAGER` ou outro `OPERATOR` e `404` para venda inexistente), CA5 (lado da API — `422` `"A venda não está aberta para pagamento."` para venda fora de `OPEN` e proteção contra duplo clique)
  - Teste primeiro: testes unitários em `payments.service.spec.ts` e testes e2e em `apps/api/test/payments.e2e-spec.ts` contra PostgreSQL real cobrindo `EXTERNAL_CREDIT` e `EXTERNAL_DEBIT` com `approved: true` e `approved: false`, `400` para `method` inválido ou `approved` ausente/não booleano, `403` (`MANAGER` e outro `OPERATOR`), `404` venda inexistente e `422` venda já `COMPLETED`/`PENDING`/`CANCELED`; falham porque o DTO, o método de serviço e a rota ainda não existem
  - Arquivos previstos: `apps/api/src/modules/payments/dto/pay-external.dto.ts`, `apps/api/src/modules/payments/payments.controller.ts`, `apps/api/src/modules/payments/payments.service.ts`, `apps/api/src/modules/payments/payments.service.spec.ts`, `apps/api/test/payments.e2e-spec.ts`

- [ ] **Tarefa 2 — Adicionar `payExternal()` ao `CheckoutService`**
  - Cobre: CA1 (chamada de aprovação externa), CA2 (chamada de não aprovação externa), CA3 (envio estrito do payload `{ method, approved }` somente mediante invocação explícita)
  - Teste primeiro: testes unitários em `checkout.service.spec.ts` verificando `payExternal(saleId, { method: 'EXTERNAL_CREDIT', approved: true })` e `payExternal(saleId, { method: 'EXTERNAL_DEBIT', approved: false })` enviando `POST /sales/:id/payments/external` com `{ method, approved }` e desembrulhando `{ data }`; falham porque `payExternal` ainda não existe
  - Arquivos previstos: `apps/web/src/app/features/checkout/data/checkout.service.ts`, `apps/web/src/app/features/checkout/data/checkout.service.spec.ts`

- [ ] **Tarefa 3 — Implementar seleção e confirmação de Crédito externo e Débito externo na `CheckoutPage`**
  - Cobre: CA1 (seleção, clique em **Aprovado na máquina** e tela de conclusão exibindo *Crédito externo* ou *Débito externo*), CA2 (clique em **Não aprovado na máquina** mantendo `OPEN`, exibindo alerta claro e permitindo tentar novamente ou trocar de forma), CA3 (seleção de método externo não aprova automaticamente nem oferece atalho sem confirmação explícita), CA5 (botões de confirmação desabilitados em carregamento enquanto a requisição está em andamento), CA6 (troca de forma sem confirmar nunca dispara requisição; erro de rede exibe mensagem clara e mantém controles ativos para repetir a ação)
  - Teste primeiro: testes em `checkout.page.spec.ts` cobrindo seleção de `Crédito externo` e `Débito externo` sem requisição automática, clique em **Aprovado na máquina** concluindo a venda e exibindo a forma de pagamento registrada, clique em **Não aprovado na máquina** mantendo `OPEN` com aviso de recusa e possibilidade de retentar ou trocar forma, desabilitação dos botões durante carregamento, troca de forma sem confirmar e erro de rede mantendo `OPEN` com alerta claro; falham porque as opções externas ainda não existem na `CheckoutPage`
  - Arquivos previstos: `apps/web/src/app/features/checkout/pages/checkout.page.ts`, `apps/web/src/app/features/checkout/pages/checkout.page.html`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts`

## Critérios sem tarefa

*(nenhum)*
