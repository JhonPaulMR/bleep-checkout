---
issue: 8
status: aprovada
---

# US08 — Concluir ou cancelar uma venda

## O problema

Hoje, no simulador de caixa (`apps/web/src/app/features/checkout`) e na API de vendas (`apps/api/src/modules/sales`), o operador não tem como cancelar explicitamente uma venda em aberto (`OPEN`) ou pendente (`PENDING`, como um PIX ainda não confirmado) nem cancelar uma montagem de carrinho pelo atalho `[F8]` com confirmação. Além disso, a tela de venda concluída (`COMPLETED`) exibe apenas o número da venda e uma frase curta, sem apresentar o resumo completo com itens, quantidades, subtotais, total e a forma de pagamento confirmada para todas as modalidades.

## A história

**Como** operador de caixa, **eu quero** concluir uma venda somente depois de uma forma de pagamento válida ou cancelá-la quando necessário **para que** o registro das vendas não contenha compras pagas incorretamente.

## Critérios de aceite

- [ ] **CA1 — Dado** uma venda concluída (`COMPLETED`) após confirmação válida de qualquer forma de pagamento (`CARD`, `PIX`, `CUSTOMER_CREDIT`, `EXTERNAL_CREDIT` ou `EXTERNAL_DEBIT`), **quando** a tela de conclusão for exibida na `CheckoutPage`, **então** ela apresenta o resumo completo da venda concluída contendo seus itens, quantidades, subtotais, total (`totalCents`) e a forma de pagamento confirmada (*Cartão de crédito*, *PIX*, *Crédito do cliente*, *Crédito externo* ou *Débito externo*), sem oferecer ação de cancelamento (RN08, RN10, RN11, RN18).
- [ ] **CA2 — Dado** uma venda em estado `OPEN` ou `PENDING` sem pagamento `APPROVED`, **quando** o operador estiver na tela de pagamento, **então** o sistema não oferece nenhuma ação para concluir a venda sem confirmação válida da forma de pagamento; uma venda `PENDING` permanece `PENDING` até confirmação do pagamento ou cancelamento explícito (RN10).
- [ ] **CA3 — Dado** uma venda em estado `OPEN` ou `PENDING` pertencente ao operador autenticado, **quando** o operador clicar em **Cancelar venda** na tela de pagamento e confirmar explicitamente em **Confirmar cancelamento** (`POST /sales/:id/cancel`), **então** o servidor, dentro de uma transação atômica (`prisma.$transaction`), atualiza condicionalmente a `Sale` para `CANCELED` (mantendo `completedAt` nulo) e marca eventuais `Payment` em estado `PENDING` dessa venda como `ABANDONED`; na UI, o polling (se ativo) é encerrado, a venda passa a exibir o estado **Cancelada — nenhum valor recebido** e o botão **Nova venda** fica disponível (RN10, RN18).
- [ ] **CA4 — Dado** uma venda em estado `COMPLETED` ou `CANCELED`, **quando** uma requisição chegar a `POST /sales/:id/cancel`, **então** a API recusa com `422` (`"Uma venda concluída não pode ser cancelada."` para `COMPLETED` e `"A venda já está cancelada."` para `CANCELED`) sem alterar a `Sale` nem seus `Payment`; além disso, uma venda já `CANCELED` nunca retorna a `COMPLETED` mesmo se uma notificação atrasada de webhook PIX chegar depois (RN10, RN18).
- [ ] **CA5 — Dado** um usuário com papel `MANAGER` ou um `OPERATOR` diferente do dono da venda, **quando** tentar cancelar em `POST /sales/:id/cancel`, **então** o sistema recusa com `403`; se a venda não existir, responde `404` (RN13).
- [ ] **CA6 — Dado** que o operador está montando uma venda no caixa (carrinho com ao menos um item, antes de criar a venda no servidor), **quando** clicar em **Cancelar venda [F8]** ou pressionar a tecla `F8`, **então** a UI solicita confirmação explícita (**Confirmar cancelamento** / **Voltar**); ao confirmar, limpa carrinho, quantidade, erros e cliente selecionado; ao cancelar a confirmação (**Voltar** ou `Esc`), mantém o carrinho intacto. Com o carrinho vazio, o botão **Cancelar venda [F8]** permanece desabilitado.
- [ ] **CA7 — Dado** que o operador abriu a confirmação de cancelamento de uma venda `OPEN` ou `PENDING` na tela de pagamento, **quando** clicar em **Voltar**, pressionar `Esc`, fechar a aba ou recarregar a página sem confirmar, **então** nenhuma requisição `POST /sales/:id/cancel` é enviada e a venda permanece em seu estado atual; durante o envio da confirmação, os botões ficam desabilitados em estado de carregamento evitando duplo clique, e em caso de falha de rede a UI exibe erro claro mantendo a venda no estado atual e permitindo tentar novamente.

## Fora de escopo

- Tela dedicada de listagem, retomada ou cancelamento de vendas pendentes fora do caixa atual (pertence à US11 — `#12`).
- Trocar a forma de pagamento de uma venda já `PENDING` (pertence à US11 — `#12`).
- Estorno, devolução ou cancelamento de venda já `COMPLETED` (RN18 e Fora de Escopo do PRD).
- Cancelamento de venda por usuário com papel `MANAGER` (RN13).

## Abandono no meio

Não há jornada dedicada em `docs/user-flows.md` apenas para US08, mas os pontos de abandono cruzam a Jornada 1 (PIX) e as regras RN10/RN18:

- **O operador clica em "Cancelar venda" (no carrinho ou na tela de pagamento) mas desiste, pressiona `Esc` ou fecha a aba antes de clicar em "Confirmar cancelamento".** Nenhuma chamada de cancelamento é enviada ao servidor e o carrinho/venda permanece intacto (CA6, CA7).
- **A conexão cai durante o clique em "Confirmar cancelamento".** Os botões ficam desabilitados enquanto a requisição está em andamento para impedir cliques repetidos; se a requisição falhar antes de chegar ao servidor, a UI exibe erro claro e permite tentar novamente; se o cancelamento já foi gravado no servidor, uma segunda tentativa recebe `422` (`"A venda já está cancelada."`) sem efeito colateral (CA4, CA7).
- **Um pagamento PIX é confirmado pelo gateway depois que o operador já cancelou a venda.** Como `POST /sales/:id/cancel` marca o `Payment` `PENDING` como `ABANDONED` e a `Sale` como `CANCELED` na mesma transação atômica, a máquina de estados impede qualquer transição `ABANDONED → APPROVED` ou `CANCELED → COMPLETED` (CA3, CA4).

## Assume que

| Premissa | Issue que fecha |
| --- | --- |
| *(nenhuma — o schema Prisma já possui `SaleStatus.CANCELED` e `PaymentStatus.ABANDONED`, e o badge de venda cancelada já existe no template da `CheckoutPage`)* | — |

## Depende de

- `#3` (US06 — Pagar via PIX / Cartão e máquina de estados de `Sale`/`Payment`), já implementada na `main`.
- `#4` (US03 — Montar venda no simulador de caixa), já implementada na `main`.
- `#5` (US04 — Inserir quantidade de produtos na venda), já implementada na `main`.
- `#7` (US05 — Pagar com crédito do cliente), já implementada na `main`.
- `#6` (US07 — Registrar pagamento externo de crédito ou débito), já implementada na `main`.

## Dúvidas em aberto

| # | Dúvida | Quem responde |
| --- | --- | --- |
