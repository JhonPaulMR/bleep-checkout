# Parecer de Conformidade — Tarefa 2 (rodada 2)

**Veredito:** APROVADO

Rodei `npm test` e `npm run test:e2e` na raiz. Passaram: unit da API 3/3, web 2/2 e e2e da API 4/4 (2 arquivos).

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA1, lado da API: com e-mail e senha corretos, a API devolve token com `sub` e `role` e o usuário com `name` e `role` | atendido | `apps/api/src/modules/auth/auth.service.ts:13-23`, `apps/api/src/modules/auth/auth.service.spec.ts:27-35` |
| `POST /auth/login` com o gerente do seed devolve 200 com `{ data: { accessToken, user: { name, role: "MANAGER" } } }` e sem `passwordHash` | atendido | `apps/api/test/auth.e2e-spec.ts:25-39`, `apps/api/src/common/interceptors/response.interceptor.ts`, `apps/api/src/modules/auth/auth.controller.ts:15-19` |
| Token com validade de 12h (teto da spec) | atendido | `apps/api/src/modules/auth/auth.module.ts:15` |
| CA1, lado do front | fora desta tarefa (Tarefa 6) | n/a |
| CA2 (mesma mensagem nos dois casos de recusa) | fora desta tarefa (Tarefa 3) | n/a |
| CA3 (DTO e validação) | fora desta tarefa (Tarefa 4) | n/a |
| CA6, lado da API (guard e `/auth/me`) | fora desta tarefa (Tarefa 5) | n/a |

## Apontamentos
Nenhum.

Observações sem reprovação:
- A correção aceita na rodada 1 (apontamento 1 do parecer de código) foi aplicada em `auth.service.ts:14-16`. O resultado de `argon2.verify` agora é checado e o e-mail inexistente cai no mesmo ramo. Isso gera um 401 com "E-mail ou senha inválidos.", que é comportamento da Tarefa 3. Eu não reprovo, porque a triagem do usuário aceitou esse apontamento e a correção é a que ele exige. A Tarefa 3 ainda precisa do filtro de exceção e do e2e dos dois casos.
- Os dois testes unitários novos (e-mail inexistente e senha errada) cobrem esse ramo e não são asserções fracas. O de senha errada confere que `signAsync` não é chamado.
- `main.ts` está previsto no plano, mas não mudou. Nada que a Tarefa 2 pede depende dele.
- `@Public()` ainda não tem efeito, porque o guard só vem na Tarefa 5. Isso está dentro do plano.
