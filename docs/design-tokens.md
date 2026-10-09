# 🎨 Tokens de Design

**Projeto:** Bleep Checkout
**Versão:** 1.2.0 · tokens conferidos contra o protótipo clicável no Stitch
**Última atualização:** 08/10/2026

> Esta versão confere os tokens com o protótipo no Stitch, que cobre todas as stories Must Have do `prd.md` v1.1. Também alinha os estados da venda à RN17: a venda PIX pendente não expira.

## Paleta

Nome semântico, nunca baseado apenas na aparência da cor.

| Token | Valor | Onde se usa |
| --- | --- | --- |
| `primaria` | `#2563EB` | ações principais, seleção, aba ativa e destaque de elementos importantes |
| `fundo` | `#F9F9FF` | fundo da página, atrás dos cards |
| `superficie` | `#FFFFFF` | fundo de cards, painéis, modais e áreas de formulário |
| `texto` | `#111827` | texto principal e informações essenciais |
| `texto-suave` | `#6B7280` | legendas, valores auxiliares e mensagens de apoio |
| `perigo` | `#DC2626` | erros, campo inválido, cancelamento, venda cancelada e situações que impedem a operação |
| `sucesso` | `#16A34A` | confirmações, saldo disponível, venda concluída e pagamento confirmado |
| `alerta` | `#D97706` | estado pendente: venda aguardando confirmação do PIX |
| `desabilitado` | `#D1D5DB` | controles indisponíveis e ações temporariamente bloqueadas |

### Estados da venda

O operador precisa distinguir os estados da venda (RNF "Clareza de estado"). Cada estado usa um token da paleta **e** um ícone com texto, para não depender só da cor.

| Estado | Token | Ícone + texto |
| --- | --- | --- |
| Aberta | `primaria` | carrinho · "Venda aberta" |
| Pendente | `alerta` | relógio · "Pendente — aguardando pagamento" |
| Concluída | `sucesso` | check · "Concluída" |
| Cancelada | `perigo` | X · "Cancelada — nenhum valor recebido" |

## Escala de espaçamento

Uma única progressão, usada de forma consistente. A unidade é `rem`, para os espaços crescerem junto quando a pessoa aumenta o texto no navegador. Entre parênteses, o equivalente com a fonte padrão de 16px.

| Token | Valor |
| --- | --- |
| `xs` | `0,25rem` (4px) |
| `sm` | `0,5rem` (8px) |
| `md` | `1rem` (16px) |
| `lg` | `1,5rem` (24px) |
| `xl` | `2rem` (32px) |

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
| `secundario` | contornado, texto `primaria` | ações de apoio: Voltar ao caixa, Trocar forma de pagamento, Buscar por nome, Sair, Simular confirmação (somente sandbox) |
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

**Link público do protótipo (Stitch):** ⏳ *pendente — o aluno publica o projeto com acesso "qualquer pessoa com o link" e registra aqui.*

**Arquivo auxiliar de ajustes (Figma):** [arquivo de design](https://www.figma.com/design/JzDrcL9BrkwvHXS7fEX9N4/Untitled?node-id=0-1). Serve só para consertos pontuais; a entrega é o link do Stitch.

**Telas e cobertura das stories Must Have:**

| Tela | Quem usa | Stories |
| --- | --- | --- |
| Login | Gerente e Operador | US09 |
| Simulador de Caixa (PDV) | Operador | US03, US04 |
| Caixa: Busca de Produto por Nome (com "nenhum produto encontrado") | Operador | US03 |
| Caixa: Estados de Erro (produto não localizado, quantidade inválida, saldo insuficiente) | Operador | US03, US04, US05 |
| Pagamento (PIX, crédito do cliente, crédito externo e débito externo) | Operador | US05, US07 |
| Acompanhamento PIX: nó vermelho da Jornada 1 (abandono → venda continua pendente) | Operador | US06 |
| Conclusão da Venda (concluída, pendente, cancelada) | Operador | US08 |
| Vendas Pendentes (retomar ou cancelar, com estado vazio) | Operador | US11 |
| Produtos (cadastro com erro de código duplicado) | Gerente | US01 |
| Clientes & Crédito (cadastro com CPF único, adicionar crédito com erro de valor ≤ 0) | Gerente | US02, US12 |
| Operadores (cadastro com erro de acesso duplicado) | Gerente | US10 |

O menu de cada tela segue o papel (RN13): o Operador vê **Caixa · Pendentes**; o Gerente vê **Produtos · Clientes · Operadores**. Todas as telas têm **Sair**, que volta ao Login.
