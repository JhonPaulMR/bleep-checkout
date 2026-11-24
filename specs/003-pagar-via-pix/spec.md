---
issue: 3
status: aprovada
---

# US06 — Pagar venda via gateway (Mercado Pago Checkout Transparente: Cartão e PIX)

## O problema

Hoje o Bleep Checkout possui apenas autenticação (`US09`) e cadastro de operadores (`US10`). Não existem ainda as entidades de produto, venda e pagamento no banco, nem qualquer integração com o gateway de pagamento (Mercado Pago). Sem um servidor que calcule o valor da venda a partir do banco, cobre o pagamento no gateway em sandbox e confirme mudanças de estado por webhook assinado e idempotente, o sistema não consegue receber pagamentos com segurança nem impedir fraudes vindas do navegador.

## A história

**Como** operador de caixa, **eu quero** cobrar uma venda pelo gateway de pagamento (Mercado Pago em Checkout Transparente com cartão ou PIX) **para que** o valor seja calculado no servidor e a venda só seja marcada como concluída após confirmação legítima do gateway (resposta da cobrança ou webhook assinado).

> Nota de escopo: esta spec atende à US06 (`docs/prd.md`) e incorpora o requisito obrigatório da Atividade 14 (ID20 e ID21) de **Cartão de Crédito via Mercado Pago Checkout Transparente (Card Payment Brick)** em sandbox, mantendo o **PIX** com QR Code e confirmação assíncrona via webhook.

## Critérios de aceite

