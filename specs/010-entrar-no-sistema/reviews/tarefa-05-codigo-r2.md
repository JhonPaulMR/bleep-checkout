# Parecer de Código — Tarefa 5 (rodada 2)

**Veredito:** APROVADO

Rodei os testes: `npm test -w apps/api` deu 12/12 e `npm run test:e2e` deu 14/14. O lint passou sem avisos.

## Apontamentos (bloqueiam)
Nenhum. O apontamento aceito na rodada 1 foi resolvido. `AuthController.me` só repassa `request.user.sub` para `AuthService.me`. A regra "usuário inexistente → 401" e a montagem do perfil estão no service. O acesso ao banco passa por `UsersService.findById` e `PrismaService`. Isso respeita ID6, ID8 e ID9.

Conferi também os outros critérios que reprovam:
- **ID9:** o `JwtAuthGuard` é global (`APP_GUARD`) e respeita `@Public()`. O hash não sai na resposta.
- **ID10:** a resposta de erro 401 sai no formato `{ statusCode, error, message, path, timestamp }`, e o e2e verifica isso. O sucesso sai no envelope `{ data }`.
- **ID17:** não há segredo no código. Os testes usam `JWT_SECRET` do ambiente ou um segredo de teste.
- **Tratamento de erro:** o `catch` do guard converte para 401 de propósito, então a falha não é engolida.
- **Testes:** não ficam acoplados à implementação. As asserções são sobre comportamento observável.

## Sugestões (não bloqueiam)
- A mensagem `'Sessão inválida ou expirada.'` aparece em três lugares: duas vezes em `apps/api/src/common/guards/jwt-auth.guard.ts` e uma em `apps/api/src/modules/auth/auth.service.ts`. Uma constante compartilhada evitaria divergência. Não vejo prejuízo hoje, por isso não reprova.
- `JwtPayload.role` é `string`. Quando o `RolesGuard` nascer, vale tipar como a união `'MANAGER' | 'OPERATOR'`.
- `AuthController.me` tipa `@Req()` com um objeto inline. Um decorator `@CurrentUser()` ou a interface do guard reaproveitada ajudaria quando houver mais rotas protegidas.

## Observações fora do escopo deste diff
- O guard global agora exige `@Public()` em tudo. O ID9 também prevê `@Public()` no webhook. Isso fica para a tarefa que criar a rota.
- O `RolesGuard` e o `@Roles` ainda não existem. A decisão do plano é que eles não nascem nesta história, então não é apontamento.
- A tabela "Mapa de Domínios" (§6 do `architecture.md`) continua vazia. O domínio auth deve ganhar uma linha ao fechar a história.
