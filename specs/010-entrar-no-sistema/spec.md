---
issue: 10
status: aprovada   # rascunho | aprovada
---

# US09 — Entrar no sistema

## O problema

Hoje qualquer pessoa diante do caixa usaria o sistema inteiro: o operador poderia mexer em preços e créditos, e o gerente poderia registrar vendas. Sem saber quem está usando, o sistema não consegue cumprir a separação entre quem cadastra e quem vende (RN13), e nenhuma das outras histórias consegue dizer "só o gerente pode" ou "só o operador pode".

## A história

**Como** gerente ou operador de caixa, **eu quero** entrar no sistema com o meu acesso **para que** eu use somente as funções do meu papel.

## Critérios de aceite

- [ ] **CA1 — Dado** um acesso válido (e-mail e senha corretos), **quando** a pessoa entrar no sistema, **então** ela é levada à área do seu papel — o gerente à área de **Cadastros**, o operador à área do **Caixa** — e o menu mostra apenas a área desse papel.
- [ ] **CA2 — Dado** um e-mail que não pertence a nenhum acesso, ou um e-mail existente com a senha errada, **quando** a pessoa tentar entrar, **então** a entrada é recusada com a mesma mensagem "E-mail ou senha inválidos." nos dois casos, e ela continua na tela de entrada com o e-mail preenchido.
- [ ] **CA3 — Dado** o e-mail ou a senha em branco, ou um e-mail em formato inválido, **quando** a pessoa tentar entrar, **então** a entrada não é enviada e o campo com problema mostra a mensagem correspondente ("Informe o e-mail", "Informe a senha" ou "E-mail inválido"); se a mesma entrada chegar à API por fora da tela, ela é recusada como dado inválido.
- [ ] **CA4 — Dado** um operador de caixa conectado, **quando** ele tentar abrir a área de Cadastros (pelo endereço), **então** o acesso é impedido e ele volta para a área do Caixa.
- [ ] **CA5 — Dado** um gerente conectado, **quando** ele tentar abrir a área do Caixa (pelo endereço), **então** o acesso é impedido e ele volta para a área de Cadastros.
- [ ] **CA6 — Dado** uma pessoa conectada que ficou 30 minutos sem usar o sistema, **quando** ela tentar a próxima ação, **então** a sessão está encerrada, ela é levada à tela de entrada com a mensagem "Sua sessão expirou. Entre novamente." e nenhuma ação é feita com a sessão vencida; enquanto houver uso dentro desse intervalo, a sessão não expira.
- [ ] **CA7 — Dado** uma pessoa conectada, **quando** ela fechar a aba ou o navegador e abrir o sistema de novo, **então** a sessão anterior não existe mais e o sistema pede a entrada outra vez.
- [ ] **CA8 — Dado** que a API não responde (rede caída ou servidor fora do ar), **quando** a pessoa tentar entrar, **então** aparece "Não foi possível conectar. Tente novamente.", ela continua na tela de entrada com o e-mail preenchido e o botão de entrar sai do estado de carregamento.

## Fora de escopo

- Botão "Sair": fechar a aba encerra a sessão (CA7).
- Bloqueio do acesso depois de várias tentativas erradas.
- "Esqueci minha senha" e troca de senha.
- Cadastro de pessoas: os operadores são cadastrados na US10 (#11); o gerente não é cadastrado pelo sistema.
- O conteúdo das áreas de Cadastros e do Caixa: nesta história elas são páginas vazias, que existem só para receber cada papel.
- Sessão contínua acima de 12 horas: passado esse limite, mesmo em uso, é preciso entrar de novo.

## Abandono no meio

Não há jornada desta história no `docs/user-flows.md`; os pontos de desistência foram levantados na entrevista.

**A pessoa para de usar o caixa e se afasta.** Um caixa aberto e sem ninguém é a porta para outra pessoa agir com o papel de quem saiu. Por isso a sessão termina depois de 30 minutos sem uso, e a próxima ação depois disso leva à tela de entrada sem executar nada (CA6). Quem está trabalhando não é interrompido: o prazo só corre enquanto não há uso.

**A pessoa fecha a aba ou o navegador.** Numa máquina de caixa compartilhada, fechar o navegador precisa valer como sair; caso contrário, a próxima pessoa abriria o sistema já conectada com o acesso de outra. Fechar encerra a sessão (CA7) — e é por isso que o botão "Sair" pôde ficar fora de escopo.

**A rede cai ou a API não responde na hora de entrar.** A pessoa não pode ficar olhando para um botão girando para sempre, nem perder o que digitou. A tela avisa que não conseguiu conectar, devolve o botão e mantém o e-mail (CA8).

**A pessoa erra o acesso.** A mensagem não pode dizer se o erro foi no e-mail ou na senha, para não revelar quais e-mails existem (CA2).

## Assume que

| Premissa | Issue que fecha | Onde vai o `// TODO` |
| --- | --- | --- |
| O gerente e o operador que conseguem entrar são criados por um seed com dados de teste; ainda não existe tela para cadastrar operadores. | #11 (US10 — Cadastrar operador) | no seed do banco, junto à criação do operador inicial |
| A área de Cadastros do gerente é uma página vazia; nenhuma função do gerente existe ainda. | #1 (US01 — Cadastrar produto) | na página da área de Cadastros |
| A área do Caixa do operador é uma página vazia; nenhuma função do caixa existe ainda. | #4 (US03 — Montar venda no simulador de caixa) | na página da área do Caixa |

## Dúvidas em aberto

| # | Dúvida | Quem responde |
| --- | --- | --- |
