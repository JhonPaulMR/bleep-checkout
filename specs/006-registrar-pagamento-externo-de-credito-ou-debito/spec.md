---
issue: 6
status: aprovada
---

# US07 — Registrar pagamento externo de crédito ou débito

## O problema

Hoje, na tela de pagamento do simulador de caixa (`apps/web/src/app/features/checkout`), o operador só consegue finalizar vendas por cartão no gateway, PIX ou crédito do cliente. Quando o cliente paga em uma maquininha de cartão externa (crédito ou débito), não há como registrar essa forma de pagamento e o resultado da transação no sistema, o que impede concluir a venda corretamente e deixa o histórico de formas de pagamento incompleto.

## A história

**Como** operador de caixa, **eu quero** registrar que uma venda foi paga por crédito ou débito em uma máquina externa **para que** o sistema mantenha o registro da forma de pagamento sem controlar a máquina.

## Critérios de aceite

- [ ] **CA1 — Dado** uma venda em estado `OPEN` pertencente ao operador autenticado, **quando** o operador selecionar **Crédito externo** (`EXTERNAL_CREDIT`) ou **Débito externo** (`EXTERNAL_DEBIT`) e clicar em **Aprovado na máquina** (`POST /sales/:id/payments/external` com `{ method, approved: true }`), **então** o servidor grava um `Payment` com `method` igual ao escolhido, `status: APPROVED` e `amountCents: sale.totalCents`, transita a `Sale` para `COMPLETED` com `completedAt` preenchido dentro de uma transação atômica, e a tela de conclusão exibe a venda concluída indicando a forma de pagamento registrada (*Crédito externo* ou *Débito externo*) (RN10, RN11).
- [ ] **CA2 — Dado** uma venda em estado `OPEN` pertencente ao operador autenticado, **quando** o operador selecionar **Crédito externo** ou **Débito externo** e clicar em **Não aprovado na máquina** (`POST /sales/:id/payments/external` com `{ method, approved: false }`), **então** o servidor grava um `Payment` com o `method` escolhido e `status: DECLINED`, mantém a `Sale` em `OPEN` (com `completedAt` nulo), e a interface informa que o pagamento externo não foi aprovado, permitindo tentar novamente ou trocar a forma de pagamento (RN10, RN11).
- [ ] **CA3 — Dado** que o operador selecionou **Crédito externo** ou **Débito externo** na tela de pagamento, **quando** ele ainda não clicou em **Aprovado na máquina** (ou tenta enviar uma requisição para `POST /sales/:id/payments/external` sem `approved` booleano ou com `method` fora de `EXTERNAL_CREDIT` | `EXTERNAL_DEBIT`), **então** o sistema não marca a venda como paga automaticamente; a UI não oferece atalho que aprove sem confirmação explícita e a API rejeita payload inválido com `400` sem criar `Payment` nem alterar a `Sale` (RN10, RN11).
- [ ] **CA4 — Dado** um usuário com papel `MANAGER` ou um `OPERATOR` diferente do dono da venda, **quando** tentar registrar pagamento externo em `POST /sales/:id/payments/external`, **então** o sistema recusa com `403`; se a venda não existir, responde `404` (RN13).
- [ ] **CA5 — Dado** uma venda que já não está em estado `OPEN` (por exemplo `COMPLETED`, `PENDING` ou `CANCELED`, inclusive por duplo clique ou retentativa após conclusão), **quando** uma requisição chegar a `POST /sales/:id/payments/external`, **então** a API recusa com `422` (`"A venda não está aberta para pagamento."`) sem criar novo `Payment` nem alterar a venda; na UI, os botões de confirmação ficam desabilitados em estado de carregamento enquanto a requisição está em andamento.
- [ ] **CA6 — Dado** que o operador selecionou **Crédito externo** ou **Débito externo** e fecha a aba, recarrega a página, perde conexão de rede antes da confirmação ou troca de forma de pagamento sem confirmar aprovação na máquina, **quando** o estado da venda for consultado, **então** a venda permanece `OPEN` sem nenhum `Payment` `APPROVED` (nunca marcada como paga); em caso de falha de rede na confirmação, a UI exibe erro claro e permite repetir a ação.

## Fora de escopo

- Controle, comunicação ou integração com a máquina de cartão externa (RN11).
- Registro de NSU, código de autorização, bandeira ou comprovante do cartão externo.
- Pagamento em dinheiro ou pagamento parcial (dividir a venda entre duas formas).
- Trocar uma venda já `PENDING` (PIX) para pagamento externo (pertence à US11 — `#12`).
- Cancelamento explícito de venda (pertence à US08 — `#8`).

## Abandono no meio

Não há jornada dedicada em `docs/user-flows.md` para pagamento externo; os pontos de abandono foram mapeados a partir de RN10 e RN11:

- **O operador seleciona Crédito externo ou Débito externo, mas fecha a aba, recarrega a página ou muda de aba sem clicar em "Aprovado na máquina".** Nenhuma chamada de aprovação foi enviada ao servidor; a venda continua `OPEN` sem `Payment` aprovado (CA3, CA6).
- **A conexão cai durante o clique em "Aprovado na máquina" ou "Não aprovado na máquina".** Os botões ficam desabilitados durante o envio para evitar cliques repetidos; se a requisição falhar antes de concluir no servidor, a UI exibe o erro e mantém os controles disponíveis para nova tentativa; se já tiver sido concluída no servidor, a segunda tentativa recebe `422` sem duplicar pagamento (CA5, CA6).
- **O pagamento é recusado na maquininha e o operador escolhe tentar novamente ou trocar para PIX / Cartão / Crédito do cliente.** A tentativa recusada fica registrada como `Payment` `DECLINED` e a venda permanece `OPEN`, pronta para outra forma de pagamento (CA2).

## Assume que

| Premissa | Issue que fecha |
| --- | --- |
| *(nenhuma — o schema Prisma já possui `EXTERNAL_CREDIT`, `EXTERNAL_DEBIT`, `APPROVED` e `DECLINED`, e a venda `OPEN` já é criada pelo fluxo do caixa)* | — |

## Depende de

- `#3` (US06 — Pagar via PIX / estrutura de `Sale` e `Payment`), já implementada na `main`.
- `#4` (US03 — Montar venda no simulador de caixa), já implementada na `main`.

## Dúvidas em aberto

| # | Dúvida | Quem responde |
| --- | --- | --- |
