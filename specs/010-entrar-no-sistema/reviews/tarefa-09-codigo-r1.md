# Parecer de Código — Tarefa 9

**Veredito:** APROVADO

Verificações: testes 24/24 passando (7 arquivos), lint limpo, build ok.

## Apontamentos (bloqueiam)
Nenhum. O diff está de acordo com o architecture.md (linha 146: guards `canMatch` separam as rotas por papel; linha 130: guards de rota por papel ficam em `core/auth`). Não há segredo no código, não há erro engolido e a regra de mapeamento papel→área não está duplicada. O `AREA_BY_ROLE` que existia em `login.page.ts` foi movido para o guard e passou a ser importado de lá.

## Sugestões (não bloqueiam)
- `apps/web/src/app/features/login/pages/login.page.ts`: a página de login importa `AREA_BY_ROLE` de `role.guard.ts`. Funciona e evita duplicar a regra. Se o mapa ganhar outros usos, como o menu do cabeçalho por papel, vale movê-lo para `auth.service.ts` ou para um arquivo próprio em `core/auth`.
- `apps/web/src/app/core/auth/role.guard.spec.ts`: os testes chamam o guard com `{} as Route` e outros argumentos vazios. Isso funciona porque o guard ignora os argumentos. Se ele passar a ler a rota, o teste quebra. Um teste de integração com `provideRouter` e `navigate` cobriria o desvio de ponta a ponta. Hoje o teste cobre CA4 e CA5 só no nível do guard.
- `apps/web/src/app/app.routes.ts`: as rotas da API que o 401 limpa e leva ao login não fazem parte desta tarefa. Nada a fazer aqui.

## Observações fora do escopo deste diff
- O `canMatch` sozinho não reage a mudança de sessão com a tela já aberta, por exemplo logout em outra aba. A rota só é reavaliada na próxima navegação. É um comportamento esperado do `canMatch`. Se o PRD exigir reação imediata, vira Issue.
- Quando o guard desvia para a área correta e o rota `**` cai em `login`, rotas desconhecidas sempre vão ao login, mesmo com sessão ativa. É um comportamento pré-existente e não foi tocado por este diff.
