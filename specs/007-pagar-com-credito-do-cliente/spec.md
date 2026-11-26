---
issue: 7
status: aprovada
---

# US05 — Pagar com crédito do cliente

## O problema

Hoje o gerente já consegue cadastrar clientes e adicionar crédito (US02 e US12), mas o operador de caixa ainda não consegue identificar um cliente na venda nem usar o saldo de crédito do cliente como forma de pagamento (`// TODO #7`). O simulador de caixa oferece apenas Cartão de crédito e PIX via gateway.

## A história

**Como** operador de caixa, **eu quero** usar o crédito de um cliente para pagar a venda **para que** o valor da compra seja descontado do saldo cadastrado.

## Critérios de aceite

- [ ] **CA1 — Dado** um cliente cadastrado com saldo de crédito igual ou superior ao total da venda (`balanceCents >= sale.totalCents`), **quando** o operador identificar o cliente no caixa (`Cliente da Venda [F3]`), prosseguir para pagamento e confirmar o pagamento por **Crédito do cliente** (`POST /sales/:id/payments/credit`), **então** dentro de uma mesma `prisma.$transaction` o servidor debita atomicamente o saldo via `updateMany` condicional (`balanceCents >= totalCents`), registra `Payment` (`CUSTOMER_CREDIT`, `APPROVED`), registra `CreditTransaction` (`SALE_DEBIT`), marca `Sale` como `COMPLETED`, devolve `201` com o novo saldo e a tela exibe a venda concluída com o saldo atualizado (RN03, RN08, RN10).
- [ ] **CA2 — Dado** um cliente cadastrado cujo saldo de crédito é inferior ao total da venda (`balanceCents < sale.totalCents`), **quando** o operador selecionar **Crédito do cliente** na tela, **então** o sistema exibe `"Saldo insuficiente — o saldo não será alterado"` e bloqueia a confirmação; se a requisição chegar diretamente à API `POST /sales/:id/payments/credit`, ela recusa com `422` (`"Saldo insuficiente."`), mantém a venda em `OPEN` e não altera o saldo do cliente (RN03, RN09).
- [ ] **CA3 — Dado** que nenhum cliente foi identificado na venda, **quando** o operador selecionar **Crédito do cliente** na tela de pagamento, **então** o sistema não conclui o pagamento e solicita a identificação do cliente (`"Selecione um cliente para pagar com crédito."`); se `POST /sales/:id/payments/credit` for chamado sem cliente vinculado na venda, a API recusa com `422` (`"Selecione um cliente para pagar com crédito."`) (RN04).
- [ ] **CA4 — Dado** que a venda ainda não possui produtos no carrinho, **quando** o operador tentar prosseguir para pagamento, **então** o botão permanece desabilitado impedindo a conclusão; na API, `POST /sales` continua recusando lista vazia com `400` e `POST /sales/:id/payments/credit` recusa venda que não esteja em `OPEN` com `422`.
- [ ] **CA5 — Dado** que o operador está montando a venda no caixa, **quando** clicar em "Identificar cliente [F3]" (ou pressionar `F3`), **então** abre o modal de seleção de cliente listando clientes de `GET /customers` com filtro por nome/CPF; ao selecionar, o card lateral exibe nome, CPF e saldo em destaque verde (fiel a `caixa.html`), e `POST /sales` envia o `customerId` opcional vinculando o cliente à venda.
- [ ] **CA6 — Dado** um gerente conectado, outro operador que não é dono da venda, ou requisição sem token/token inválido, **quando** chamar `POST /sales/:id/payments/credit`, **então** sem token/inválido recebe `401`, `MANAGER` recebe `403`, outro `OPERATOR` recebe `403`, e `id` de venda inexistente recebe `404` (RN13).
- [ ] **CA7 — Dado** que a sessão do operador expira (`401`) ou ocorre falha de rede ao carregar clientes ou debitar crédito, **quando** a requisição falhar, **então** em `401` o `authInterceptor` limpa a sessão e redireciona para `/login`; em falha de rede, a tela exibe `"Não foi possível conectar. Tente novamente."`, mantém a venda em `OPEN` e retira o botão do estado de carregamento.
- [ ] **CA8 — Dado** que o operador fecha o modal de seleção de cliente sem escolher ou troca de forma de pagamento antes de confirmar o débito, **quando** a ação é abandonada, **então** nenhum débito é feito e o saldo do cliente permanece inalterado.

## Fora de escopo

- Pagamento parcial / combinado (parte em crédito do cliente e parte em PIX ou cartão).
- Cadastro de novos clientes ou recarga de crédito diretamente pelo operador no caixa (funções exclusivas do gerente — RN13).
- Estorno de crédito após venda concluída (RN18).

## Abandono no meio

Não há jornada dedicada para crédito do cliente em `docs/user-flows.md`; os pontos de abandono foram levantados a partir de RN03, RN04, RN09 e ID8:

- **O operador fecha o modal de identificação de cliente sem selecionar.** A venda segue sem cliente identificado e nenhuma alteração é feita (CA8).
- **Duas vendas concorrentes tentam debitar o mesmo saldo ao mesmo tempo.** O `updateMany` condicional (`where: { id, balanceCents: { gte: totalCents } }`) dentro da `prisma.$transaction` garante que apenas uma conclui e a outra recebe `422`, sem jamais deixar o saldo negativo (CA1, CA2, ID8).
- **A sessão expira ou a rede cai ao confirmar o débito.** Em `401` o interceptor encerra a sessão; em erro de rede o botão sai do estado carregando e a tela exibe erro de conexão (CA7).

## Assume que

| Premissa | Issue que fecha |
| --- | --- |
| *(nenhuma — esta história fecha a premissa `#7` deixada pela US02 `#2` e pela US03 `#4`)* | — |

## Depende de

- `#2` (US02 — Cadastrar cliente com crédito), `#13` (US12 — Adicionar crédito) e `#4` (US03 — Montar venda no caixa), já implementadas na `main`.

## Dúvidas em aberto

| # | Dúvida | Quem responde |
| --- | --- | --- |
