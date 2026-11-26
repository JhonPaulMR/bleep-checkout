# Plano — Issue #5

## Decisões técnicas

- **API (`apps/api/test/sales.e2e-spec.ts`):**
  - `CreateSaleItemDto` (`apps/api/src/modules/sales/dto/create-sale.dto.ts`) já aplica `@IsInt()` e `@Min(1)` no campo `quantity`. Na Tarefa 1, ampliamos a suíte e2e em `sales.e2e-spec.ts` para garantir explicitamente rejeição `400` para `quantity: 0`, `quantity: -2` e `quantity: 1.5` (decimal) sem criar venda no banco (CA6 / RN07).
- **Frontend (`apps/web/src/app/features/checkout/pages/`):**
  - Signal `quantityInput = signal('1')` (string para permitir detectar campo vazio, decimal `"1.5"`, zero `"0"` ou negativo `"-2"` com precisão) e `computed` `parsedQuantity`: valida `/^\d+$/` com valor inteiro `>= 1` (retorna `number | null`).
  - Signal `quantityError = signal<string | null>(null)` (exibe `"Informe uma quantidade inteira positiva."` com borda `border-perigo` e `role="alert"` quando tentar incluir com quantidade inválida; limpa ao alterar o valor ou clicar `-`/`+`).
  - Controles `-` / `+` (`decreaseInputQuantity()` com piso `1`, `increaseInputQuantity()` somando `+1`, ou reiniciando para `1` se inválido).
  - Atalho de teclado `F2` em `onWindowKeydown`: foca o input de quantidade (`viewChild<ElementRef<HTMLInputElement>>('quantityInputEl')`) quando `!sale()`.
  - `addProduct(product: Product, quantity = 1)`: adiciona `quantity` unidades ao carrinho (ou incrementa em `quantity` se o produto já existir no carrinho, sem duplicar linha — CA1, CA2).
  - `addByBarcode()` e `selectSearchedProduct(product)`: validam `parsedQuantity()` antes de qualquer chamada à API ou alteração do carrinho; se inválido, setam `quantityError('Informe uma quantidade inteira positiva.')` e abortam; após inclusão bem-sucedida, resetam `quantityInput` para `'1'` e limpam `quantityError`.
  - Modal **Buscar produto por nome** (`busca.html`): exibe o seletor de unidades sincronizado com `quantityInput` e, em cada resultado, `Total {{ effectivePreviewQuantity() }} un: {{ formatCents(product.priceCents * effectivePreviewQuantity()) }}` e botão `Adicionar {{ effectivePreviewQuantity() }} un.`.
  - Remove os dois comentários `// TODO #5` em `checkout.page.ts`.

## Tarefas

- [ ] **Tarefa 1 — Cobrir rejeição `400` para quantidade zero, negativa e decimal em `POST /sales` (e2e)**
  - Cobre: CA6 (RN07 na API)
  - Teste primeiro: testes e2e em `apps/api/test/sales.e2e-spec.ts` verificando `400` para `quantity: 0`, `quantity: -2` e `quantity: 1.5` sem criar `Sale` no banco
  - Arquivos previstos: `apps/api/test/sales.e2e-spec.ts`

- [ ] **Tarefa 2 — Implementar seletor "Nº de unidades [F2]" na `CheckoutPage` e no modal de busca por nome**
  - Cobre: CA1, CA2, CA3, CA4, CA5, CA7
  - Teste primeiro: testes em `checkout.page.spec.ts` cobrindo inclusão de `4` unidades por código de barras, leitor USB (`Enter`) e busca por nome com reset para `1`; soma de `4 + 4 = 8` sem duplicar linha; bloqueio de `0`, `-2`, `1.5` e vazio com `"Informe uma quantidade inteira positiva."` sem chamar API nem alterar carrinho; controle de unidades e prévia `Total N un:` / `Adicionar N un.` no modal de busca; atalho `F2` focando campo de quantidade; e abandono (`Esc`/`404`) com quantidade `4` sem alterar carrinho; falham porque o seletor ainda não existe
  - Arquivos previstos: `apps/web/src/app/features/checkout/pages/checkout.page.ts`, `apps/web/src/app/features/checkout/pages/checkout.page.html`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts`

## Critérios sem tarefa
