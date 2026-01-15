# Unused Imports Pattern

## Error

```
'Lock' is declared but its value is never read.
'Trash2' is declared but its value is never read.
'fadeIn' is assigned a value but never used.
```

## Locations

1. `src/app/(app)/settings/components/sections/prompts-section.tsx` - Lock import
2. `src/app/(app)/sources/page.tsx` - Trash2 import, fadeIn function

## Cause

Importing components or functions that are planned to be used but not actually implemented yet, or left over from refactoring.

## Solutions

### Option 1: Remove the unused import

```tsx
// ❌ BEFORE
import { Lock, Edit3, RotateCcw } from "lucide-react"

// ✅ AFTER
import { Edit3, RotateCcw } from "lucide-react"
```

### Option 2: Use the import (if it was meant to be used)

```tsx
// If you actually need it, use it in the JSX
<Lock className="h-4 w-4" />
```

## Pattern

1. After refactoring, always check ESLint for unused imports
2. Use ESLint auto-fix (`npm run lint -- --fix`)
3. If planning to use later, comment instead of importing:
   ```tsx
   // TODO: Add Lock icon when implementing feature
   // import { Lock } from "lucide-react"
   ```

## Related

- **Files**: `prompts-section.tsx`, `sources/page.tsx`
- **Date Fixed**: 2026-01-15
- **Tool**: ESLint
