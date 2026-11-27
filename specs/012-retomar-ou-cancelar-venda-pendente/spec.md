---
issue: 12
status: aprovada
---

# US11 — Retomar ou cancelar venda pendente

## O problema

Hoje, quando um operador gera um PIX no simulador de caixa (`apps/web/src/app/features/checkout`) e sai da tela ("Voltar ao caixa"), recarrega o navegador ou fecha a aba antes da confirmação do pagamento, a venda permanece no banco em estado `PENDING`, mas não existe uma tela de **Vendas pendentes** para listá-la, retomá-la com o mesmo QR Code, cancelá-la ou abandonar a tentativa PIX para trocar a forma de pagamento.

## A história

**Como** operador de caixa, **eu quero** consultar as vendas PIX pendentes e retomá-las ou cancelá-las **para que** uma venda abandonada no pagamento não fique esquecida nem seja tratada como paga.

## Critérios de aceite

- [ ] **CA1 — Dado** que existem vendas em estado `PENDING` pertencentes ao operador autenticado (com pagamento PIX pendente), **quando** o operador acessar a rota `/pendentes` (via item **Vendas pendentes** no cabeçalho do operador, que chama `GET /sales?status=PENDING`), **então** o sistema apresenta somente as vendas pendentes desse operador, exibindo número da venda, total (`totalCents`), data/hora e nome do cliente (quando houver), com selo de pendente e ações **Retomar**, **Trocar forma** e **Cancelar** (RN12, RN13, RN17).
- [ ] **CA2 — Dado** que não existem vendas `PENDING` para o operador autenticado, **quando** ele consultar `/pendentes` (`GET /sales?status=PENDING` retornando lista vazia), **então** a tela exibe o estado vazio informando claramente que não há vendas pendentes, com link/atalho para voltar ao caixa.
- [ ] **CA3 — Dado** uma venda `PENDING` listada em `/pendentes`, **quando** o operador clicar em **Retomar**, **então** ele é levado a `/caixa?saleId=<id>`, onde a `CheckoutPage` carrega a venda via `GET /sales/:id`, volta a apresentar o mesmo QR Code PIX (`qrCodeBase64` e `qrCode` copia e cola) do pagamento `PENDING` existente sem gerar nova cobrança, retoma o polling de confirmação e mantém a venda em `PENDING` até confirmação ou cancelamento (RN10, RN12, RN17).
- [ ] **CA4 — Dado** uma venda `PENDING` listada em `/pendentes`, **quando** o operador clicar em **Cancelar** e confirmar explicitamente em **Confirmar cancelamento** (`POST /sales/:id/cancel`), **então** a venda é cancelada (`CANCELED`, `Payment` `PENDING` marcado como `ABANDONED`), deixa imediatamente de constar na lista de vendas pendentes e nunca é tratada como paga (RN10, RN12, RN17).
- [ ] **CA5 — Dado** uma venda `PENDING` pertencente ao operador autenticado (na lista `/pendentes` ou na tela de PIX pendente em `/caixa`), **quando** o operador clicar em **Trocar forma de pagamento** e confirmar (`POST /sales/:id/reopen`), **então** o servidor, dentro de `prisma.$transaction`, atualiza condicionalmente a `Sale` de `PENDING` para `OPEN` e marca o `Payment` `PENDING` como `ABANDONED`, e a UI leva/mantém o operador em `/caixa?saleId=<id>` com as formas de pagamento liberadas (`CARD`, `PIX`, `CUSTOMER_CREDIT`, `EXTERNAL_CREDIT`, `EXTERNAL_DEBIT`). Se um webhook PIX atrasado da tentativa abandonada chegar depois, o servidor ignora sem marcar a venda como paga novamente (`ABANDONED → ∅` e `COMPLETED → ∅`) (RN10, RN17).
- [ ] **CA6 — Dado** uma venda que não está em estado `PENDING` (`OPEN`, `COMPLETED` ou `CANCELED`), **quando** uma requisição chegar a `POST /sales/:id/reopen`, **então** a API recusa com `422` (`"A venda não está pendente para reabertura."`) sem alterar `Sale` nem `Payment`; um `MANAGER` ou outro `OPERATOR` que não seja o dono da venda recebe `403` em `GET /sales?status=PENDING` (`MANAGER`) e em `POST /sales/:id/reopen` (`MANAGER` ou outro `OPERATOR`), e venda inexistente recebe `404` (RN13).
- [ ] **CA7 — Dado** o nó vermelho da Jornada 1 (*abandono no pagamento PIX — fechou a aba, recarregou ou saiu sem confirmar*), ou desistência/falha de rede na tela `/pendentes`, **quando** o operador abandonar o PIX e retornar posteriormente em `/pendentes`, **então** a venda continua `PENDING` sem nunca ter sido marcada como paga; desistir da confirmação de cancelamento (`Voltar` ou `Esc`) não dispara `POST /sales/:id/cancel`; e em caso de falha de rede ao listar, cancelar ou reabrir, a UI exibe erro claro e permite tentar novamente sem perder o estado (RN12, RN17).

