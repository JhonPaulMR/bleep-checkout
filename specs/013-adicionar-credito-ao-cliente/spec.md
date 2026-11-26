---
issue: 13
status: aprovada
---

# US12 — Adicionar crédito ao cliente

## O problema

Hoje um cliente só recebe crédito no momento em que é cadastrado (US02). Depois que o cliente usa seu saldo ou deseja fazer uma nova recarga, o gerente não consegue adicionar crédito à conta dele pela aplicação — o botão "+ Adicionar crédito" na tabela de Clientes está desabilitado (`// TODO #13`) e a API ainda não possui endpoint para registrar recargas de saldo.

## A história

**Como** gerente, **eu quero** adicionar crédito a um cliente já cadastrado **para que** ele possa continuar usando o crédito como forma de pagamento.

## Critérios de aceite

- [ ] **CA1 — Dado** um gerente conectado, um cliente já cadastrado e um valor positivo em centavos (`amountCents > 0`), **quando** o gerente adicionar o crédito (`POST /customers/:id/credits`), **então** o sistema incrementa atomicamente `Customer.balanceCents` exatamente nesse valor e registra uma `CreditTransaction` do tipo `TOP_UP` dentro da mesma `prisma.$transaction`, devolve `201` com o cliente atualizado, atualiza imediatamente o saldo na tabela e nos cards de resumo da tela de Clientes e fecha o modal (seguindo o protótipo `clientes.html`: saldo atual, campo de valor, prévia "Saldo após" e botão "Adicionar crédito").
- [ ] **CA2 — Dado** um valor ausente, zero (`0`), negativo (`< 0`) ou não numérico, **quando** o gerente tentar adicionar crédito pelo modal, **então** o envio é bloqueado na tela com destaque `perigo` e a mensagem "Informe um valor maior que zero. O saldo não foi alterado.", mantendo a prévia "Saldo após" como "—"; se a mesma entrada inválida (ou campo extra não permitido) chegar diretamente à API `POST /customers/:id/credits`, o `ValidationPipe` recusa com `400` e o saldo no banco permanece inalterado (RN03, RN15).
- [ ] **CA3 — Dado** um operador de caixa conectado, **quando** ele tentar chamar `POST /customers/:id/credits`, **então** o `RolesGuard` recusa com `403` e o saldo não é alterado (RN13).
- [ ] **CA4 — Dado** uma requisição sem token ou com token inválido, adulterado ou expirado para `POST /customers/:id/credits`, **então** o `JwtAuthGuard` recusa com `401`.
- [ ] **CA5 — Dado** um `id` de cliente inexistente em `POST /customers/:id/credits`, **quando** o gerente tentar adicionar crédito, **então** a API responde `404` com a mensagem "Cliente não encontrado." sem criar nenhuma `CreditTransaction`.
- [ ] **CA6 — Dado** um gerente conectado cuja sessão expirou enquanto preenchia o modal de recarga, **quando** ele clicar em "Adicionar crédito", **então** a API responde `401`, o saldo não é alterado, o interceptor limpa a sessão local e redireciona para `/login` com a mensagem de sessão expirada.
- [ ] **CA7 — Dado** que a API não responde (rede caída ou servidor fora do ar) ao enviar a recarga, **quando** a requisição falhar, **então** o modal exibe "Não foi possível conectar. Tente novamente.", mantém o valor digitado e retira o botão do estado de carregamento.
- [ ] **CA8 — Dado** que o gerente cancela o modal (botão Cancelar/fechar) ou fecha a aba antes de enviar a recarga, **quando** a operação é abandonada, **então** nenhuma requisição é enviada e o saldo do cliente permanece inalterado.

## Fora de escopo

- Extrato ou histórico visual de movimentações de crédito do cliente (explicitamente fora de escopo no PRD §6).
- Débito, estorno ou remoção manual de crédito pelo gerente.
- Edição de nome ou CPF do cliente.

## Abandono no meio

Não há jornada dedicada para esta história em `docs/user-flows.md`; os pontos de abandono foram levantados a partir das regras RN03, RN13 e RN15:

- **O gerente fecha o modal ou a aba antes de confirmar.** Nenhuma requisição é enviada e nenhuma `CreditTransaction` é criada (CA8).
- **A sessão do gerente expira durante o preenchimento.** Ao enviar, a API responde `401`, nada é gravado e o interceptor global leva ao `/login` (CA6).
- **A rede cai ou a API fica indisponível.** O botão sai do estado de carregamento, o valor digitado é preservado e o modal informa o erro de conexão (CA7).

## Assume que

| Premissa | Issue que fecha |
| --- | --- |
| *(nenhuma — esta história fecha a premissa `#13` deixada pela US02 `#2`)* | — |

## Depende de

- `#2` (US02 — Cadastrar cliente com crédito), já implementada na `main`.

## Dúvidas em aberto

| # | Dúvida | Quem responde |
| --- | --- | --- |
