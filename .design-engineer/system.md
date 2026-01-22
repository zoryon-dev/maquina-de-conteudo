# Design System - Máquina de Conteúdo

> Auto-extracted from codebase on 2025-01-19

## Color Palette

### Primary - Lime Green
```css
/* Primary: Lime Green */
--primary: hsl(84 76% 55%)       /* #a3e635 */
--primary-foreground: hsl(0 0% 15%)

/* Opacity variants (explicit classes) */
bg-primary/5    → hsl(84 76% 55% / 0.05)
bg-primary/10   → hsl(84 76% 55% / 0.1)
bg-primary/20   → hsl(84 76% 55% / 0.2)
bg-primary/30   → hsl(84 76% 55% / 0.3)
```

### Dark Mode (Default)
```css
/* Backgrounds */
--background: hsl(0 0% 10%)       /* #1a1a1a - Main background */
--card: hsl(0 0% 15%)             /* #262626 - Card background */
--popover: hsl(0 0% 15%)
--sidebar: hsl(0 0% 15%)

/* Borders */
--border: hsl(0 0% 20%)           /* White/10 equivalent */
--input: hsl(0 0% 25%)
--ring: hsl(84 76% 55%)           /* Primary */

/* Text */
--foreground: hsl(0 0% 100%)      /* White */
--muted-foreground: hsl(0 0% 63%) /* White/63 */
--card-foreground: hsl(0 0% 100%)
```

### Semantic Colors
```css
/* Destructive */
--destructive: hsl(0 72% 51%)     /* Red */
--destructive-foreground: hsl(0 0% 98%)

/* Success */
--success: hsl(142 76% 45%)       /* Green */
--success-foreground: hsl(0 0% 100%)

/* Warning */
--warning: hsl(38 92% 55%)        /* Orange */
--warning-foreground: hsl(0 0% 15%)

/* Info */
--info: hsl(217 91% 55%)          /* Blue */
--info-foreground: hsl(0 0% 100%)
```

### Color Usage Patterns
```tsx
/* Semicolon patterns for dark mode */
text-white           /* Primary text */
text-white/90        /* Secondary text */
text-white/70        /* Tertiary text */
text-white/40        /* Placeholder/muted */
text-white/20        /* Disabled/borders */

/* Backgrounds with opacity */
bg-white/[0.02]      /* Subtle card bg */
bg-white/[0.04]      /* Card hover */
bg-white/[0.05]      /* Element bg */
bg-white/[0.10]      /* Element hover */

/* Borders */
border-white/5       /* Very subtle */
border-white/10      /* Default border */
border-white/15      /* Hover border */
border-white/20      /* Strong border */
```

## Spacing Scale

**Base: 4px** (Tailwind default)

| Token | Value | Usage |
|-------|-------|-------|
| `gap-1` | 4px | Tightly related elements |
| `gap-1.5` | 6px | Badge content |
| `gap-2` | 8px | Form labels, icon-text pairs |
| `gap-3` | 12px | Section spacing, navbar |
| `gap-4` | 16px | Card sections, grid gaps |
| `gap-6` | 24px | Component separation |
| `p-2` | 8px | Compact buttons |
| `p-3` | 12px | Card content |
| `p-4` | 16px | Dialog content, inputs |
| `p-6` | 24px | Dialog padding, card padding |
| `px-3` | 12px | Small button |
| `px-4` | 16px | Standard button |
| `px-6` | 24px | Large button |
| `py-1` | 4px | Badge vertical |
| `py-1.5` | 6px | Badge vertical |
| `py-2` | 8px | Button vertical (sm) |
| `py-3` | 12px | Button vertical |

### Common Spacing Patterns
```tsx
/* Card internal spacing */
p-3 space-y-2           /* Dense card */
p-4 gap-4               /* Standard card */
p-6 gap-6               /* Spacious card */

/* Form spacing */
space-y-2               /* Form fields */
gap-2                   /* Label-input pair */
gap-3                   /* Section separator */

/* Navigation */
h-16 px-4 gap-4         /* Navbar height and spacing */
```

## Border Radius Scale

**Base: `--radius: 0.75rem` (12px)**

| Token | Value | Formula | Usage |
|-------|-------|---------|-------|
| `rounded-xs` | 2px | - | Checkbox, tiny elements |
| `rounded-sm` | 8px | base - 4px | Small tags |
| `rounded-md` | 10px | base - 2px | Default input, button |
| `rounded-lg` | 12px | base | Card, button |
| `rounded-xl` | 16px | base + 4px | Dialog, card |
| `rounded-2xl` | 20px | base + 8px | Modal, special card |
| `rounded-3xl` | 24px | base + 12px | Hero elements |
| `rounded-4xl` | 28px | base + 16px | Decorative |
| `rounded-full` | 9999px | - | Badge, avatar, pill |

### Radius Patterns
```tsx
/* Form elements */
rounded-md             /* Inputs, buttons default */

/* Containers */
rounded-xl             /* Dialogs, cards */
rounded-2xl            /* Modals, special containers */

/* Small elements */
rounded-full           /* Badges, pills */
```

