---
issue: 1
status: aprovada
---

# US01 — Cadastrar produto

## O problema

Hoje os produtos exibidos no simulador de caixa existem apenas porque foram inseridos manualmente no banco (seed). A tela de cadastros do gerente ainda é um placeholder vazio, sem formulário nem listagem de produtos, e a API não possui endpoint para o gerente cadastrar novos itens no catálogo.

## A história

**Como** gerente, **eu quero** cadastrar um produto com suas informações comerciais **para que** ele possa ser encontrado e vendido no simulador de caixa.

## Critérios de aceite

- [ ] **CA1 — Dado** um gerente conectado e dados válidos (nome não vazio, código de barras EAN-13 com exatamente 13 dígitos numéricos e único, e preço unitário em centavos maior que zero), **quando** o gerente concluir o cadastro (`POST /products`), **então** o sistema persiste o produto com `active: true`, devolve `201`, exibe o novo produto na tabela da tela de Produtos (seguindo o layout do protótipo `produtos.html`: cabeçalho com menu do papel, cards de resumo, barra de busca por nome/código, tabela de produtos e modal "+ Novo Produto") e o torna imediatamente disponível na listagem do caixa (`GET /products`).
- [ ] **CA2 — Dado** que o código de barras informado já pertence a outro produto cadastrado, **quando** o gerente tentar concluir o cadastro, **então** a API recusa com `409` e a mensagem "Já existe um produto com este código de barras.", nenhum produto duplicado é criado, e o formulário na tela destaca o campo de código de barras em estado de erro (`perigo`) mantendo os dados preenchidos para correção.
- [ ] **CA3 — Dado** nome vazio ou apenas espaços, código de barras ausente ou diferente de 13 dígitos numéricos, ou preço unitário ausente, zero ou negativo, **quando** o gerente tentar salvar o produto no formulário, **então** o envio é bloqueado na tela com a mensagem correspondente junto ao campo inválido; se a mesma entrada inválida (ou campo extra não permitido, como `active`) chegar diretamente à API `POST /products`, ela é recusada com `400`.
- [ ] **CA4 — Dado** um operador de caixa conectado, **quando** ele tentar cadastrar um produto pela API (`POST /products`), **então** o `RolesGuard` recusa com `403`; na interface, o menu do operador não exibe **Produtos** e tentar abrir a rota de produtos pelo endereço redireciona para `/caixa`. A listagem `GET /products` permanece acessível para `OPERATOR` (retornando produtos ativos) e passa a ser acessível também para `MANAGER`.
- [ ] **CA5 — Dado** uma requisição sem token ou com token inválido, adulterado ou expirado para `POST /products` ou `GET /products`, **então** o `JwtAuthGuard` recusa com `401`.
- [ ] **CA6 — Dado** que ainda não existem produtos cadastrados (ou que a pesquisa local por nome/código na tabela não encontra resultados), **quando** o gerente visualizar a tela de Produtos, **então** o sistema informa claramente que nenhum produto foi encontrado e mantém o botão "+ Novo Produto" disponível.
- [ ] **CA7 — Dado** um gerente conectado cuja sessão expirou enquanto preenchia o modal de cadastro, **quando** ele clicar em "Salvar Produto", **então** a API responde `401`, nenhum produto é criado, o interceptor limpa a sessão local e redireciona para `/login` com a mensagem de sessão expirada.
- [ ] **CA8 — Dado** que a API não responde (rede caída ou servidor fora do ar) ao listar ou cadastrar um produto, **quando** a requisição falhar, **então** a tela exibe "Não foi possível conectar. Tente novamente.", mantém os dados preenchidos no formulário e retira o botão do estado de carregamento.
- [ ] **CA9 — Dado** que o gerente cancela o modal ou fecha a aba antes de concluir o envio do formulário, **quando** o cadastro é abandonado, **então** nenhum registro parcial é salvo no banco e o produto não fica disponível para venda no caixa (RN02).

## Fora de escopo

- Edição e desativação de produtos cadastrados (cobertos pela US13, Issue `#14`; na tabela de Produtos da US01, os botões de ação não executam alteração de produto).
- Busca por código de barras / leitor no simulador de caixa (coberta pela US03, Issue `#4`).
- Controle de estoque, categorias, imagens de produto ou preços promocionais.
- Paginação no servidor na listagem de produtos.

## Abandono no meio

Não há jornada dedicada para esta história em `docs/user-flows.md`; os pontos de abandono foram levantados a partir das regras RN01, RN02 e RN13:

- **O gerente fecha o modal ou a aba antes de clicar em "Salvar Produto".** Nenhuma requisição é enviada e nenhum dado parcial é persistido; o produto só existe para o caixa depois de um cadastro válido concluído (CA9, RN02).
- **A sessão do gerente expira durante o preenchimento do modal.** Ao enviar, a API retorna `401`, nada é salvo e o interceptor global encerra a sessão levando ao login (CA7).
- **A rede cai ou o servidor fica indisponível.** O botão sai do estado de carregamento, o formulário preserva o que foi digitado e o gerente pode tentar novamente (CA8).
- **O código de barras já pertence a outro produto.** A API devolve `409` sem criar duplicata e o modal preserva os campos para que o gerente corrija o código (CA2).

## Assume que

| Premissa | Issue que fecha |
| --- | --- |
| Os botões de Editar e Desativar na tabela de produtos ficam desabilitados/inativos até a implementação da edição e desativação | `#14` (US13) |

## Depende de

- `#10` (US09 — Entrar no sistema) e `#11` (US10 — Cadastrar operador, `RolesGuard`), já implementadas na `main`.

## Dúvidas em aberto

| # | Dúvida | Quem responde |
| --- | --- | --- |
