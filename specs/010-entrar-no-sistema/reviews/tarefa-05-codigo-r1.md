# Parecer de Código — Tarefa 5 (rodada de revisão 1)

**Veredito:** APONTAMENTOS

**Execução**
- `npm test -w apps/api`: 3 arquivos, 10 testes, todos passam. Isso inclui o `jwt-auth.guard.spec.ts` novo.
- `npm run lint -w apps/api`: sem nenhum aviso.
- `npm run test:e2e`: NÃO consegui validar. As duas suítes falharam no `beforeAll` com `ECONNREFUSED` no `prisma db seed`, ou seja, o Postgres não estava acessível neste ambiente. Os 14 testes e2e ficaram "skipped". Os testes e2e novos de `/auth/me` não foram executados por mim, só lidos. Peço que o fluxo rode o e2e com `docker compose up -d` antes de dar a tarefa como verde.

## Apontamentos (bloqueiam)
1. **O controller decide uma regra de negócio e monta o perfil, e pula o `AuthService`.** — `apps/api/src/modules/auth/auth.controller.ts:30-37`
   - O `me()` chama `UsersService.findById` direto. Ele também decide que "usuário inexistente" vira `UnauthorizedException` e monta `{ name, role }` à mão.
   - Regra violada: `architecture.md` §2.1, ID6: "`Controller` só recebe e responde (HTTP) → `Service` tem a regra de negócio".
   - O formato `{ name: user.name, role: user.role }` já existe no `AuthService.login` (`auth.service.ts:~30`), então a mesma regra mora em dois lugares.
   - Prejuízo concreto: a regra de "sessão válida de usuário que ainda existe" fica sem teste de unidade, porque só o e2e a exercita. Quando um critério mudar (por exemplo, usuário desativado), alguém tem de lembrar de editar o controller e o `login` separadamente, e os dois formatos podem divergir. A solução natural é um `AuthService.me(userId)` que concentre a busca, o 401 e o formato do perfil. O `login` pode reaproveitar o mesmo formato.

## Sugestões (não bloqueiam)
- A mensagem `'Sessão inválida ou expirada.'` está escrita 3 vezes (duas no guard, uma no controller). Uma constante evita divergência.
- `@Req() request: { user: JwtPayload }` funciona. Quando outras rotas precisarem do usuário logado, vale um decorator `@CurrentUser()` em `common/decorators/`. Hoje há um só uso, então não criar ainda está correto.
- `RequestWithUser` e `JwtPayload` foram definidos dentro do guard. Está bom para um uso, mas o controller já importa o tipo do arquivo do guard (acoplamento leve). Se o `RolesGuard` entrar depois, mova os tipos para `common/`.
- Não há teste de unidade para o caso "token com `Bearer` e sem valor" (`'Bearer '`). O caminho existe em `extractToken`, mas não é essencial.

## Observações fora do escopo deste diff
- O `AuthModule` agora exporta o `JwtModule` para que o `APP_GUARD` do `AppModule` resolva o `JwtService`. Isso funciona. Quando o `RolesGuard` ou outros módulos precisarem do JWT, avalie um módulo `common` próprio, para o guard global não depender do `AuthModule`.
- O Postgres local precisa estar de pé para o e2e. Vale conferir se o CI (ID18) já sobe o Postgres como *service*.

Conformidade com o resto do `architecture.md`, sem apontamento:
- ID9: o `JwtAuthGuard` é global (`APP_GUARD`), liberado por `@Public()`, e o `/auth/me` declara `@ApiBearerAuth()`.
- ID10: o sucesso sai envelopado em `{ data }` e o 401 sai com `statusCode`, `error`, `message`, `path` e `timestamp`, o que os e2e verificam.
- O `passwordHash` não vaza.
- Nenhum segredo está escrito no código. O `JWT_SECRET` vem do ambiente.
- `RolesGuard` ficou de fora, como o plano decidiu.
