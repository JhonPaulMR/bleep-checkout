---
issue: 11
status: aprovada
---

# US10 — Cadastrar operador

## O problema

Hoje o único operador que consegue entrar no sistema foi inserido manualmente pelo seed do banco de dados. Um gerente não consegue criar novos acessos de operador de caixa pela aplicação, nem existe ainda proteção de papéis no backend (`RolesGuard`) para impedir que um operador chame rotas administrativas diretamente pela API.

## A história

**Como** gerente, **eu quero** cadastrar operadores de caixa **para que** cada operador entre no sistema com o próprio acesso.

## Critérios de aceite

- [ ] **CA1 — Dado** um gerente conectado e dados válidos (nome, e-mail único e senha com pelo menos 8 caracteres), **quando** o gerente cadastrar um operador, **então** o sistema grava o operador com senha em hash (`argon2`) e papel fixado no servidor como `OPERATOR` (ignorando/rejeitando qualquer papel enviado no corpo), devolve `201` sem `passwordHash`, exibe o operador na lista da tela e permite que ele entre imediatamente pelo login com o papel de operador de caixa.
- [ ] **CA2 — Dado** que o e-mail informado já pertence a outro usuário (gerente ou operador), **quando** o gerente tentar concluir o cadastro, **então** a API recusa com `409` e a mensagem "Já existe um usuário com este e-mail.", nenhum usuário duplicado é criado e a tela mantém os campos preenchidos para correção.
- [ ] **CA3 — Dado** nome vazio, e-mail vazio ou em formato inválido, ou senha com menos de 8 caracteres, **quando** o gerente tentar concluir o cadastro, **então** o envio é bloqueado na tela com a mensagem correspondente no campo; se a mesma entrada (ou um campo extra não permitido, como `role`) chegar diretamente à API, ela é recusada com `400`.
- [ ] **CA4 — Dado** um operador de caixa conectado, **quando** ele tentar acessar as rotas de cadastro ou listagem de operadores na API (`POST /users`, `GET /users`), **então** o `RolesGuard` recusa com `403`; na interface, o menu do operador não exibe **Operadores** e tentar abrir `/operadores` pelo endereço redireciona para `/caixa`.
- [ ] **CA5 — Dado** uma requisição sem token ou com token inválido, adulterado ou expirado para as rotas de usuários (`POST /users`, `GET /users`, `GET /users/:id`), **então** o `JwtAuthGuard` recusa com `401`.
- [ ] **CA6 — Dado** a relação `1:N` entre quem cadastra e os operadores cadastrados (`User.createdById`), **quando** uma pessoa autenticada consultar um usuário por id (`GET /users/:id`), **então** o acesso é permitido apenas ao próprio usuário (`req.user.sub === id`) ou ao gerente que cadastrou aquele operador (`user.createdById === req.user.sub`), retornando `200` sem `passwordHash`; qualquer outro usuário autenticado recebe `403`.
- [ ] **CA7 — Dado** que ainda não existem operadores cadastrados, **quando** o gerente abrir a tela de Operadores, **então** o sistema informa que nenhum operador foi cadastrado ainda e mantém o formulário de cadastro disponível.
- [ ] **CA8 — Dado** um gerente conectado cuja sessão expirou antes de enviar o cadastro, **quando** ele tentar cadastrar um operador, **então** a API responde `401`, nenhum operador é criado, a sessão local é limpa pelo interceptor e ele é levado à tela de login com a mensagem de sessão expirada.
- [ ] **CA9 — Dado** que a API não responde (rede caída ou servidor fora do ar), **quando** o gerente tentar cadastrar um operador ou carregar a lista, **então** a tela exibe "Não foi possível conectar. Tente novamente.", mantém os dados digitados no formulário e retira o botão do estado de carregamento.

## Fora de escopo

- Edição, desativação ou exclusão de operadores cadastrados.
- Cadastro de novos gerentes pelo sistema (o gerente inicial nasce pelo seed/banco).
- Troca ou redefinição de senha do operador.
- Busca, filtros ou paginação na listagem de operadores.

## Abandono no meio

Não há jornada desta história no `docs/user-flows.md`; os pontos de desistência foram levantados na entrevista.

**O gerente fecha a aba antes de enviar o formulário.** Nenhum dado parcial é salvo no servidor; ao entrar novamente, a lista reflete apenas os operadores efetivamente cadastrados.

**A sessão do gerente expira enquanto ele preenche o formulário.** Ao clicar em cadastrar, a API responde `401`, nenhum operador é gravado e o interceptor global encerra a sessão local levando à tela de entrada (CA8).

**A rede cai ou a API fica indisponível.** O botão não fica travado em carregamento nem os dados digitados se perdem; a tela avisa que não foi possível conectar e permite tentar de novo (CA9).

**O e-mail já pertence a outra pessoa.** A API retorna `409` e a tela mostra o erro sem apagar o formulário, permitindo corrigir apenas o e-mail (CA2).

## Assume que

| Premissa | Issue que fecha |
| --- | --- |
| *(nenhuma — esta história fecha a premissa de cadastro de operadores deixada pela US09 `#10`)* | — |

## Depende de

- `#10` (US09 — Entrar no sistema), já implementada na `main`.

## Dúvidas em aberto

| # | Dúvida | Quem responde |
| --- | --- | --- |
