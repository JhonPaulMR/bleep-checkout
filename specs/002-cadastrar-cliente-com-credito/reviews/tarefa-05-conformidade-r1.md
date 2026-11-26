# Parecer de Conformidade — Tarefa 5

**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA2 (lado do front) — `409` exibe mensagem `"Já existe um cliente com este CPF."`, destaca o campo CPF em estado de erro (`perigo`) e mantém os dados preenchidos para correção | atendido | `apps/web/src/app/features/customers/pages/customers.page.ts:63-65,147-152,189-197`, `apps/web/src/app/features/customers/pages/customers.page.html:265-282`, `apps/web/src/app/features/customers/pages/customers.page.spec.ts:445-509` |
| CA8 — `401` ao clicar em "Salvar" não cria cliente, dispara `authInterceptor` limpando a sessão local e redireciona para `/login` com sinalização de sessão expirada | atendido | `apps/web/src/app/features/customers/pages/customers.page.ts:186-188`, `apps/web/src/app/core/auth/auth.interceptor.ts:29-31`, `apps/web/src/app/features/customers/pages/customers.page.spec.ts:554-621` |
| CA9 (cadastro) — falha de rede (`status: 0`) exibe `"Não foi possível conectar. Tente novamente."`, mantém os dados preenchidos no formulário e retira o botão do estado de carregamento | atendido | `apps/web/src/app/features/customers/pages/customers.page.ts:14,181-200`, `apps/web/src/app/features/customers/pages/customers.page.html:323-325`, `apps/web/src/app/features/customers/pages/customers.page.spec.ts:511-552` |
| CA1, CA3, CA4, CA5, CA6, CA7, CA10 | fora desta tarefa | — |

## Apontamentos

_(Nenhum apontamento. Escopo estritamente aderente à Tarefa 5, termos consistentes com o glossário de `docs/architecture.md`, e suíte `npm run test -w apps/web` executada com sucesso: 16 arquivos, 109 testes passando.)_
