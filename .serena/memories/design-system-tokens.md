# Design System Tokens

Tokens de design usados no projeto Máquina de Conteúdo baseados em Tailwind CSS 4.

## Cores - HSL Format

O projeto usa formato HSL (Hue, Saturation, Lightness) para permitir melhor manipulação via Tailwind:

### Light Mode (Default)
```css
--background: 0 0% 98%;      /* #fafafa */
--foreground: 0 0% 10%;      /* #1a1a1a */
--card: 0 0% 100%;           /* #ffffff */
--card-foreground: 0 0% 10%;
--primary: 84 76% 55%;       /* #a3e635 - Lime Green */
--primary-foreground: 0 0% 15%;
--secondary: 0 0% 94%;       /* #f0f0f0 */
--accent: 84 76% 55%;        /* Mesmo que primary */
--muted: 0 0% 94%;
--muted-foreground: 0 0% 45%;
--border: 0 0% 88%;          /* #e0e0e0 */
--input: 0 0% 85%;
--ring: 84 76% 55%;
```

### Dark Mode
```css
--background: 0 0% 4%;       /* #0a0a0a */
--foreground: 0 0% 98%;
--card: 0 0% 7%;             /* #121212 */
--primary: 84 76% 55%;
--accent: 84 76% 55%;
--muted: 0 0% 15%;
--muted-foreground: 0 0% 64%;
--border: 0 0% 15%;
```

### Semânticas
```css
--destructive: 0 84% 60%;    /* Vermelho para erros */
--success: 142 76% 36%;      /* Verde para sucesso */
--warning: 38 92% 50%;       /* Amarelo para avisos */
--info: 199 89% 48%;         /* Azul para info */
```

## Border Radius Scale

Escala progressiva baseada em `--radius: 0.75rem` (12px):

```css
--radius-sm:   calc(var(--radius) - 4px)  /* 8px */
--radius-md:   calc(var(--radius) - 2px)  /* 10px */
--radius-lg:   var(--radius)              /* 12px */
--radius-xl:   calc(var(--radius) + 4px)  /* 16px */
--radius-2xl:  calc(var(--radius) + 8px)  /* 20px */
--radius-3xl:  calc(var(--radius) + 12px) /* 24px */
--radius-4xl:  calc(var(--radius) + 16px) /* 28px */
```

Uso: `rounded-lg`, `rounded-xl`, etc.

## Tipografia

```css
--font-sans: var(--font-inter);      /* Inter - UI text */
--font-mono: var(--font-geist-mono); /* Geist Mono - code */
```

## Sidebar Specific

```css
--sidebar-width: 260px;
--sidebar-width-icon: 70px;
--sidebar-background: var(--background);
--sidebar-foreground: var(--foreground);
--sidebar-primary: var(--primary);
--sidebar-primary-foreground: var(--primary-foreground);
--sidebar-accent: var(--accent);
--sidebar-border: var(--border);
--sidebar-ring: var(--ring);
```

## Classes Utilitárias Frequentes

```css
/* Glassmorphism */
bg-white/10 backdrop-blur-md border-white/10

/* Glow effect */
shadow-[0_1px_8px_rgba(31,61,188,0.25)]

/* Transições */
transition-all duration-200 ease-in-out

/* Focus ring */
focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
```

## Padrões de Estado

```css
/* Hover */
hover:bg-primary/90
hover:text-accent-foreground

/* Disabled */
disabled:opacity-50
disabled:pointer-events-none

/* Focus-visible (keyboard only) */
focus-visible:ring-[3px]
focus-visible:border-ring

/* Active */
active:scale-95
```
