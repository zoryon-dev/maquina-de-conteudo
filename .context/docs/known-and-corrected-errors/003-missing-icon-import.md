# Missing Icon Import

**Erro:**
```
Cannot find name 'X'. [2304]
```

**Contexto:** Após refatorar o navbar da página `/fontes`, o ícone `X` foi adicionado ao componente mas não foi importado.

**Causa:** Adicionar `<X className="h-3 w-3" />` no componente sem importar o ícone de `lucide-react`.

**Solução:** Adicionar `X` à lista de imports:
```typescript
// ❌ Errado - X não está nos imports
import {
  Globe,
  FileText,
  Search,
  BarChart3,
} from "lucide-react"

// ✅ Correto - adicionar X aos imports
import {
  Globe,
  FileText,
  Search,
  BarChart3,
  X,  // Adicionar este
} from "lucide-react"
```

**Arquivo:** `src/app/(app)/sources/page.tsx`

**Prevenção:** Sempre verificar se todos os ícones usados no componente estão importados.
