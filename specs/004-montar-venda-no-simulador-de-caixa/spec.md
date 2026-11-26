---
issue: 4
status: aprovada
---

# US03 — Montar venda no simulador de caixa

## O problema

Hoje o simulador de caixa (`apps/web/src/app/features/checkout`) exibe apenas uma lista simplificada de todos os produtos cadastrados com botão "Adicionar" (provisória da US06, marcada com `TODO #4`). O operador de caixa ainda não consegue localizar e incluir produtos pelo código de barras, usando leitor de código de barras (entrada + Enter) ou buscando pelo nome na API, nem visualizar o layout do PDV do protótipo (`caixa.html` e `busca.html`).

## A história

**Como** operador de caixa, **eu quero** localizar e adicionar produtos à venda usando código de barras, busca por nome ou leitor de código de barras **para que** eu consiga registrar a compra sem depender de uma única forma de entrada.

## Critérios de aceite

- [ ] **CA1 — Dado** um produto ativo cadastrado no catálogo, **quando** o operador informar seu código de barras no campo de entrada do caixa e clicar em "Adicionar", **então** a API (`GET /products/barcode/:barcode`) localiza o único produto ativo correspondente (`200`), adiciona o produto ao carrinho da venda (ou soma +1 se o produto já estiver no carrinho), atualiza o subtotal/total e limpa o campo de código de barras pronto para a próxima leitura.
- [ ] **CA2 — Dado** que um leitor de código de barras USB envia um código existente seguido da tecla `Enter` no campo de código de barras, **quando** o sistema receber a leitura (`keydown.enter`), **então** o produto correspondente é localizado via `GET /products/barcode/:barcode` e adicionado à venda automaticamente, mantendo o foco no campo de código de barras.
- [ ] **CA3 — Dado** que existem produtos ativos cadastrados com determinado nome, **quando** o operador abrir o modal "Buscar produto por nome" e pesquisar pelo nome (`GET /products?search=<termo>`), **então** o sistema apresenta os produtos ativos encontrados (nome, EAN-13 e preço unitário) para seleção e, ao selecionar um produto, ele é adicionado à venda.
- [ ] **CA4 — Dado** que o código de barras informado ou lido não corresponde a um produto ativo cadastrado (inexistente ou desativado), **quando** a inclusão for tentada, **então** a API responde `404` com a mensagem "Produto não localizado.", nenhum item é adicionado à venda e o operador vê o alerta de erro na tela.
- [ ] **CA5 — Dado** que uma pesquisa por nome no modal de busca não encontra resultados, **quando** o operador realizar a busca, **então** a venda permanece sem alteração e o modal informa "Nenhum produto encontrado.".
- [ ] **CA6 — Dado** que o operador está montando a venda no simulador de caixa, **quando** ele visualizar a tela, **então** o PDV segue o layout do protótipo (`caixa.html` e `busca.html`, usando tokens de `styles.css`): cabeçalho do terminal, card de Entrada de Produtos (campo EAN-13 com atalho `F4`, botão `Adicionar`, botão `Buscar por nome`), tabela `Produtos no Carrinho` (com remoção de item e `Limpar lista`), painel `Resumo da Venda` com `TOTAL A PAGAR` e botão `Prosseguir para pagamento` preservando integralmente o fluxo de pagamento da US06.
- [ ] **CA7 — Dado** um gerente conectado ou requisição sem token/token inválido, **quando** chamar `GET /products/barcode/:barcode`, **então** sem token/token inválido o `JwtAuthGuard` recusa com `401`, e `MANAGER` recebe `403` (RN13 — operação exclusiva do caixa). Em `GET /products?search=<termo>`, `OPERATOR` recebe apenas produtos ativos filtrados por nome (case-insensitive) e `MANAGER` mantém acesso ao catálogo.
- [ ] **CA8 — Dado** que a sessão do operador expirou (`401`) ou que a API está indisponível (falha de rede) ao buscar por código de barras ou por nome, **quando** a requisição falhar, **então** em `401` o `authInterceptor` encerra a sessão levando ao `/login`; em falha de rede, a tela exibe "Não foi possível conectar. Tente novamente." sem alterar o carrinho.
- [ ] **CA9 — Dado** que o operador fecha o modal de busca (`Esc` ou botão fechar) sem selecionar produto, ou limpa o carrinho antes de prosseguir para pagamento, **quando** a ação é cancelada, **então** nenhuma venda é criada no servidor e o carrinho reflete apenas os itens mantidos.

## Fora de escopo

- Definir quantidade prévia (> 1) antes de inserir o produto (coberto pela US04, Issue `#5`; na US03 toda inclusão adiciona 1 unidade).
- Identificar cliente e pagar com crédito do cliente (coberto pela US05, Issue `#7`).
- Registrar pagamento externo de crédito/débito (coberto pela US07, Issue `#6`).
- Concluir/cancelar venda com persistência de status `CANCELED` (coberto pela US08, Issue `#8`).

## Abandono no meio

Não há jornada dedicada para a montagem isolada em `docs/user-flows.md`; os pontos de abandono foram levantados a partir das regras RN05, RN06 e RN13:

- **O operador abre o modal de busca e aperta `Esc` ou fecha sem selecionar.** O carrinho permanece inalterado e nenhuma requisição de venda é enviada (CA9).
- **A sessão do operador expira durante a busca por código ou nome.** A API responde `401`, o `authInterceptor` limpa a sessão e redireciona para `/login` sem alterar o servidor (CA8).
- **A rede cai durante a leitura de um código de barras ou pesquisa.** O carrinho permanece intacto e a tela informa `"Não foi possível conectar. Tente novamente."` (CA8).
- **Código não encontrado ou produto desativado.** A API responde `404`, o carrinho não muda e o operador é avisado para continuar o atendimento (CA4).

## Assume que

| Premissa | Issue que fecha |
| --- | --- |
| A inclusão por código de barras, leitor ou busca por nome adiciona 1 unidade por padrão até a entrada do seletor de quantidade prévia | `#5` (US04) |
| A identificação de cliente no painel lateral do caixa e o pagamento por crédito entram na história de crédito do cliente | `#7` (US05) |
| O cancelamento formal de venda (`Cancelar venda [F8]`) entra na história de conclusão/cancelamento de venda | `#8` (US08) |

## Depende de

- `#1` (US01 — Cadastrar produto) e `#3` (US06 — Pagar via PIX / Cartão), já implementadas na `main`.

## Dúvidas em aberto

| # | Dúvida | Quem responde |
| --- | --- | --- |
