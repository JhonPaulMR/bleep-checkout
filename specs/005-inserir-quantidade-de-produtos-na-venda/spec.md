---
issue: 5
status: aprovada
---

# US04 — Inserir quantidade de produtos na venda

## O problema

Hoje, no simulador de caixa (`apps/web/src/app/features/checkout`), toda inclusão por código de barras, leitor USB ou busca por nome adiciona apenas 1 unidade por vez (`// TODO #5`). Quando o cliente leva várias unidades do mesmo produto (por exemplo, 4 refrigerantes), o operador precisa bipar ou clicar quatro vezes em vez de informar a quantidade antes da inclusão.

## A história

**Como** operador de caixa, **eu quero** informar a quantidade antes de inserir um produto **para que** uma única busca, digitação de código ou leitura do produto registre várias unidades de uma vez.

## Critérios de aceite

- [ ] **CA1 — Dado** um produto ativo válido e a quantidade `4` informada no seletor "Nº de unidades [F2]" (via campo numérico ou botões `-`/`+`), **quando** o operador inserir o produto por código de barras (botão `Adicionar`), leitor USB (`Enter`) ou seleção no modal "Buscar produto por nome", **então** `4` unidades desse produto são adicionadas à venda de uma única vez, o subtotal e o total a pagar são recalculados e a quantidade volta para `1` pronta para a próxima leitura (RN06).
- [ ] **CA2 — Dado** que o produto já está presente no carrinho da venda com quantidade `4`, **quando** o operador informar novamente quantidade `4` e incluir o mesmo produto (por código, leitor ou busca por nome), **então** a quantidade daquele mesmo item passa para `8` sem criar uma segunda linha para o mesmo produto na tabela do carrinho (RN06).
- [ ] **CA3 — Dado** que o operador informou uma quantidade zero (`0`), negativa (`-2`), decimal (`1.5`) ou inválida/vazia no seletor de quantidade, **quando** ele tentar incluir um produto por código de barras, leitor ou busca por nome, **então** o sistema bloqueia a inclusão sem chamar a API nem alterar o carrinho, destaca o campo em erro (`perigo`) e exibe `"Informe uma quantidade inteira positiva."` (RN07).
- [ ] **CA4 — Dado** que o operador está no modal "Buscar produto por nome" (`busca.html`), **quando** ele ajustar a quantidade pelo controle de unidades dentro do modal (ou herdar a quantidade já configurada no caixa), **então** cada resultado exibe o total calculado para `N` unidades (`Total N un: R$ ...`) e o botão `Adicionar N un.`, adicionando exatamente `N` unidades ao selecionar.
- [ ] **CA5 — Dado** que o operador pressiona a tecla `F2` enquanto monta a venda, **quando** o atalho é acionado, **então** o foco vai diretamente para o campo de quantidade (`Nº de unidades`), seguindo o protótipo `caixa.html`.
- [ ] **CA6 — Dado** que o operador tenta criar uma venda diretamente na API (`POST /sales`) com quantidade zero, negativa ou decimal em qualquer item, **quando** a requisição chegar ao servidor, **então** o `ValidationPipe` recusa com `400` e nenhuma venda é criada (RN07).
- [ ] **CA7 — Dado** que o operador digitou uma quantidade (ex.: `4`), mas cancela o modal de busca (`Esc` ou fechar) ou recebe erro `404` / falha de rede ao bipar um código, **quando** a inclusão não acontece, **então** nenhum item é adicionado ao carrinho e a venda permanece inalterada.

## Fora de escopo

- Fracionamento / venda por peso decimal (ex.: 0,250 kg — RN07 exige inteiro positivo).
- Controle ou validação de estoque máximo disponível.
- Descontos progressivos por atacado ou quantidade.

## Abandono no meio

Não há jornada dedicada para esta história em `docs/user-flows.md`; os pontos de abandono foram levantados a partir das regras RN06 e RN07:

- **O operador altera a quantidade para `4`, mas desiste da busca (`Esc`/fechar) ou bipa um código inexistente (`404`).** Nenhum item é adicionado ao carrinho e nenhuma chamada de venda é feita (CA7).
- **O operador limpa o campo de quantidade ou digita `0`/`-1` sem perceber.** O sistema bloqueia a inclusão com mensagem clara antes de alterar o carrinho (CA3).

## Assume que

| Premissa | Issue que fecha |
| --- | --- |
| *(nenhuma — esta história fecha a premissa `#5` deixada pela US03 `#4`)* | — |

## Depende de

- `#4` (US03 — Montar venda no simulador de caixa), já implementada na `main`.

## Dúvidas em aberto

| # | Dúvida | Quem responde |
| --- | --- | --- |
