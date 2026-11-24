# Plano — Issue #3

## Decisões técnicas

- **Variáveis de ambiente (`ConfigModule` / `env.validation.ts`):** exigir `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY` e `MP_WEBHOOK_SECRET` no boot da API. Documentar apenas placeholders no `apps/api/.env.example` e injetar valores fictícios no `.github/workflows/ci.yml` para os testes no CI.
- **Entidades Prisma (`apps/api/prisma/schema.prisma`):**
  - `Product`: `id`, `name`, `barcode @unique`, `priceCents (Int)`, `active (Boolean @default(true))`, `createdAt`. Populado com catálogo inicial no `seed.ts` (`// TODO #1`).
  - `Sale` (`SaleStatus`: `OPEN | PENDING | COMPLETED | CANCELED`): `id`, `number (Int @unique @default(autoincrement()))`, `operatorId (FK User)`, `status (SaleStatus @default(OPEN))`, `totalCents (Int)`, `createdAt`, `completedAt (DateTime?)`.
  - `SaleItem`: `id`, `saleId (FK Sale)`, `productId (FK Product)`, `quantity (Int)`, `unitPriceCents (Int)`, `@@unique([saleId, productId])`.
  - `Payment` (`PaymentMethod`: `CARD | PIX | CUSTOMER_CREDIT | EXTERNAL_CREDIT | EXTERNAL_DEBIT`; `PaymentStatus`: `PENDING | APPROVED | DECLINED | ABANDONED`): `id`, `saleId (FK Sale)`, `method`, `status`, `amountCents (Int)`, `gatewayPaymentId (String? @unique)`, `qrCode (String?)`, `qrCodeBase64 (String?)`, `createdAt`.
  - `WebhookEvent`: `id`, `gatewayEventId (String @unique)`, `payload (Json)`, `processedAt (DateTime @default(now()))`.
- **Abstração de Gateway (`PaymentGateway`):** interface injetável por token (`PAYMENT_GATEWAY`) no módulo `payments`, com implementação real `MercadoPagoGateway` usando o SDK oficial `mercadopago` (`new Payment(client).create(...)` e `new Payment(client).get(...)`). Nos testes unitários e e2e, `PAYMENT_GATEWAY` é substituído por um dublê determinístico (sem dependência de rede).
- **Contrato da API (Swagger com `@ApiTags` e `@ApiBearerAuth()`):**
  - `GET /products` (`@Roles(Role.OPERATOR)`) — lista produtos ativos para seleção no caixa (`// TODO #4`).
  - `POST /sales` (`@Roles(Role.OPERATOR)`) — recebe `{ items: [{ productId, quantity }] }`, calcula `totalCents` no servidor a partir do banco e devolve `201`.
  - `GET /sales/:id` (`@Roles(Role.OPERATOR)` + regra de dono `sale.operatorId === req.user.sub`) — retorna a venda com itens e pagamentos (usado também no polling).
  - `GET /payments/config` (`@Roles(Role.OPERATOR)`) — retorna `{ publicKey }` (`MP_PUBLIC_KEY`).
  - `POST /sales/:id/payments/card` (`@Roles(Role.OPERATOR)` + regra de dono) — recebe `{ token, paymentMethodId, installments, identification: { type, number }, payerEmail? }` (sem valor monetário), cria `Payment`, cobra com `transaction_amount: sale.totalCents / 100`, `external_reference: sale.id` e `idempotencyKey: payment.id`, aplica a máquina de estados em `prisma.$transaction`.
  - `POST /sales/:id/payments/pix` (`@Roles(Role.OPERATOR)` + regra de dono) — cria `Payment` (`PIX`), solicita cobrança `pix` ao gateway com `idempotencyKey: payment.id`, salva `gatewayPaymentId` e `qrCode`, muda `Sale.status` → `PENDING`.
  - `POST /webhooks/mercadopago` (`@Public()`) — valida `x-signature` (HMAC-SHA256 com `crypto.timingSafeEqual` + checagem de tamanho sobre `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`), grava `WebhookEvent` (UNIQUE `gatewayEventId`), consulta `PaymentGateway.getPayment(dataId)`, confere `external_reference` e valor, e aplica apenas transições permitidas da máquina de estados dentro de `prisma.$transaction`.
- **Frontend (`apps/web`):**
  - Script oficial `<script src="https://sdk.mercadopago.com/js/v2"></script>` em `apps/web/src/index.html`.
  - `features/checkout/data/checkout.service.ts` encapsula todas as chamadas HTTP da feature e desembrulha `{ data }`.
  - `features/checkout/pages/checkout.page.*` usa signals, `@if`/`@for`, Tailwind com design tokens, montagem mínima de venda a partir dos produtos do seed (`// TODO #4`), Card Payment Brick oficial, fluxo PIX com QR Code e polling de `GET /sales/:id` enquanto `status === 'PENDING'`.

## Tarefas

