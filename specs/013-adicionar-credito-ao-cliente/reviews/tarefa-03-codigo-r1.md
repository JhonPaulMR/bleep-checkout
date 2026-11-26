# Parecer de Código — Tarefa 3

**Veredito:** APROVADO

## Apontamentos (bloqueiam)
*(nenhum apontamento bloqueante — o diff respeita a arquitetura acordada em `docs/architecture.md` e os tokens de `docs/design-tokens.md`)*

## Sugestões (não bloqueiam)
- **Mensagens de erro 4xx da API em `submitCredit()`** — `apps/web/src/app/features/customers/pages/customers.page.ts:258-262`: hoje qualquer erro HTTP diferente de `401` exibe `CONNECTION_ERROR_MESSAGE` (`"Não foi possível conectar. Tente novamente."`). Embora siga o mesmo padrão pré-existente da página, em respostas `404` (ex.: cliente removido em outra aba) ou `400` seria mais claro exibir `err.error?.message` quando for `string`, reservando a mensagem de conexão para falha de rede (`status === 0`) ou `5xx`.
- **Extração de modais para `components/`** — `apps/web/src/app/features/customers/pages/customers.page.html:355-476`: com a adição do modal de recarga, o template da página chegou a 477 linhas e a classe a 275 linhas. Se a feature de Clientes ganhar novas ações no futuro, vale extrair o modal de recarga para `features/customers/components/` comunicando via `input()` / `output()` (como previsto em `docs/architecture.md` §3–§4).

## Observações fora do escopo deste diff
- Em `apps/web/src/app/features/customers/pages/customers.page.html:173`, o botão de ação na tabela usa `aria-label="Adicionar crédito"` genérico (já existente antes do diff); incluir o nome do cliente no `aria-label` (ex.: `Adicionar crédito para {{ customer.name }}`) melhora a navegação por leitor de tela.