## Fora de escopo

- Expiração automática por tempo de vendas PIX pendentes (RN17 e Fora de Escopo do PRD).
- Estorno automático no gateway caso um PIX abandonado seja pago pelo cliente após troca de forma de pagamento (o sistema apenas impede a dupla conclusão da venda pela máquina de estados).
- Consulta ou gerenciamento de vendas pendentes por `MANAGER` ou de outros operadores (RN13).
- Histórico geral de vendas concluídas ou canceladas.

## Abandono no meio

Diretamente ligado ao **nó vermelho `X1`** da **Jornada 1 — Finalizar uma venda com PIX** em `docs/user-flows.md`:

- **O cliente fecha a tela, desiste ou o operador sai do caixa antes da confirmação do PIX (`X1`).** A venda não é marcada como paga; ela permanece `PENDING` no banco sem expiração automática e aparece na tela `/pendentes` para ser retomada (mesmo QR Code), cancelada ou reaberta para outra forma de pagamento (CA1, CA3, CA4, CA5, CA7).
- **O operador abre a confirmação de cancelamento em `/pendentes`, mas clica em "Voltar", aperta `Esc` ou fecha a aba.** Nenhuma chamada `POST /sales/:id/cancel` é disparada e a venda segue `PENDING` (CA7).
- **A conexão cai ao listar `/pendentes`, ao cancelar ou ao trocar a forma de pagamento (`POST /sales/:id/reopen`).** Os botões de ação ficam desabilitados enquanto a requisição está em andamento para evitar duplo clique; em caso de falha, a UI exibe mensagem clara e permite repetir a ação. Se a venda já mudou de estado no servidor (ex.: PIX confirmado pelo webhook um segundo antes), a API responde `422` sem corromper dados (CA6, CA7).
- **Um webhook PIX atrasado chega depois que o operador abandonou a tentativa PIX ao trocar a forma de pagamento.** Como o `Payment` anterior foi marcado `ABANDONED` na transação de `reopen`, a máquina de estados (`ABANDONED → ∅`) impede que o webhook aprove a tentativa abandonada ou pague a venda duas vezes (CA5).

## Assume que

| Premissa | Issue que fecha |
| --- | --- |
| *(nenhuma — `SaleStatus.PENDING`, `PaymentStatus.ABANDONED`, `POST /sales/:id/cancel` e `GET /sales/:id` já existem na `main`)* | — |

## Depende de

- `#3` (US06 — Pagar via PIX e webhook/máquina de estados), já implementada na `main`.
- `#8` (US08 — Concluir ou cancelar uma venda, incluindo `POST /sales/:id/cancel`), já implementada na `main`.

## Dúvidas em aberto

| # | Dúvida | Quem responde |
| --- | --- | --- |
