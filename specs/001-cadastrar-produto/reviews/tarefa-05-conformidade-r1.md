# Parecer de Conformidade — Tarefa 5
**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA2 (lado do front) — `409` exibe mensagem `"Já existe um produto com este código de barras."`, destaca o campo de código de barras em estado `perigo`, não cria duplicata e mantém dados preenchidos para correção | atendido | `apps/web/src/app/features/products/pages/products.page.ts:112-117,152-161`, `apps/web/src/app/features/products/pages/products.page.html:231,248-265`, `apps/web/src/app/features/products/pages/products.page.spec.ts:358-428` |
| CA7 — `401` ao salvar produto com sessão expirada não cria produto, aciona o `authInterceptor` limpando a sessão local e redirecionando para `/login` com aviso de sessão expirada | atendido | `apps/web/src/app/features/products/pages/products.page.ts:90-94,146-151`, `apps/web/src/app/core/auth/auth.interceptor.ts:29-31`, `apps/web/src/app/features/products/pages/products.page.spec.ts:471-538` |
| CA8 — Falha de rede ao listar ou cadastrar exibe `"Não foi possível conectar. Tente novamente."`, mantém os dados preenchidos no formulário e retira o botão do estado de carregamento | atendido | `apps/web/src/app/features/products/pages/products.page.ts:90-94,146-164`, `apps/web/src/app/features/products/pages/products.page.html:80-81,307-309`, `apps/web/src/app/features/products/pages/products.page.spec.ts:186-195,430-469` |
| CA1, CA2 (API), CA3, CA4, CA5, CA6, CA9 | fora desta tarefa | cobertos em outras tarefas da US01 |

## Apontamentos

*(Sem apontamentos. Todos os critérios de aceite da Tarefa 5 e respectivos casos de abandono estão implementados conforme `specs/001-cadastrar-produto/spec.md`, respeitando o glossário de `docs/architecture.md`, sem escopo inflado e com a suíte `npm run test -w apps/web` executada e aprovada: 14 arquivos, 90 testes.)*
