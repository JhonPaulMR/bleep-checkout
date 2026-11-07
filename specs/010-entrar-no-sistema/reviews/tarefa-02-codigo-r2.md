# Parecer de Código — Tarefa 2 (rodada 2)

**Veredito:** APROVADO

Li `docs/architecture.md`, o diff do índice contra 830b38d e a decisão da rodada 1. Rodei `npm test`, `npm run lint` e `npm run test:e2e`. Todos passam: o e2e roda 2 arquivos e 4 testes, e o lint do web está limpo. A saída do `npm test` e do lint da API veio cortada no `tail`. Só vi o trecho do web, então não confirmei o resultado da suíte da API nesses dois comandos.

## Apontamentos (bloqueiam)
Nenhum.

O apontamento aceito na rodada 1 está corrigido. `auth.service.ts:16` agora usa `!user || !(await argon2.verify(...))` e lança `UnauthorizedException`. Isso fecha o token para qualquer senha e o 500 para e-mail inexistente. O `auth.service.spec.ts` cobre os dois casos e confere que o token não é assinado com senha errada.

Pontos que conferi e estão de acordo com a arquitetura:
- **Camadas (ID6):** o controller só delega ao `AuthService`. O acesso ao banco fica em `UsersService`, via `PrismaService`.
- **Resposta (ID10):** o `ResponseInterceptor` registrado com `APP_INTERCEPTOR` devolve `{ data }`. O hash não sai, porque o service monta `{ name, role }`.
- **Segredo (ID17):** o `JWT_SECRET` vem do `ConfigService.getOrThrow`, sem valor escrito no código.
- **Senha (ID9):** o hash é verificado com `argon2`.
- **Duplicação e abstração:** não encontrei duplicação nem abstração para um caso só.
- **Testes:** os unitários usam mock do `UsersService` e `JwtService` real. Verificam comportamento, não detalhe de implementação.

## Sugestões (não bloqueiam)
- `auth.controller.ts:5-8`: `LoginBody` é uma `interface`, então não valida nada em runtime. O ID7 pede DTO com `class-validator`, `@ApiProperty` e `ValidationPipe` global, e o `main.ts` ainda não o configura. Isso é escopo da Tarefa 4 do plan ("Rejeitar entrada malformada"). Não aponto agora, mas a Tarefa 4 precisa trocar a interface pelo DTO.
- `auth.service.ts:16`: quando o e-mail não existe, o `argon2.verify` é pulado. A resposta fica mais rápida e permite descobrir quais e-mails existem pelo tempo. A mensagem já é a mesma nos dois casos, e "recusar sem revelar o motivo" é a Tarefa 3. Vale decidir lá se precisa de um hash fictício para igualar o tempo.
- `auth.module.ts:16`: o `expiresIn: '12h'` está fixo no código. Se a spec ou o plan definirem a duração do token, avalie levá-la para a configuração.

## Observações fora do escopo deste diff
- O `main.ts` não tem `ValidationPipe`, `HttpExceptionFilter`, CORS por `WEB_ORIGIN` nem Swagger. São itens do ID7, ID10, ID19 e §2.2 que as tarefas seguintes ou uma Issue de manutenção devem cobrir.
- O `JwtAuthGuard` global e o `RolesGuard` ainda não existem. O `@Public()` já está criado, mas nada o consome. Isso é a Tarefa 5 e a Issue de papéis.
- O e2e roda `npx prisma db seed` no `beforeAll` e depende de `SEED_MANAGER_EMAIL` e `SEED_MANAGER_PASSWORD` no `.env`. Vale documentar isso no CI, que o ID18 já prevê.
