# Parecer de Código — Tarefa 3

**Veredito:** APONTAMENTOS

## Apontamentos (bloqueiam)
1. **Erro na listagem de produtos é engolido silenciosamente e mascarado como catálogo vazio** — `apps/web/src/app/features/products/pages/products.page.ts:45-47`
   Regra violada: Critério estrutural de revisão ("tratamento de erro que engole a falha silenciosamente") e consistência no tratamento de falhas da camada de apresentação (`docs/architecture.md`, §4 — em contraste com o padrão `listError` adotado em `apps/web/src/app/features/operators/pages/operators.page.ts:55-59`).
   Prejuízo concreto: Se `GET /products` falhar por erro de rede ou `5xx`, o callback `error` apenas desativa `loading` sem registrar nem exibir qualquer erro. Como `products()` permanece `[]`, o template (`apps/web/src/app/features/products/pages/products.page.html:85-88`) entra no branch `@else if (products().length === 0)` e exibe `"Nenhum produto cadastrado ainda."`, induzindo o gerente a acreditar que o catálogo está vazio quando na verdade houve falha na API. *(Observação: se esse tratamento estiver intencionalmente diferido para a Tarefa 5 / CA8, a decisão pode ser registrada na triagem, mas no estado atual do diff a falha é silenciosamente mascarada sem sequer marcação `TODO`.)*

## Sugestões (não bloqueiam)
- **Subir formatação de centavos para BRL para `shared/`:** `apps/web/src/app/features/products/pages/products.page.ts:5-8,51-53` implementa a mesma formatação `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` que já existe em `apps/web/src/app/features/checkout/pages/checkout.page.ts:158-163`. Conforme `docs/architecture.md` §4 (*"Uma feature não importa de outra; o que for comum sobe para `shared/` ou `core/`"*), extrair uma função utilitária ou pipe em `apps/web/src/app/shared/` evita repetir essa conversão nas próximas features (clientes, vendas pendentes).
- **Desacoplar seletor do campo de busca do texto de `placeholder` nos testes:** Em `apps/web/src/app/features/products/pages/products.page.spec.ts:94` e `135`, o input é buscado por `input[placeholder="Buscar por código ou nome..."]`. Preferir `input[name="searchTerm"]` ou `data-testid` (como já usado nos cards de resumo e no botão `+ Novo Produto`) evita que ajustes de texto quebrem o teste.

## Observações fora do escopo deste diff
- `apps/web/src/app/features/checkout/pages/checkout.page.ts:158-163`: `formatCents` instancia `new Intl.NumberFormat(...)` a cada chamada, enquanto `ProductsPage` já cacheia `BRL_FORMATTER` no escopo do módulo. Boa candidata a Issue de manutenção para unificar a formatação monetária em `apps/web/src/app/shared/`.
