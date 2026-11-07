# Parecer de Código — Tarefa 7

**Veredito:** APROVADO

Verificação: `npm run test -w apps/web -- --watch=false` passou (17 testes em 6 arquivos). `npm run lint -w apps/web` passou. Não rodei `npm run build`. O diff está em `login.page.ts`, `login.page.html` e `login.page.spec.ts`.

## Apontamentos (bloqueiam)
Nenhum. O diff segue os padrões do front em `docs/architecture.md`:
- estado em signals (`computed`, `submitted`);
- `@if` no lugar de `*ngIf`;
- sem `standalone: true`;
- a mudança fica só em `features/login/pages/`;
- a página não acessa HTTP diretamente, e o `LoginService` segue como único ponto de contato com a API;
- não há segredo, URL de ambiente nem hex solto;
- `text-perigo` usa o token de papel, como a arquitetura pede.

Os testes verificam o texto exibido e a ausência de requisição (`expectNone`). Não dependem de detalhes internos do componente. O teste de entrada válida confirma que a requisição sai (`expectOne`), o que protege contra um bloqueio indevido.

## Sugestões (não bloqueiam)
- `login.page.ts`: `EMAIL_FORMAT` é uma regex simples e só serve ao front. O back valida com `class-validator` (ID7). As duas regras podem divergir em casos de borda, por exemplo um e-mail que o front aceita e o back recusa. O back continua sendo a fonte da verdade e devolve erro tratável, então não é bloqueio. Vale manter o comportamento de falha do back coberto pela Tarefa 4.
- `login.page.html`: as mensagens aparecem só depois do primeiro envio, por causa de `submitted()`. Isso é uma escolha de UX coerente com a tarefa. Os spans de erro não têm vínculo com o input por `aria-describedby`, só `role="alert"`. É uma melhoria de acessibilidade opcional.
- `login.page.spec.ts`: o helper `tentar` repete a montagem que `entrar` já faz nos testes anteriores (criar o fixture, preencher e submeter). A duplicação é pequena. Pode ser unificada numa refatoração futura, sem urgência.

## Observações fora do escopo deste diff
- Nenhuma que mereça Issue de manutenção.
