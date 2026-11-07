# Parecer de Código — Tarefa 2 (Issue #10, rodada 1)

**Veredito:** APONTAMENTOS

Rodei `npm test`, `npm run lint` e `npm run test:e2e` na raiz. Todos passam: lint sem avisos e e2e com 2 arquivos e 4 testes verdes. O resumo do `npm test` que li mostrou só o web (2 testes). Não vi a saída do unit da API, que ficou fora do trecho que capturei.

## Apontamentos (bloqueiam)
1. **O resultado de `argon2.verify` é descartado, então qualquer senha gera token** — `apps/api/src/modules/auth/auth.service.ts:15`
   Regra violada: ID9 (autenticação com `argon2`, `@nestjs/jwt`) e a lista "o que reprova", no item de tratamento de erro que engole a falha silenciosamente.
   Prejuízo concreto: `await argon2.verify(...)` devolve `false` para senha errada e a linha o ignora. O login emite JWT com `role: MANAGER` para qualquer senha de um e-mail existente. E-mail inexistente faz `user!.passwordHash` lançar TypeError, que vira 500 em vez de 401. O `// TODO #10 (Tarefa 3)` e os `user!` mostram que isso foi adiado de propósito. Mesmo assim, o código que entra neste commit é um bypass de autenticação. O teste da Tarefa 2 só exercita o caminho feliz, então nada o pega até a Tarefa 3.
   Sugestão de caminho, sem corrigir: a Tarefa 2 pode no mínimo lançar `UnauthorizedException` quando `user` for nulo ou `verify` der `false`. Fica a seu critério deixar o refinamento do formato do erro para a Tarefa 3, que tem o `HttpExceptionFilter`. A outra opção é aceitar o adiamento e registrar a decisão na triagem.

## Sugestões (não bloqueiam)
- `apps/api/src/modules/auth/auth.controller.ts:5-8`: `LoginBody` é uma `interface`, sem `class-validator`, o que contraria ID7. Está previsto na Tarefa 4 (DTO e `ValidationPipe`). Como `main.ts` não foi tocado, não há `ValidationPipe` global. Corpo vazio chega ao service e `findUnique({ where: { email: undefined } })` pode lançar erro do Prisma. Com o DTO da Tarefa 4 isso se resolve.
- `apps/api/src/modules/auth/auth.module.ts:15`: o `'12h'` está fixo no código. É o teto da spec e não é segredo, então só vale uma constante nomeada se o valor for reaproveitado.
- `apps/api/src/modules/auth/auth.service.spec.ts`: o unit instancia `new AuthService(...)` direto e mocka só `findByEmail`. O acoplamento com a assinatura do construtor é leve. O teste cobre sub, role e ausência de hash, que é o que o plano pede. Quando a Tarefa 3 chegar, será preciso cobrir os caminhos negativos.
- `apps/api/src/main.ts` está listado nos arquivos previstos da Tarefa 2, mas não mudou. O `ResponseInterceptor` foi registrado via `APP_INTERCEPTOR` no `AppModule`, o que cumpre ID10 e é até melhor para o e2e. Vale só ajustar o plano ou ignorar.
- `apps/api/test/auth.e2e-spec.ts`: roda `execSync('npx prisma db seed')` no `beforeAll`. Isso acopla o teste ao CLI e depende de `SEED_*` no `.env` carregado via `dotenv`. É aceitável e reaproveita o seed da Tarefa 1, mas fica lento e frágil no CI se as variáveis `SEED_*` não forem definidas no workflow.

## Observações fora do escopo deste diff
- `package.json` de `apps/api`: `@nestjs/jwt` entrou. O plano da Tarefa 2 não cita `argon2`, mas o service já o importa, então ele já deve estar instalado desde a Tarefa 1. Conferir se as dependências do plano (`class-validator`, `class-transformer`, `@nestjs/swagger`) entram nas tarefas que as usam.
- O `JwtAuthGuard` global (ID9) ainda não existe. Está na Tarefa 5, e até lá `@Public()` em `/auth/login` não tem efeito prático.
- `HttpExceptionFilter` (ID10) inexistente até a Tarefa 3. Erros hoje saem no formato padrão do Nest.
- A remoção de `app.controller`, `app.service` e `app.e2e-spec` está prevista no plano (Hello World sai), então está coerente.
