---
name: Liquid Velocity POS
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daef'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8fd'
  surface-container-highest: '#dce2f7'
  on-surface: '#141b2b'
  on-surface-variant: '#434655'
  inverse-surface: '#293040'
  inverse-on-surface: '#edf0ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#943700'
  on-tertiary: '#ffffff'
  tertiary-container: '#bc4800'
  on-tertiary-container: '#ffede6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#7d2d00'
  background: '#f9f9ff'
  on-background: '#141b2b'
  surface-variant: '#dce2f7'
  superficie: '#FFFFFF'
  superficie-glass: rgba(255, 255, 255, 0.72)
  superficie-glass-subtle: rgba(248, 250, 252, 0.65)
  superficie-glass-hover: rgba(255, 255, 255, 0.88)
  texto-suave: '#6B7280'
  perigo: '#DC2626'
  sucesso: '#16A34A'
  desabilitado: '#D1D5DB'
  specular-highlight: rgba(255, 255, 255, 0.85)
  glass-border: rgba(255, 255, 255, 0.6)
  ambient-blue-tint: rgba(37, 99, 235, 0.08)
  ambient-glow: rgba(37, 99, 235, 0.24)
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.015em
  titulo-pagina:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.015em
  titulo-secao:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  display-currency:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  corpo:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: '0'
  corpo-destaque:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  corpo-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: '0'
  corpo-sm-destaque:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: '0'
  legenda:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.01em
  mono-barcode:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  margin: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The design system embodies **Liquid Velocity**: an ultra-modern, luminous Liquid Glass aesthetic tailored for rapid point-of-sale workflows, instant scanning feedback, and frictionless retail simulation. The UI balances technical rigor with fluid optical tactility, turning repetitive cashier tasks into an intuitive, high-dexterity tactile experience.

### Brand Personality & Emotional Response
- **Kinetic Precision:** Every barcode trigger, quantity increment, and payment confirmation feels instantaneous and crisp, instilling immediate confidence in the operator under rush-hour retail conditions.
- **Luminous Clarity:** Transparent layered glass panels, subtle specular rims, and directional reflections structure complex order data without visual fatigue.
- **Effortless Control:** High legibility paired with generous touchpoints and clear color states (cobalt action, emerald success, crimson validation) ensures stress-free checkout runs.

### Visual Style: Liquid Glass
The interface synthesizes frosted glassmorphism and refined neo-skeuomorphic light physics:
- Translucent canvas tiers with hardware-accelerated `backdrop-filter: blur(16px)` to `blur(24px)`.
- Specular edge treatments: 1px top-lit highlights (`rgba(255, 255, 255, 0.7)`) contrasting against faint bottom refraction borders (`rgba(0, 0, 0, 0.06)`).
- Subsurface color diffusion: radial underglows and ambient chromatic bleeding behind focal payment modules (PIX dynamic pulse, verified success stamps).

## Colors

The chromatic architecture establishes immediate hierarchy through calibrated contrast and translucent depth:

- **Primary (`#2563EB`):** High-energy cobalt blue driving primary POS actions, product selection rings, active quantity steppers, and final payment triggers.
- **Secondary (`#0F172A`):** Deep oceanic obsidian utilized for display counters, bold numeric registers, and high-impact structural panels.
- **Neutral (`#111827`):** Primary readable ink ensuring AAA legibility over frosted white surfaces.
- **Superficie & Glass Layers:** Base frosted surfaces utilize `rgba(255, 255, 255, 0.72)` paired with `backdrop-filter: blur(20px)` and subtle white specular highlights (`rgba(255, 255, 255, 0.85)`). Hover states elevate opacity to `0.88` to create tactile feedback.
- **Feedback & Semantics:**
  - `sucesso` (`#16A34A`): Validated barcode read, credit authorization, and confirmed PIX settlement.
  - `perigo` (`#DC2626`): Barcode scan errors, insufficient customer balance, and critical void/cancellation flows.
  - `desabilitado` (`#D1D5DB`): Non-interactive registers, locked inputs, and pending processing states.
  - `texto-suave` (`#6B7280`): Secondary labels, SKUs, barcode meta tags, and timestamp anchors.

