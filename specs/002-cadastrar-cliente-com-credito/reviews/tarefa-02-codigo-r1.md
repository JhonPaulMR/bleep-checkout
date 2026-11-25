# Parecer de Código — Tarefa 2

**Veredito:** APROVADO

## Apontamentos (bloqueiam)
Nenhum.

## Sugestões (não bloqueiam)
- Nenhuma. A implementação segue fielmente o padrão arquitetural adotado em `features/products` e nas demais camadas do `apps/web`.

## Observações fora do escopo deste diff
- Nenhuma.

---

### Verificações realizadas contra `docs/architecture.md` e `docs/design-tokens.md`
- **Camada de dados (§3 e §4):** `apps/web/src/app/features/customers/data/customers.service.ts` isola o `HttpClient`, injeta `API_URL` via `inject()` (sem URL hardcoded) e desembrulha `{ data }` do `ResponseInterceptor` em `list()` e `create()`.
- **Dependências entre pastas (§4):** `features/customers` importa apenas de `core/config/api-url`, sem acoplamento cruzado entre features.
- **Padrões Angular 22+ (§2):** `CustomersPage` é standalone sem `standalone: true` explícito, carregado via `loadComponent` (lazy loading) em `apps/web/src/app/app.routes.ts` com `canMatch: [roleGuard('MANAGER')]`.
- **Design tokens e RN13 (`docs/design-tokens.md` e §4):** `CustomersPage` usa apenas tokens semânticos (`p-md`, `text-titulo-pagina`, `text-texto`), e `Header` exibe **Clientes** (`/clientes`) exclusivamente para `MANAGER` (entre **Produtos** e **Operadores**), mantendo `OPERATOR` restrito a **Caixa**.
- **Glossário (§5.1):** tipos e código em inglês (`Customer`, `CreateCustomerPayload`, `balanceCents`, `CustomersService`), interface e rotas em português (`Clientes`, `/clientes`).
- **Testes:** `customers.service.spec.ts`, `header.spec.ts` e `role.guard.spec.ts` testam contratos públicos (requisições HTTP + `controller.verify()`, navegação de rotas e links renderizados), sem acoplamento a detalhes internos.
