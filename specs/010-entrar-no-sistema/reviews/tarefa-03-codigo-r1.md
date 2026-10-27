# Parecer de Código — Tarefa 3 (rodada 1)

**Veredito:** APROVADO

Rodei os comandos pedidos. `npm test -w apps/api` passou (5 testes). `npm run lint -w apps/api` não deu nenhum aviso. `npm run test:e2e` passou (5 testes, Postgres de pé). Não rodei `npm test` nem `npm run lint` na raiz, só as versões `-w apps/api`.

## Apontamentos (bloqueiam)
Nenhum.

Conferência contra o `architecture.md`:
- **ID10 (resposta e erro):** `HttpExceptionFilter` está em `apps/api/src/common/filters/`, registrado globalmente por `APP_FILTER`, na mesma forma do `ResponseInterceptor`. O erro sai com as cinco chaves `{ statusCode, error, message, path, timestamp }`. Erro que não é HTTP vira 500 com mensagem genérica e vai para o log, sem vazar detalhe.
- **ID6 (camadas):** `AuthService` não conhece `Request` nem `Response`. O filtro fica em `common`.
- **ID9 (autenticação):** `argon2` é mantido, e a mensagem de erro é a mesma nos dois casos de recusa.
- **ID17 (segredos):** nenhum segredo no código. O hash descartável é só uma constante de tempo de execução. O e2e lê o e-mail do seed de `process.env`.
- **Testes:** o e2e verifica comportamento HTTP (as cinco chaves, 401, a mesma `message` nos dois casos). O unit do filtro cobre o formato e o não-vazamento de detalhe interno. Nenhum dos dois depende de detalhe interno da implementação.
- **`main.ts`:** o plano o previa, mas não foi alterado, e não precisa ser. O filtro vale globalmente via `APP_FILTER` no `AppModule`, como o interceptor, e o e2e comprova isso. Não é apontamento.

## Sugestões (não bloqueiam)
- `apps/api/src/modules/auth/auth.service.ts:8`: `dummyHash` é uma `Promise` criada na construção do service. Se `argon2.hash` rejeitasse, seria uma rejeição não tratada durante a inicialização do módulo. Praticamente não acontece, mas calcular o hash de forma preguiçosa dentro de `login`, ou aguardá-lo em `onModuleInit`, deixaria a falha visível no lugar certo.
- `apps/api/src/common/filters/http-exception.filter.spec.ts`: o ramo em que `getResponse()` devolve uma `string` não tem teste (`error = HttpStatus[statusCode] ?? exception.name`). É um pequeno risco de regressão.
- O e2e prova a mesma `message`, mas não prova a equalização de tempo do `dummyHash`. Ela é uma defesa extra que a spec não pede. Se o plano quiser provar essa defesa, vale registrar como decisão.

## Observações fora do escopo deste diff
- `apps/api/src/main.ts` ainda não tem `ValidationPipe` global (ID7). `ConfigModule`, Swagger e CORS também não aparecem, mas isso pode ser escopo de outras tarefas. Se o plano não os cobre, abra uma Issue de manutenção.
- O Vite avisa que `vite-tsconfig-paths` é redundante e que dá para usar `resolve.tsconfigPaths`. É só ruído de configuração.