- [ ] **CA1 — Dado** um operador de caixa autenticado (`OPERATOR`) e produtos ativos cadastrados no banco, **quando** ele criar uma venda (`POST /sales`) informando apenas os itens (`productId` e `quantity`), **então** o servidor busca os preços (`priceCents`) no banco, calcula `totalCents = soma(priceCents * quantity)`, grava `Sale` (`status: OPEN`) e `SaleItem` (`unitPriceCents` do banco) e devolve `201`; qualquer campo de preço/valor enviado pelo cliente (ex.: `totalCents`, `priceCents`, `transaction_amount`) é rejeitado com `400` pelo `ValidationPipe` (`forbidNonWhitelisted`), e lista vazia, quantidade `<= 0` ou produto inexistente/inativo é rejeitada com `400`/`422`.
- [ ] **CA2 — Dado** um operador de caixa autenticado na tela do caixa, **quando** ele abrir o pagamento de uma venda em `OPEN`, **então** o frontend obtém a chave pública pela API (`GET /payments/config`, que devolve apenas `publicKey` e nunca expõe `MP_ACCESS_TOKEN` ou `MP_WEBHOOK_SECRET`), carrega o SDK oficial do Mercado Pago (`https://sdk.mercadopago.com/js/v2`) e renderiza o Card Payment Brick com `amount` apenas para exibição e `initialization.payer.email` preenchido; o número do cartão nunca é enviado ao servidor do Bleep Checkout.
- [ ] **CA3 — Dado** uma venda em `OPEN` pertencente ao operador autenticado, **quando** ele submeter um pagamento com cartão (`POST /sales/:id/payments/card` com `token`, `paymentMethodId`, `installments` e `identification`, sem nenhum valor monetário) e o gateway responder `approved`, **então** o servidor cria o `Payment` (`method: CARD`, `amountCents: sale.totalCents`) antes de chamar o gateway, cobra usando `transaction_amount` calculado do banco, `external_reference: sale.id` e `idempotencyKey: payment.id`, grava `gatewayPaymentId` (único), atualiza `Payment.status` → `APPROVED` e `Sale.status` → `COMPLETED` (com `completedAt`) em `prisma.$transaction`, e a tela exibe a venda como paga/concluída.
- [ ] **CA4 — Dado** uma venda em `OPEN` pertencente ao operador autenticado, **quando** o gateway responder `rejected` na cobrança com cartão (ex.: titular `OTHE`), **então** o servidor grava `gatewayPaymentId` e marca o `Payment` como `DECLINED`, mantém `Sale.status` em `OPEN`, informa a recusa na tela e permite nova tentativa de pagamento na mesma venda (criando um novo `Payment` com nova `idempotencyKey`).
- [ ] **CA5 — Dado** uma venda em `OPEN` pertencente ao operador autenticado, **quando** o gateway responder `in_process` ou `pending` na cobrança com cartão (ex.: titular `CONT`), **então** o servidor grava `gatewayPaymentId`, mantém `Payment.status` em `PENDING`, transiciona `Sale.status` para `PENDING` (em análise / aguardando confirmação) em `prisma.$transaction` e não marca a venda como paga; a tela exibe "Estamos confirmando o pagamento" e consulta o status da venda no servidor até que o webhook altere o estado.
- [ ] **CA6 — Dado** uma venda em `OPEN` pertencente ao operador autenticado, **quando** ele escolher pagamento via PIX (`POST /sales/:id/payments/pix`), **então** o servidor cria `Payment` (`method: PIX`, `status: PENDING`, `amountCents: sale.totalCents`), solicita a cobrança PIX ao gateway com valor do banco, `external_reference: sale.id` e `idempotencyKey: payment.id`, grava `gatewayPaymentId` e `qrCode`, transiciona `Sale.status` para `PENDING` e apresenta o QR Code na tela aguardando confirmação; se a tela for fechada ou abandonada sem confirmação do gateway, a venda permanece `PENDING` e nunca é marcada como paga.
- [ ] **CA7 — Dado** que o operador acionou o pagamento na tela, **quando** a requisição estiver em andamento ou a rede falhar antes da resposta, **então** o botão permanece desabilitado durante o envio (impedindo duplo clique), a cobrança no servidor usa `idempotencyKey: payment.id` para evitar cobrança duplicada no gateway e, em caso de erro de rede/servidor, a tela exibe mensagem de erro de conexão e reabilita a ação sem marcar a venda como paga.
- [ ] **CA8 — Dado** as rotas protegidas de venda e pagamento (`GET /products`, `POST /sales`, `GET /sales/:id`, `POST /sales/:id/payments/card`, `POST /sales/:id/payments/pix`, `GET /payments/config`), **quando** uma requisição chegar sem JWT válido recebe `401`; **quando** um `MANAGER` tentar acessá-las recebe `403` (RN13); **quando** um `OPERATOR` tentar consultar ou pagar uma venda de outro operador (`sale.operatorId !== req.user.sub`) recebe `403`.
- [ ] **CA9 — Dado** a rota pública de webhook (`POST /webhooks/mercadopago`, marcada com `@Public()`), **quando** chegar uma notificação sem `x-signature`, sem `x-request-id`, sem `data.id` na query string ou com assinatura HMAC-SHA256 inválida (segredo errado ou manifesto adulterado), **então** a API rejeita imediatamente com `401` (usando validação oficial do SDK ou comparação em tempo constante com `crypto.timingSafeEqual` após checar o tamanho dos buffers), não consulta o gateway e não altera nenhum registro no banco.
- [ ] **CA10 — Dado** uma notificação de webhook com assinatura válida (`type=payment` e `data.id` na query string), **quando** a API processá-la, **então** ela consulta o pagamento diretamente no gateway (`PaymentGateway.getPayment`), confere `external_reference` (id da venda) e o valor (`transaction_amount` compatível com `sale.totalCents`), e aplica dentro de `prisma.$transaction` apenas transições permitidas pela máquina de estados (`PENDING`/`OPEN` → `COMPLETED` quando `approved`; `PENDING` → `OPEN` quando `rejected`); transições proibidas (como venda já `COMPLETED` recebendo `pending`/`in_process`/`rejected`, ou `CANCELED` recebendo `approved`) são ignoradas sem alterar a venda, respondendo `200`.
- [ ] **CA11 — Dado** que a mesma confirmação de pagamento chega mais de uma vez (resposta síncrona `approved` seguida de webhook `approved`, ou webhooks repetidos/simultâneos com o mesmo `gatewayEventId` ou `gatewayPaymentId`), **quando** a repetição for processada, **então** a restrição `UNIQUE` no banco (`Payment.gatewayPaymentId` e `WebhookEvent.gatewayEventId`) combinada com a guarda da máquina de estados garante que nenhum pagamento seja duplicado, nenhum efeito colateral seja aplicado duas vezes e o webhook responda `200`.
- [ ] **CA12 — Dado** o carregamento da API (`ConfigModule` / `env.validation.ts`), **quando** qualquer uma das variáveis `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY` ou `MP_WEBHOOK_SECRET` estiver ausente, **então** a API recusa subir no boot; o `.env.example` lista apenas os nomes/placeholders dessas variáveis e nenhuma credencial (nem de teste) existe no repositório.

### Máquina de estados de referência

**Venda (`Sale.status`):**
- Transições permitidas:
  - `OPEN` → `COMPLETED` (pagamento aprovado na resposta síncrona do gateway ou via webhook)
  - `OPEN` → `PENDING` (cartão em análise `in_process`/`pending` ou PIX gerado `pending`)
  - `PENDING` → `COMPLETED` (webhook confirma pagamento `approved`)
  - `PENDING` → `OPEN` (webhook confirma pagamento `rejected`, permitindo nova tentativa)
