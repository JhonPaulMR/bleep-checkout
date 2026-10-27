# Parecer de Código — Tarefa 4

**Veredito:** APROVADO

Rodei `git diff --cached 5fb14b0`, `npm test -w apps/api` (5 passed), `npm run lint -w apps/api` (sem achados), `npm run test:e2e` (9 passed, 2 arquivos). Não rodei `npm test` e `npm run lint` na raiz, só as versões por app.

## Apontamentos (bloqueiam)
Nenhum.

Conferido contra o `docs/architecture.md`:
- **ID7:** o `LoginDto` usa `class-validator` e o `ValidationPipe` global tem `whitelist`, `forbidNonWhitelisted` e `transform` todos `true`. Está registrado via `APP_PIPE` no `AppModule` (`apps/api/src/app.module.ts`), e não no `main.ts`. Por isso vale para a API real e para o e2e, que sobe o `AppModule` direto. Foi uma boa escolha.
- **ID6:** o controller só recebe o DTO e delega ao service. Não há acesso a Prisma nem a `Request`/`Response`.
- **ID10:** o teste confirma que o 400 sai no envelope `{ statusCode, error, message, path, timestamp }`. O `HttpExceptionFilter` já repassa `message` como array, e o teste cobre isso.
- **§2.2:** o Swagger está em `/docs`, com `@ApiProperty` no DTO e `addBearerAuth()`.
- **Stack:** `@nestjs/swagger`, `class-validator` e `class-transformer` constam da lista de dependências do backend, então nenhuma entra fora da lista.
- **Segredos:** não há segredo nem URL de ambiente no diff. O teste não acopla a detalhe de implementação, porque exercita só HTTP.

## Sugestões (não bloqueiam)
- `apps/api/src/modules/auth/dto/login.dto.ts`: `@IsEmail()` e `@IsNotEmpty()` no mesmo campo geram duas mensagens para e-mail vazio. Não prejudica nada. Só vale manter se a mensagem exibida ao usuário for tratada no front.
- `apps/api/src/main.ts`: o bloco do Swagger não tem teste. O plano não previa teste para ele, então não é falha desta tarefa. Se quiser uma rede de segurança, um e2e de `GET /docs-json` com 200 pegaria a quebra de montagem do Swagger. O e2e usa `createNestApplication` e não passa pelo `main.ts`, então hoje nada o cobre.
- `apps/api/test/auth.e2e-spec.ts`: o `it.each` com 4 casos e a asserção do envelope completo estão bons. As mensagens de validação em `message` poderiam ser conferidas por conteúdo, não só `Array.isArray`. Isso fica opcional, para não acoplar o teste ao texto do `class-validator`.

## Observações fora do escopo deste diff
- O `AuthController` não declara `@ApiTags('auth')` nem `@ApiOperation`. Fica para quando houver mais de um módulo documentado.
- Vitest avisa que o plugin `vite-tsconfig-paths` está obsoleto e que o certo é `resolve.tsconfigPaths: true`. É candidato a Issue de manutenção.