## Component Patterns

### Button
```tsx
/* Base button from button.tsx */
h-9 px-4 py-2 has-[>svg]:px-3  /* Default: 36px height */
h-8 rounded-md gap-1.5 px-3     /* Small: 32px height */
h-10 rounded-md px-6           /* Large: 40px height */
size-9                         /* Icon: 36x36px */
size-8                         /* Icon-sm: 32x32px */
size-10                        /* Icon-lg: 40x40px */
```

### Card
```tsx
/* Base card from card.tsx */
bg-card rounded-xl border py-6 px-6 shadow-sm gap-6
/* Spacious card with internal sections */
```

### Dialog
```tsx
/* Dialog from dialog.tsx */
bg-[#1a1a2e] rounded-xl border border-white/10 p-6
/* Dark dialog with custom background */
```

### Badge
```tsx
/* Badge from badge.tsx */
rounded-full border px-2 py-0.5 text-xs
/* Pill badge with standard spacing */
```

### Input
```tsx
/* Input from input.tsx */
h-9 w-full rounded-md border px-3 py-1
/* Standard input height matches button */
```

## Depth Strategy

**Primary: Borders-only (subtle)**
```tsx
/* Default depth */
border border-white/10              /* Subtle border */
border border-white/5               /* Very subtle */

/* Hover states */
hover:border-white/15               /* Border darkening */
hover:bg-white/[0.04]               /* Subtle bg change */

/* Focus states */
focus-visible:ring-[3px]            /* Ring indicator */
focus-visible:ring-ring/50          /* Ring opacity */
```

**Secondary: Shadows (for elevation)**
```tsx
shadow-sm                           /* Card elevation */
shadow-xl shadow-black/50           /* Dialog overlay */
shadow-lg shadow-primary/20         /* Primary glow */
shadow-[0_0_20px_hsl(84_76%_55%/_0.3)]  /* Custom glow */
```

## Effects

### Glassmorphism
```tsx
/* Standard glass */
backdrop-blur-xl bg-white/[0.02] border-white/[0.05]

/* Variant */
bg-[rgba(15,15,20,0.55)] backdrop-blur-md

/* Utility class */
.glass { background: hsl(var(--card) / 0.8); backdrop-filter: blur(10px); }
```

### Glow
```tsx
/* Primary glow */
shadow-primary/20
glow-primary  /* Custom utility: 0 0 20px hsl(84 76% 55% / 0.3) */

/* Ambient glow backgrounds */
w-96 h-96 bg-primary/10 rounded-full blur-[128px]
```

## Typography Scale

```tsx
text-xs                              /* 12px - Badge, meta */
text-sm                              /* 14px - Description, label */
text-base                            /* 16px - Body */
text-lg                              /* 18px - Dialog title */
font-semibold                        /* 600 - Title, header */
font-medium                          /* 500 - Button, label */
```

## Icons

```tsx
/* Standard icon sizes */
size-3    /* 12px - Tiny inline */
size-3.5  /* 14px - Checkbox icon */
size-4    /* 16px - Default inline icon */
w-4 h-4   /* 16px - Alternative pattern */
w-5 h-5   /* 20px - Medium icon */
w-6 h-6   /* 24px - Large icon */
w-12 h-12 /* 48px - Hero placeholder icon */
```

## Scrollbar

```css
/* Width: 8px */
/* Track: transparent */
/* Thumb: hsl(0 0% 25% / 0.5) with 2px border */
/* Hover: hsl(0 0% 35% / 0.7) */
```

## Custom Utilities

### Explicit Primary Classes
```css
/* Due to Tailwind v4 @theme inline limitations */
.bg-primary { background-color: hsl(84 76% 55%); }
.text-primary { color: hsl(84 76% 55%); }
.border-primary { border-color: hsl(84 76% 55%); }
.hover\:bg-primary:hover { background-color: hsl(84 76% 55%); }
.hover\:bg-primary\/90:hover { background-color: hsl(84 76% 55% / 0.9); }
/* ... and more variants */
```

## Platform-Specific Colors

```tsx
/* Instagram */
from-pink-500/10 to-purple-500/10
text-pink-400
bg-pink-500/30 text-pink-300

/* Twitter */
text-blue-400
bg-blue-500/30 text-blue-300

/* LinkedIn */
text-sky-400
bg-sky-500/30 text-sky-300

/* TikTok */
text-gray-400
bg-gray-500/30 text-gray-300
```

## State Patterns

```tsx
/* Disabled */
disabled:pointer-events-none disabled:opacity-50

/* Invalid/Error */
aria-invalid:ring-destructive/20
aria-invalid:border-destructive
text-red-400

/* Focus */
focus-visible:border-ring
focus-visible:ring-ring/50
focus-visible:ring-[3px]
outline-none
```

## Animation Tokens

```tsx
/* Standard transitions */
transition-all
transition-colors
transition-[color,box-shadow]

/* Tailwind animate imports */
@import "tailwindcss";
@import "tw-animate-css";
```
