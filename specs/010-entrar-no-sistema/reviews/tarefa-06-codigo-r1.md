# Parecer de Código — Tarefa 6 (rodada 1)

**Veredito:** APONTAMENTOS

Rodei os comandos pedidos do web, e todos passam. O teste do web deu 5 arquivos e 13 testes verdes, o lint passou limpo e o build do web concluiu. Não rodei os comandos da API nem o e2e. O diff da API é só `enableCors` em `main.ts`.

## Apontamentos (bloqueiam)
1. **A URL da API está escrita no código, fixa em `http://localhost:3000`.** — `apps/web/src/app/core/config/api-url.ts:4-6`
   Regra violada: o §2.1 ID19 manda o front para a Vercel e a API para o Render, com CORS só para `WEB_ORIGIN`. O ID17 diz que valores de ambiente não ficam no código. A lista "o que reprova" do revisor inclui "URL de ambiente escrita no código".
   Prejuízo concreto: o build de produção sai apontando para `localhost` e o login quebra no ambiente publicado. Trocar a URL exige editar código e refazer o build, em vez de configurar o ambiente. O comentário "dev local" admite o problema, mas nada o resolve. Os `environment` do Angular (ou um `fileReplacements`) cumpririam o papel. Fica a seu critério decidir se isso é escopo desta tarefa ou uma Issue à parte. Se for Issue, o apontamento deve ser recusado com essa justificativa.

## Sugestões (não bloqueiam)
- `header.ts:18-19`: o template usa `menu()!` (non-null assertion) dentro de `@if (user(); as current)`. Funciona, mas só porque `menu` e `user` andam juntos. Usar `MENU_BY_ROLE[current.role]` direto, ou um `@if (menu(); as item)`, tiraria o `!`.
- `auth.service.ts:41`: `readUser` faz `JSON.parse(...) as SessionUser` sem checar o formato. Um `role` adulterado no `sessionStorage` vira `undefined` em `MENU_BY_ROLE[...]` e em `AREA_BY_ROLE[...]`. O Header quebraria com `TypeError` ao ler `.path` de `undefined`. A superfície é pequena, porque o servidor continua sendo a barreira real, mas uma checagem simples de `role` evitaria um erro de execução.
- `login.page.spec.ts:19`: o teste espia `Router.navigateByUrl`. Se a página passar a usar `router.navigate([...])`, o teste quebra sem mudança de comportamento. Verificar `router.url` com as rotas reais (como o `app.spec.ts` já faz) seria menos acoplado.
- Os `TODO #1` e `TODO #4` nas páginas vazias (`products.page.ts`, `checkout.page.ts`) citam números de Issue/US que não consegui confirmar. Vale conferir se apontam para a Issue certa, para não virarem referência morta.

## Observações fora do escopo deste diff
- As rotas `/cadastros` e `/caixa` estão abertas, sem `canMatch` por papel nem proteção sem sessão. O TODO deixa isso para a Tarefa 9. O interceptor ainda não trata 401 (limpar a sessão e ir ao Login), que o §4 prevê. Não apontei porque o plano tem tarefa própria.
- O `login.page.ts` engole o erro (`error: () => loading.set(false)`) sem mensagem ao usuário. A Tarefa 8 cobre isso, e o TODO a marca.
- A validação de campos fica para a Tarefa 7.
- O CORS aceita uma única origem (`WEB_ORIGIN`), de acordo com o ID19. Nada a apontar.
- Os tokens do `styles.css` batem com o `docs/design-tokens.md` (cores, espaçamento e tipografia conferidos).
