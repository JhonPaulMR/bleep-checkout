# 🎨 Tokens de Design

**Projeto:** Bleep Checkout
**Versão:** 1.1.0 · revisão com o protótipo no Figma
**Última atualização:** 08/10/2026

> Esta versão revisa a proposta inicial a partir do protótipo no Figma, incluindo as telas novas: login, clientes e crédito, busca por nome, estados de erro, conclusão da venda e vendas pendentes.

## Paleta

Nome semântico, nunca baseado apenas na aparência da cor.

| Token | Valor | Onde se usa |
| --- | --- | --- |
| `primaria` | `#2563EB` | ações principais, seleção, aba ativa e destaque de elementos importantes |
| `fundo` | `#F9F9FF` | fundo da página, atrás dos cards |
| `superficie` | `#FFFFFF` | fundo de cards, painéis, modais e áreas de formulário |
| `texto` | `#111827` | texto principal e informações essenciais |
| `texto-suave` | `#6B7280` | legendas, valores auxiliares e mensagens de apoio |
| `perigo` | `#DC2626` | erros, campo inválido, cancelamento, venda cancelada/expirada e situações que impedem a operação |
| `sucesso` | `#16A34A` | confirmações, saldo disponível, venda concluída e pagamento confirmado |
| `alerta` | `#D97706` | estado pendente: venda aguardando confirmação do PIX e contador de expiração |
| `desabilitado` | `#D1D5DB` | controles indisponíveis e ações temporariamente bloqueadas |

### Estados da venda

O operador precisa distinguir os estados da venda (RNF "Clareza de estado"). Cada estado usa um token da paleta **e** um ícone com texto, para não depender só da cor.

| Estado | Token | Ícone + texto |
| --- | --- | --- |
| Aberta | `primaria` | carrinho · "Venda aberta" |
| Pendente | `alerta` | relógio · "Pendente — aguardando pagamento" |
| Concluída | `sucesso` | check · "Concluída" |
| Cancelada / Expirada | `perigo` | X · "Cancelada" / "Expirada — nenhum valor recebido" |

## Escala de espaçamento

Uma única progressão, usada de forma consistente.

| Token | Valor |
| --- | --- |
| `xs` | `4px` |
| `sm` | `8px` |
| `md` | `16px` |
| `lg` | `24px` |
| `xl` | `32px` |

## Tipografia

| Token | Família · tamanho · peso | Papel |
| --- | --- | --- |
| `valor-destaque` | Inter · 32px · 700 | total a pagar, valor a cobrar e número da venda |
| `titulo-pagina` | Inter · 28px · 700 | título principal de cada área |
| `titulo-secao` | Inter · 20px · 600 | títulos de cards, seções e modais |
| `corpo` | Inter · 16px · 400 | textos, campos e informações da operação |
| `corpo-destaque` | Inter · 16px · 600 | preços, subtotais e informações importantes |
| `legenda` | Inter · 13px · 400 | apoio, estados, atalhos de teclado e informações secundárias |

## Botões

### Variantes

| Variante | Cor | Onde se usa |
| --- | --- | --- |
| `primario` | fundo `primaria` | ação principal da tela: Adicionar, Prosseguir para pagamento, Gerar QR Code PIX, Salvar, Entrar |
| `secundario` | contornado, texto `primaria` | ações de apoio: Voltar ao caixa, Trocar forma de pagamento, Buscar por nome, Simular confirmação (somente sandbox) |
| `perigo` | `perigo` | Cancelar venda, Não aprovado na máquina |
| `sucesso` | `sucesso` | Aprovado na máquina |

### Estados (valem para todas as variantes)

| Estado | Aparência |
| --- | --- |
| normal | Cor da variante, texto de alto contraste e área clicável claramente identificada. |
| hover | Mantém a identidade da ação, com contraste ligeiramente mais forte para indicar interação. |
| foco (teclado) | Contorno visível ao redor do botão, sem depender apenas da mudança de cor. |
| desabilitado | Usa `desabilitado`, com contraste reduzido e sem aparência de ação disponível. |
| carregando | Mantém a área e o contexto da ação, mostra indicação de processamento e impede cliques repetidos. |

## Protótipo

**Link Figma:** [Acesse aqui](https://www.figma.com/design/JzDrcL9BrkwvHXS7fEX9N4/Untitled?node-id=0-1)

**Telas, ligadas às jornadas e stories:**

1. Login: acesso de operador ou gerente.
2. Simulador de caixa (PDV): código de barras, leitor, quantidade e carrinho (US03, US04).
3. Busca de produto por nome, com o estado "nenhum produto encontrado" (US03).
4. Estados de erro no caixa: produto não localizado, quantidade inválida, saldo insuficiente (US03, US04, US05).
5. Produtos: listagem e cadastro, com erro de código duplicado (US01).
6. Clientes e crédito: cadastro com saldo inicial, erro de saldo negativo e extrato (US02).
7. Pagamento: PIX, crédito do cliente, crédito externo e débito externo (US05, US06, US07).
8. Acompanhamento PIX: pendente e expirado. É a Jornada 1 de `user-flows.md` (US06).
9. Conclusão da venda: concluída, pendente e cancelada/expirada (US08).
10. Vendas pendentes: retomar ou cancelar um PIX pendente.

> As telas 1 e 10 dependem de decisões ainda não registradas no `prd.md`: a story de login com papéis e a regra de expiração/retomada da venda PIX pendente. Essas decisões entram pelo `/utf-prd`.
