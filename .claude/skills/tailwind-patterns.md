# Tailwind CSS Patterns

## Design System - Máquina de Conteúdo

### Cores Principais
```css
/* Background */
bg-[#0a0a0f]           /* Fundo principal */
bg-[#1a1a2e]           /* Cards */
bg-[rgba(15,15,20,0.55)] /* Glassmorphism */

/* Accent */
bg-[#1f3dbc]           /* Primary button */
hover:bg-[#2a4fd1]     /* Primary hover */

/* Borders */
border-white/10        /* Bordas sutis */
border-[#1f3dbc]/40    /* Focus border */

/* Text */
text-white             /* Texto principal */
text-white/70          /* Texto secundário */
text-white/40          /* Texto tertiary/placeholder */
```

### Componentes Prontos

#### Glass Card
```tsx
<div className="bg-[rgba(15,15,20,0.55)] backdrop-blur-md border border-white/10 rounded-2xl">
  {/* content */}
</div>
```

#### Primary Button
```tsx
<button className="bg-[#1f3dbc] hover:bg-[#2a4fd1] text-white px-6 py-3 rounded-xl transition-all">
  Click me
</button>
```

#### Secondary Button
```tsx
<button className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl transition-all">
  Click me
</button>
```

#### Input Field
```tsx
<input
  className="w-full rounded-xl bg-[#1a1a2e] border border-white/10 text-white placeholder:text-white/40 focus:ring-2 focus:ring-[#1f3dbc]/40 focus:border-[#1f3dbc]/40 px-4 py-3 outline-none transition-all"
  placeholder="Digite aqui..."
/>
```

#### Glow Effect
```css
shadow-[0_1px_8px_rgba(31,61,188,0.25)]
```

### Animações Comuns

#### Fade In
```tsx
className="animate-in fade-in duration-300"
```

#### Slide In
```tsx
className="animate-in slide-in-from-bottom-4 duration-300"
```