- Transições proibidas:
  - `COMPLETED` → `OPEN` | `PENDING` | `CANCELED` (venda paga nunca regride, mesmo diante de notificação atrasada)
  - `CANCELED` → `OPEN` | `PENDING` | `COMPLETED`

**Pagamento (`Payment.status`):**
- Transições permitidas: `PENDING` → `APPROVED` | `DECLINED` | `ABANDONED`.
- Transições proibidas: `APPROVED` → `PENDING` | `DECLINED`; `DECLINED` → `APPROVED` | `PENDING`.

## Fora de escopo

- Cadastro, edição ou desativação de produtos pela interface do gerente (pertence à Issue `#1` / US01 e `#14` / US13).
- Busca por código de barras com leitor físico ou pesquisa completa de catálogo no simulador de caixa (pertence à Issue `#4` / US03 e `#5` / US04).
- Tela dedicada de Vendas Pendentes para listar, retomar ou cancelar vendas PIX abandonadas (pertence à Issue `#12` / US11).
- Pagamento por crédito de cliente (Issue `#7` / US05) e pagamento externo em maquininha (Issue `#6` / US07).
- Estorno de venda concluída (explicitamente fora de escopo no `docs/prd.md` §6; em sandbox o Mercado Pago também recusa estorno via API com `401`).
- Controle de estoque, emissão fiscal ou descontos/cupons.

## Abandono no meio

Esta história cobre o **nó vermelho** da Jornada 1 (`docs/user-flows.md`): *"Abandona o pagamento — não marcar como pago"*.

**O cliente ou operador fecha a aba depois de gerar o PIX ou enviar um cartão em análise.** O fechamento da tela não é prova de pagamento. A venda permanece em `PENDING` no banco de dados e só muda para `COMPLETED` se e quando o gateway confirmar via webhook assinado (CA5, CA6, CA10).

**O operador clica duas vezes em pagar ou a rede cai durante a cobrança.** O botão fica desabilitado enquanto a requisição está em curso; no servidor, o registro `Payment` é criado antes da chamada ao gateway e o seu `id` vai como `idempotencyKey`, garantindo que o Mercado Pago não cobre duas vezes (CA7).

**O pagamento com cartão é recusado (`OTHE`).** A tentativa fica registrada como `DECLINED` com o `gatewayPaymentId`, mas a venda permanece `OPEN` para que o operador possa tentar novamente com outro cartão, gerando uma nova tentativa com nova chave de idempotência (CA4).

**Notificação duplicada ou atrasada chega pelo webhook.** No Checkout Transparente, um cartão aprovado retorna `approved` na resposta síncrona e, segundos depois, o webhook envia a mesma confirmação. A restrição `UNIQUE` em `Payment.gatewayPaymentId` e `WebhookEvent.gatewayEventId`, junto com a máquina de estados em transação, garante que a segunda entrega não duplique nada e responda `200`, e que uma notificação atrasada (`pending`/`rejected`) nunca regrida uma venda já `COMPLETED` (CA10, CA11).

**Alguém tenta forjar o pagamento pelo navegador ou chamando o webhook diretamente.** O preço é sempre buscado no banco e qualquer valor enviado pela tela é rejeitado (CA1); o webhook exige assinatura HMAC-SHA256 válida antes de qualquer ação e consulta o status real diretamente na API do Mercado Pago (CA9, CA10).

## Assume que

| Premissa | Issue que fecha |
| --- | --- |
| Catálogo inicial de produtos é inserido pelo seed (`prisma/seed.ts`) porque a tela de cadastro de produtos do gerente ainda não existe (`// TODO #1`) | `#1` (US01 — Cadastrar produto) |
| A montagem da venda na tela do caixa usa seleção direta dos produtos do catálogo seedado, sem leitor de código de barras nem busca avançada (`// TODO #4`) | `#4` (US03 — Montar venda no simulador de caixa) |
| Vendas PIX pendentes abandonadas ficam persistidas como `PENDING` no banco, mas ainda sem a tela dedicada de retomada/cancelamento (`// TODO #12`) | `#12` (US11 — Retomar ou cancelar venda pendente) |

## Depende de

- `#10` (US09 — Entrar no sistema), já implementada na `main`.
- `#11` (US10 — Cadastrar operador), já implementada na `main` (`RolesGuard` global).

## Dúvidas em aberto

| # | Dúvida | Quem responde |
| --- | --- | --- |
