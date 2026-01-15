# JSX Greater Than Character Error

## Error

```
Unexpected token. Did you mean {'>'} or '&gt;'?
```

## Location

`src/app/(app)/sources/page.tsx:242`

## Cause

Using the `>` character directly in JSX text content causes parsing errors because it conflicts with JSX syntax.

```tsx
// ❌ BEFORE - Causes error
<p>Vá em Configurações > Documentos para adicionar</p>
```

## Solution

Replace `>` with `&gt;` HTML entity in JSX text content.

```tsx
// ✅ AFTER - Fixed
<p>Vá em Configurações &gt; Documentos para adicionar</p>
```

## Pattern

Whenever you need to display comparison operators or arrows in JSX text content:
- `>` → `&gt;`
- `<` → `&lt;`
- `&` → `&amp;`

## Related

- **File**: `src/app/(app)/sources/page.tsx`
- **Date Fixed**: 2026-01-15
- **Component**: Fontes page