- [x] **Tarefa 1 — Configurar variáveis do Mercado Pago, SDK oficial e CI**
  - Cobre: CA12
  - Complexidade sugerida (orquestração): Fácil (`flash`)
  - Teste primeiro: unit de `validateEnv` garantindo erro no boot quando `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY` ou `MP_WEBHOOK_SECRET` estiverem ausentes/vazias e sucesso quando presentes; falha porque as três variáveis ainda não estão em `REQUIRED_VARS`
  - Arquivos previstos: `apps/api/package.json`, `apps/api/.env.example`, `apps/api/src/config/env.validation.ts`, `apps/api/src/config/env.validation.spec.ts`, `.github/workflows/ci.yml`

- [x] **Tarefa 2 — Modelar `Product`, `Sale`, `SaleItem`, `Payment` e `WebhookEvent` com migration e seed de produtos**
  - Cobre: pré-requisito estrutural de CA1, CA3, CA4, CA5, CA6, CA11 (passo técnico)
  - Complexidade sugerida (orquestração): Média (`inherit`)
  - Teste primeiro: teste de integração/e2e comprovando criação de `Sale` + `SaleItem` + `Payment` + `WebhookEvent` e violação de unicidade (`P2002`) ao tentar gravar `Payment.gatewayPaymentId` ou `WebhookEvent.gatewayEventId` duplicados; falha porque os models e enums não existem no `schema.prisma`
  - Arquivos previstos: `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/<timestamp>_create_sales_and_payments/migration.sql`, `apps/api/prisma/seed.ts`, `apps/api/test/payments-schema.e2e-spec.ts`

- [x] **Tarefa 3 — Implementar catálogo mínimo (`GET /products`) e criação/consulta de vendas (`POST /sales`, `GET /sales/:id`) com total no servidor**
  - Cobre: CA1, CA8 (rotas de produtos e vendas)
  - Complexidade sugerida (orquestração): Média (`inherit`)
  - Teste primeiro: unit de `SalesService` (cálculo de `totalCents` a partir de `Product.priceCents`, recusa de lista vazia/quantidade inválida/produto inativo e regra de dono) e e2e (`POST /sales` `201`, `400` ao tentar enviar `totalCents`/`priceCents`/`transaction_amount`, `401` sem token, `403` para `MANAGER` ou `OPERATOR` diferente do dono); falham porque os módulos `products` e `sales` não existem
  - Arquivos previstos: `apps/api/src/modules/products/products.module.ts`, `apps/api/src/modules/products/products.controller.ts`, `apps/api/src/modules/products/products.service.ts`, `apps/api/src/modules/sales/sales.module.ts`, `apps/api/src/modules/sales/sales.controller.ts`, `apps/api/src/modules/sales/sales.service.ts`, `apps/api/src/modules/sales/sales.service.spec.ts`, `apps/api/src/modules/sales/dto/create-sale.dto.ts`, `apps/api/src/app.module.ts`, `apps/api/test/sales.e2e-spec.ts`

- [x] **Tarefa 4 — Criar interface `PaymentGateway` (Mercado Pago), máquina de estados e `GET /payments/config`**
  - Cobre: CA2 (lado da API), pré-requisito de CA3–CA6 e CA10
  - Complexidade sugerida (orquestração): Média (`inherit`)
  - Teste primeiro: unit da máquina de estados (`canTransitionSale` e `canTransitionPayment`, bloqueando regressões como `COMPLETED` → `PENDING`/`OPEN`/`CANCELED`) e e2e de `GET /payments/config` (`200` com apenas `publicKey`, nunca expondo segredos; `401` sem JWT; `403` para `MANAGER`); falham porque o módulo `payments` não existe
  - Arquivos previstos: `apps/api/src/modules/payments/payment-gateway.interface.ts`, `apps/api/src/modules/payments/mercadopago.gateway.ts`, `apps/api/src/modules/payments/payment-state-machine.ts`, `apps/api/src/modules/payments/payment-state-machine.spec.ts`, `apps/api/src/modules/payments/payments.controller.ts`, `apps/api/src/modules/payments/payments.module.ts`, `apps/api/src/app.module.ts`, `apps/api/test/payments.e2e-spec.ts`

- [x] **Tarefa 5 — Implementar cobrança com cartão (`POST /sales/:id/payments/card`) para aprovado, recusado e em análise**
  - Cobre: CA3, CA4, CA5, CA7 (lado da API — `idempotencyKey`), CA8 (propriedade e papel na cobrança)
  - Complexidade sugerida (orquestração): Média (`inherit`)
  - Teste primeiro: unit de `PaymentsService.payWithCard` e e2e com dublê de `PaymentGateway` cobrindo `approved` (`Sale` → `COMPLETED`), `rejected` (`Payment` → `DECLINED`, `Sale` permanece `OPEN` e aceita nova tentativa com nova `idempotencyKey`), `in_process`/`pending` (`Sale` → `PENDING`), recusa de valor no DTO (`400`), `external_reference: sale.id`, `idempotencyKey: payment.id` e `403` para `MANAGER` ou outro `OPERATOR`; falham porque o endpoint e método não existem
  - Arquivos previstos: `apps/api/src/modules/payments/dto/pay-with-card.dto.ts`, `apps/api/src/modules/payments/payments.service.ts`, `apps/api/src/modules/payments/payments.service.spec.ts`, `apps/api/src/modules/payments/payments.controller.ts`, `apps/api/test/payments.e2e-spec.ts`