## Typography

Typography is set strictly in **Inter** to ensure maximum legibility across variable-distance cash register monitors and mobile checkout devices.

- **Tabular Figures:** All numeric fields (currency registers, item quantity counters, live subtotals, barcode sequences) must activate CSS font feature settings: `font-feature-settings: "tnum" on, "cv05" on, "cv11" on`. This guarantees rock-solid vertical alignment of totals without horizontal jitter during dynamic price calculation.
- **Hierarchical Contrast:** Large monetary totals (`display-currency`) and screen headers (`titulo-pagina`) rely on heavy weights (`700`) and tight negative tracking (`-0.02em`) to command attention. Technical sub-labels and barcode data (`mono-barcode`) leverage elevated tracking (`+0.06em`) for rapid character recognition during physical validation.

## Layout & Spacing

The layout is built around a rigorous 4px baseline scale mapped to five core spacing tokens: `xs` (4px), `sm` (8px), `md` (16px), `lg` (24px), and `xl` (32px). 

### Layout Model
- **POS Dual-Pane Architecture (Desktop / Tablet Landscape):** The checkout simulator adopts an asymmetric 65/35 split grid. The left pane hosts rapid entry (barcode scanner input, product auto-complete catalog, quantity multiplier controls), while the right pane locks the active order receipt summary, subtotal calculation, and direct payment method selection.
- **Fluid Multi-Device Adaptation:**
  - **Mobile (< 768px):** Single-column stacked workflow (`gutter: 1rem`, `margin: 1rem`). The order summary compresses into a sticky bottom glass dock revealing current total and a swipe-up/tap-to-expand receipt.
  - **Tablet (768px - 1024px):** 12-column fluid grid (`gutter: 1.25rem`, `margin: 1.5rem`) with collapsible catalog sidebars.
  - **Desktop (≥ 1024px):** Fixed-ratio split (`gutter: 1.5rem`, `margin: 2rem`, max-width 1440px) maintaining persistent line of sight across catalog, cart lines, and payment triggers.

## Elevation & Depth

Visual depth is achieved through liquid glass physics rather than flat gray drop shadows:

1. **Layer 0 (Canvas Base):** A soft luminous backdrop with radial gradient orbs (`radial-gradient(at 10% 20%, rgba(37, 99, 235, 0.12) 0px, transparent 50%)` and `radial-gradient(at 90% 80%, rgba(22, 163, 74, 0.08) 0px, transparent 50%)`).
2. **Layer 1 (Glass Containers & Panels):** Frosted glass surface (`rgba(255, 255, 255, 0.72)`), `backdrop-filter: blur(20px) saturate(180%)`, framed by a top-lit border `border: 1px solid rgba(255, 255, 255, 0.7)` and an ambient shadow `0 8px 32px -4px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.03)`.
3. **Layer 2 (Floating Cards & Active Inputs):** Elevated interactive elements receive `backdrop-filter: blur(24px)`, `background: rgba(255, 255, 255, 0.9)`, and an inset specular rim `box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 12px 36px -6px rgba(15, 23, 42, 0.08)`.
4. **Layer 3 (Modals, Overlays & PIX QR Dynamic Focus):** High-specularity glass sheet (`rgba(255, 255, 255, 0.94)`), paired with a deep diffuse ambient drop `0 24px 64px -12px rgba(15, 23, 42, 0.18)` and an interactive primary aura (`0 0 40px rgba(37, 99, 235, 0.15)`).

## Shapes

The design system standardizes on **Rounded** (`roundedness: 2`), reflecting the organic curvature of fluid liquid drops:

- **Base Radii (`0.5rem` / 8px):** Applied to badges, table row chips, compact quantity increments, and status pills.
- **Container Radii (`rounded-lg: 1rem` / 16px):** Applied to input fields, line item cards, payment selection tiles, and button triggers.
- **Major Glass Panel Radii (`rounded-xl: 1.5rem` / 24px):** Applied to primary checkout frames, catalog containers, receipt modals, and customer balance display blocks.

## Components

### 1. Buttons
- **Primary Action:** Solid cobalt background (`#2563EB`) overlaid with a delicate top inner specular glow (`box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35)`), crisp white text, and `border-radius: 1rem`. Hover triggers a brightness bump (`#1D4ED8`) and a 12px cobalt ambient spread.
- **Secondary / Glass Action:** Frosted surface (`rgba(255, 255, 255, 0.6)`), 1px white border, dark neutral text (`#111827`).
- **Critical / Void Action:** Soft crimson glass tint (`rgba(220, 38, 38, 0.08)`), text `#DC2626`, hover elevating to solid `#DC2626` with white text.
- **States:** Focus uses an external `3px solid rgba(37, 99, 235, 0.4)` offset ring. Disabled uses background `#D1D5DB`, muted text `#9CA3AF`, no shadow, `cursor: not-allowed`. Loading states swap label with an animated indeterminate liquid spinner while preserving button bounds.

### 2. Barcode & Search Input Fields
- **Container:** High-translucency glass pill/box (`rgba(255, 255, 255, 0.8)`), 1px border (`rgba(229, 231, 235, 0.8)`), generous padding (`12px 16px`), and tabular mono fonts for codes.
- **Active / Scan Focus:** Instant transition to `border-color: #2563EB`, backed by an ambient glow `0 0 0 4px rgba(37, 99, 235, 0.12)`.
- **Pre-input Multiplier:** An integrated quantity badge (`e.g., 4x`) sits inside the left inset of the field, visually binding the operator’s pre-set multiplier with the target barcode.

### 3. Order Item Cards & Receipt Lists
- **Item Row:** Liquid glass strip featuring rounded corners (`12px`), padded with `space-md`, subtle border separator (`rgba(0, 0, 0, 0.04)`).
- **Line Structure:** Product title in `corpo-destaque`, unit price and barcode in `legenda` (`#6B7280`), right-aligned total in bold tabular figures. Includes inline quantity adjustment buttons (`-`, `+`) with haptic visual depression on click.

### 4. Payment Method Selector Cards
- **Structure:** 4-card segmented grid (PIX, Crédito Cliente, Cartão Crédito, Cartão Débito).
- **Unselected:** Translucent glass (`rgba(255, 255, 255, 0.5)`), border `rgba(255, 255, 255, 0.8)`.
- **Selected:** Cobalt rim (`2px solid #2563EB`), elevated background (`rgba(37, 99, 235, 0.06)`), specular highlight, and verified check icon.
- **Insufficient Credit Alert:** When selecting customer credit without adequate balance, the card applies a warning tint (`rgba(220, 38, 38, 0.06)`), disables the confirm action, and highlights the credit shortfall.

### 5. Status Chips & Payment Badges
- **Pendente (PIX):** Amber liquid glow (`background: rgba(245, 158, 11, 0.1)`, `color: #B45309`, pulsing beacon indicator).
- **Concluído / Pago:** Emerald liquid badge (`background: rgba(22, 163, 74, 0.1)`, `color: #16A34A`, checkmark badge).
- **Cancelado:** Soft crimson badge (`background: rgba(220, 38, 38, 0.1)`, `color: #DC2626`).

### 6. PIX Payment QR Dynamic Stage
- Centered liquid glass plate (`rounded-xl`), presenting high-contrast QR code container, live price summary (`display-currency`), real-time status tracker ("Aguardando leitura..."), and dual primary/secondary action triggers ("Confirmar Manualmente" / "Cancelar Venda").