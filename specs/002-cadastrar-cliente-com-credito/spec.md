---
issue: 2
status: aprovada
---

# US02 — Cadastrar cliente com crédito

## O problema

Hoje o sistema não possui cadastro de clientes nem controle de saldo de crédito no banco de dados ou na interface do gerente. Sem clientes cadastrados com CPF único e saldo inicial válido, não é possível identificar compradores nem preparar o saldo para pagamento por crédito no caixa.

## A história

**Como** gerente, **eu quero** cadastrar um cliente com um saldo inicial de crédito **para que** esse saldo possa ser usado como forma de pagamento nas vendas.

## Critérios de aceite

- [ ] **CA1 — Dado** um gerente conectado e dados válidos (nome não vazio, CPF válido com 11 dígitos numéricos e único, e saldo inicial em centavos maior ou igual a zero `balanceCents >= 0`), **quando** o gerente concluir o cadastro (`POST /customers`), **então** o sistema persiste o `Customer` (e grava `CreditTransaction` do tipo `INITIAL` na mesma `prisma.$transaction` quando `balanceCents > 0`), devolve `201`, exibe o cliente na tabela da tela de Clientes (seguindo o layout do protótipo `clientes.html`: menu com **Clientes**, cards de resumo, barra de busca por nome/CPF, tabela de clientes e modal "+ Novo Cliente") e o disponibiliza na listagem de clientes (`GET /customers`).
- [ ] **CA2 — Dado** que o CPF informado já pertence a outro cliente cadastrado, **quando** o gerente tentar concluir o cadastro, **então** a API recusa com `409` e a mensagem "Já existe um cliente com este CPF.", nenhum cliente duplicado é criado, e o modal na tela destaca o campo CPF em estado de erro (`perigo`) mantendo os dados preenchidos para correção.
- [ ] **CA3 — Dado** que o saldo inicial informado é negativo (`balanceCents < 0`) ou não numérico, **quando** o gerente tentar concluir o cadastro no formulário, **então** o envio é bloqueado na tela com mensagem de erro no campo de saldo; se um saldo negativo ou inválido chegar diretamente à API `POST /customers`, ela recusa com `400` e nenhum cliente com saldo negativo é criado (RN03).
- [ ] **CA4 — Dado** nome vazio ou apenas espaços, CPF ausente ou fora do formato de 11 dígitos numéricos (aceitando entrada com pontuação `000.000.000-00` normalizada para 11 dígitos), ou campo extra não permitido no corpo da requisição, **quando** o gerente tentar cadastrar, **então** o envio é bloqueado na tela com erro por campo e a API recusa com `400` via `ValidationPipe`.
- [ ] **CA5 — Dado** um operador de caixa conectado, **quando** ele tentar cadastrar um cliente pela API (`POST /customers`), **então** o `RolesGuard` recusa com `403`; na interface, o menu do operador não exibe **Clientes** e tentar abrir `/clientes` pelo endereço redireciona para `/caixa`. A listagem `GET /customers` é acessível para `MANAGER` e `OPERATOR` (para seleção em vendas).
- [ ] **CA6 — Dado** uma requisição sem token ou com token inválido, adulterado ou expirado para `POST /customers` ou `GET /customers`, **então** o `JwtAuthGuard` recusa com `401`.
- [ ] **CA7 — Dado** que ainda não existem clientes cadastrados (ou a busca local por nome/CPF não encontra correspondência), **quando** o gerente visualizar a tela de Clientes, **então** o sistema exibe mensagem de estado vazio mantendo o botão "+ Novo Cliente" disponível.
- [ ] **CA8 — Dado** um gerente conectado cuja sessão expirou enquanto preenchia o modal de cadastro, **quando** ele clicar em "Salvar", **então** a API responde `401`, nenhum cliente é criado, o interceptor limpa a sessão local e redireciona para `/login` com a mensagem de sessão expirada.
- [ ] **CA9 — Dado** que a API não responde (rede caída ou servidor fora do ar) ao listar ou cadastrar um cliente, **quando** a requisição falhar, **então** a tela exibe "Não foi possível conectar. Tente novamente.", mantém os dados preenchidos no formulário e retira o botão do estado de carregamento.
- [ ] **CA10 — Dado** que o gerente cancela o modal ou fecha a aba antes de enviar o formulário, **quando** o cadastro é abandonado, **então** nenhuma requisição é enviada e nenhum cliente parcial é salvo no banco.

## Fora de escopo

- Adicionar crédito a um cliente já cadastrado (coberto pela US12, Issue `#13`; o botão "+ Adicionar crédito" na tabela fica desabilitado com `// TODO #13`).
- Selecionar cliente e pagar uma venda com crédito do cliente no caixa (coberto pela US05, Issue `#7`; o critério de pagamento por crédito sem cliente selecionado nasce lá).
- Edição ou exclusão de clientes cadastrados.
- Extrato de movimentações de crédito do cliente (explicitamente fora de escopo no PRD §6).

## Abandono no meio

Não há jornada dedicada para esta história em `docs/user-flows.md`; os pontos de abandono foram levantados a partir das regras RN03, RN13 e RN14:

- **O gerente fecha o modal ou a aba antes de clicar em "Salvar".** Nenhuma requisição é enviada e nenhum cliente ou transação de crédito é criada (CA10).
- **A sessão do gerente expira durante o preenchimento do modal.** Ao enviar, a API responde `401`, nada é salvo e o interceptor global encerra a sessão levando ao `/login` (CA8).
- **A rede cai ou o servidor fica indisponível.** O botão sai do estado de carregamento, os campos preenchidos permanecem intactos e a tela informa o erro de conexão (CA9).
- **O CPF já pertence a outro cliente.** A API devolve `409` sem criar duplicata e o modal preserva os dados para correção do CPF (CA2).

## Assume que

| Premissa | Issue que fecha |
| --- | --- |
| O botão "+ Adicionar crédito" na tabela de clientes fica desabilitado até a implementação da recarga de crédito | `#13` (US12) |
| A seleção de cliente no simulador de caixa e o bloqueio de pagamento por crédito sem cliente selecionado entram na história de pagamento por crédito | `#7` (US05) |

## Depende de

- `#10` (US09 — Entrar no sistema) e `#11` (US10 — Cadastrar operador, `RolesGuard`), já implementadas na `main`.

## Dúvidas em aberto

| # | Dúvida | Quem responde |
| --- | --- | --- |
