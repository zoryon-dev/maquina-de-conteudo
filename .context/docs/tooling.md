# Tooling & Productivity Guide

This guide outlines the development environment, tools, and workflows used to maintain the `maquina-de-conteudo` repository. Following these recommendations ensures consistency across the team and improves development efficiency.

## Required Tooling

To work on this project, ensure your environment meets the following requirements:

### Core Dependencies
- **Node.js**: Version `18.x` or higher (Required by Next.js App Router).
- **Package Manager**: `npm` (default) or `pnpm` (recommended for faster installs).
- **Git**: For version control.

### Installation
Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd maquina-de-conteudo
npm install
```

## Development Scripts

We use standard Next.js scripts for the development lifecycle.

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the local development server at `http://localhost:3000`. |
| `npm run build` | Creates an optimized production build. |
| `npm run start` | Starts the production server (requires a build first). |
| `npm run lint` | Runs ESLint to catch code quality issues. |

## Recommended Automation

### Styling Utilities (`cn`)
We utilize a helper function to merge Tailwind CSS classes conditionally. This is located at `src/lib/utils.ts`.

**Usage:**
Always use `cn()` instead of template literals when you need conditional logic or need to resolve Tailwind class conflicts.

```tsx
import { cn } from "@/lib/utils"

function MyComponent({ className, isActive }) {
  return (
    <div className={cn(
      "bg-primary text-white p-4", // Base styles
      isActive && "opacity-100",   // Conditional styles
      className                    // External overrides (Tailwind Merge handles conflicts)
    )}>
      Content
    </div>
  )
}
```

### Component Architecture
The project follows a split structure:
- **`src/components/ui/*`**: Reusable primitives (buttons, dialogs, sheets). These are often derived from Shadcn UI/Radix UI.
- **`src/app/*`**: Page-specific components and layouts.

## IDE / Editor Setup

We strongly recommend **Visual Studio Code (VS Code)**.

### Recommended Extensions

1.  **ESLint** (`dbaeumer.vscode-eslint`)
    *   Integrates project linting rules directly into the editor error panel.
2.  **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`)
    *   Provides autocomplete, syntax highlighting, and linting for Tailwind classes.
    *   **Crucial:** This helps identifying class names used inside the `cn()` utility.
3.  **Prettier - Code formatter** (`esbenp.prettier-vscode`)
    *   Ensures consistent code style on save.
4.  **Pretty TypeScript Errors** (`yoavbls.pretty-ts-errors`)
    *   (Optional) Makes TypeScript errors human-readable.

### Workspace Settings
Create or update `.vscode/settings.json` to enforce consistency:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

## Productivity Tips

### Path Aliases
We use TypeScript path aliases to avoid long relative imports.
- Use `@/components` instead of `../../../components`.
- Use `@/lib` for utilities.
- Use `@/hooks` for custom React hooks.

**Example:**
```tsx
// ✅ Good
import { useIsMobile } from "@/hooks/use-mobile";

// ❌ Avoid
import { useIsMobile } from "../../../hooks/use-mobile";
```

### Working with UI Components
This project uses a component library structure found in `src/components/ui`. When building new features:

1.  **Check `src/components/ui` first**: Before building a generic component (like a Modal or Sidebar), check if it already exists (e.g., `dialog.tsx`, `sheet.tsx`, `sidebar.tsx`).
2.  **Composition Pattern**: Many UI components use the Radix composition pattern (Root -> Trigger -> Portal -> Content).

**Example (Sheet/Sidebar):**
```tsx
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet"

<Sheet>
  <SheetTrigger>Open Menu</SheetTrigger>
  <SheetContent>
    {/* Menu Items */}
  </SheetContent>
</Sheet>
```

### Mobile Responsiveness
Use the custom hook `useIsMobile` found in `src/hooks/use-mobile.ts` for JavaScript-level responsive logic usually required for Sidebar toggles or interactive elements that differ significantly between mobile and desktop.

```tsx
import { useIsMobile } from "@/hooks/use-mobile"

export function MyResponsiveComponent() {
  const isMobile = useIsMobile()
  
  if (isMobile) {
    return <MobileView />
  }
  return <DesktopView />
}
```
