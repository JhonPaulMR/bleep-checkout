# Parecer de Código — Tarefa 6 (rodada 2)

**Veredito:** APROVADO

Rodei os comandos pedidos, a partir da raiz:
- Testes do web: 6 arquivos e 14 testes passaram.
- Lint do web: passou.
- Build do web: passou.

Os dois apontamentos aceitos na r1 foram atendidos:
- O cabeçalho (`apps/web/src/app/core/layout/header.ts`) não exibe mais o nome da pessoa. Só mostra o link da área do papel, e `header.spec.ts` confere isso.
- A URL da API saiu do código-fonte das telas e do service. Ela vem de `apps/web/src/environments/environment.ts` (dev) e `environment.production.ts`, trocados por `fileReplacements` no build de produção em `apps/web/angular.json`. O `LoginService` a recebe pelo token `API_URL` (`apps/web/src/app/core/config/api-url.ts`), coberto por `api-url.spec.ts`.

Também conferi o restante do diff contra o `docs/architecture.md`:
- **Camada de dados:** o `LoginService` em `features/login/data/` é o único que conhece URL e formato da API. Ele desembrulha o `{ data }`, e a página só consome o service (§4).
- **Dependências entre pastas:** `features/login` importa só de `core/`, e não há import entre features (§4).
- **Padrões Angular:** os componentes seguem os padrões do §2: standalone, signals, `inject()`, `@if` e lazy loading por rota.
- **Sessão (ID16):** o token e o usuário ficam só no `sessionStorage`. O teste prova que o `localStorage` fica vazio.
- **CORS:** `apps/api/src/main.ts` libera só `WEB_ORIGIN`, lido por `ConfigService.getOrThrow`. A variável já é validada no boot (`env.validation.ts`) e está no `.env.example`, conforme ID17 e ID19.
- **Testes:** os testes verificam comportamento observável (navegação, storage, links do menu), sem acoplar a detalhe de implementação.

## Apontamentos (bloqueiam)
Nenhum.

## Sugestões (não bloqueiam)
- `apps/web/src/environments/environment.production.ts` tem uma URL placeholder (`https://bleep-checkout-api.onrender.com`) e um comentário pedindo para trocá-la antes do deploy. Esse é o caminho aceito na r1 e é o lugar legítimo para a URL de ambiente. Convém conferir o valor real na tarefa de deploy, porque o placeholder pode ir para produção por esquecimento.
- `apps/web/src/app/core/auth/auth.interceptor.ts` anexa o Bearer a qualquer requisição, sem filtrar pela URL da API. Hoje só existe a API, então não há prejuízo. Se a US de pagamento chamar um host externo, o token vazaria para ele. Vale filtrar por `API_URL` quando isso surgir.
- O `name` do usuário continua guardado na sessão, mas nenhuma tela o usa agora. Não é problema, é só um campo sem consumidor no momento.

## Observações fora do escopo deste diff
- Os `TODO #10` em `app.routes.ts` e `login.page.ts` apontam para as Tarefas 8 e 9, que estão previstas no plano: guards por papel (`canMatch`), proteção sem sessão e mensagens de erro de login. Hoje `/cadastros` e `/caixa` abrem sem sessão. Isso é esperado enquanto essas tarefas não rodam, mas fica registrado.
- O interceptor ainda não trata 401 (limpar a sessão e ir ao Login, ID16). Isso também depende de tarefa posterior.