- [x] **Tarefa 6 — Implementar cobrança PIX (`POST /sales/:id/payments/pix`) com QR Code e status `PENDING`**
  - Cobre: CA6 (lado da API), CA8 (propriedade e papel no PIX)
  - Complexidade sugerida (orquestração): Fácil (`flash`)
  - Teste primeiro: unit de `PaymentsService.payWithPix` e e2e com dublê de `PaymentGateway` provando gravação de `Payment` (`PIX`, `PENDING`), `gatewayPaymentId` e `qrCode`, transição de `Sale` para `PENDING` (nunca `COMPLETED`), `external_reference: sale.id`, `idempotencyKey: payment.id` e `403` para `MANAGER` ou outro `OPERATOR`; falham porque o endpoint PIX não existe
  - Arquivos previstos: `apps/api/src/modules/payments/payments.service.ts`, `apps/api/src/modules/payments/payments.service.spec.ts`, `apps/api/src/modules/payments/payments.controller.ts`, `apps/api/test/payments.e2e-spec.ts`

- [x] **Tarefa 7 — Implementar rota pública de webhook (`POST /webhooks/mercadopago`) com verificação de assinatura HMAC-SHA256**
  - Cobre: CA9
  - Complexidade sugerida (orquestração): Alta (`inherit`)
  - Teste primeiro: unit do validador de assinatura (`id:<data.id>;request-id:<x-request-id>;ts:<ts>;`, HMAC-SHA256 em tempo constante com `crypto.timingSafeEqual` e checagem de tamanho) e e2e em `POST /webhooks/mercadopago` sem JWT (`@Public()`): assinatura válida responde `200`, assinatura inválida/ausente/malformada responde `401` sem chamar o gateway nem alterar o banco; falham porque o módulo `webhooks` não existe
  - Arquivos previstos: `apps/api/src/modules/webhooks/webhook-signature.validator.ts`, `apps/api/src/modules/webhooks/webhook-signature.validator.spec.ts`, `apps/api/src/modules/webhooks/webhooks.controller.ts`, `apps/api/src/modules/webhooks/webhooks.service.ts`, `apps/api/src/modules/webhooks/webhooks.module.ts`, `apps/api/src/app.module.ts`, `apps/api/test/webhooks.e2e-spec.ts`

- [x] **Tarefa 8 — Processar webhook consultando gateway, validando pedido/valor e garantindo idempotência e máquina de estados**
  - Cobre: CA10, CA11
  - Complexidade sugerida (orquestração): Alta (`inherit`)
  - Teste primeiro: unit de `WebhooksService` e e2e com notificação assinada + dublê de `PaymentGateway` cobrindo: venda `PENDING` (cartão em análise ou PIX) + webhook `approved` → `COMPLETED`; `PENDING` + `rejected` → `OPEN`; repetição do mesmo webhook (ou resposta síncrona + webhook) → `200` sem duplicar nada; notificação atrasada (`pending`/`rejected`) em venda já `COMPLETED` → `200` mantendo `COMPLETED`; divergência de `external_reference` ou valor não conclui venda; falham porque o processamento completo não existe
  - Arquivos previstos: `apps/api/src/modules/webhooks/webhooks.service.ts`, `apps/api/src/modules/webhooks/webhooks.service.spec.ts`, `apps/api/test/webhooks.e2e-spec.ts`

- [x] **Tarefa 9 — Construir fluxo de caixa e pagamento no frontend (Card Payment Brick, PIX, polling e estados de erro)**
  - Cobre: CA2 (lado do front), CA3 (front), CA4 (front), CA5 (front), CA6 (front), CA7 (front)
  - Complexidade sugerida (orquestração): Média (`inherit`)
  - Teste primeiro: unit do `CheckoutService` (endpoints `/products`, `/sales`, `/payments/config`, `/sales/:id/payments/card`, `/sales/:id/payments/pix` e `GET /sales/:id`, nunca enviando preço na cobrança) e unit da `CheckoutPage` (criação de venda, inicialização do Brick com `publicKey` da API e `payer.email`, exibição de `COMPLETED`, `DECLINED` com nova tentativa, `PENDING` com "Estamos confirmando o pagamento" + polling, PIX com QR Code e estado pendente, botão desabilitado durante envio e erro de rede sem marcar como pago); falham porque o serviço e a página completa ainda não existem
  - Arquivos previstos: `apps/web/src/index.html`, `apps/web/src/app/features/checkout/data/checkout.service.ts`, `apps/web/src/app/features/checkout/data/checkout.service.spec.ts`, `apps/web/src/app/features/checkout/pages/checkout.page.ts`, `apps/web/src/app/features/checkout/pages/checkout.page.html`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts`

## Critérios sem tarefa

*(vazio — todos os critérios CA1 a CA12 estão cobertos acima)*
