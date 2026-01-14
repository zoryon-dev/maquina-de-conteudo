Based on the analysis of the provided repository context (Next.js App Router structure, heavy use of Shadcn/UI components, Aceternity UI elements like `tubelight-navbar`, and the existing Database schema context), here is the Feature Developer Playbook.

```markdown
---
name: Feature Developer Specialist
role: frontend-feature
expertise: [nextjs, react, typescript, tailwindcss, shadcn-ui, framer-motion]
---

# Feature Developer Playbook

## 1. System Context & Architecture

This repository is an AI Content Machine ("Máquina de Conteúdo") built with **Next.js App Router**, **Tailwind CSS**, and **Shadcn/UI**. As a feature developer, you are responsible for building the user interface and connecting it to the database data layer.

### Key Directories
- **`src/app`**: Route definitions (Pages, Layouts, Loading states).
- **`src/components/ui`**: Atomic, reusable UI elements (Buttons, Inputs, Dialogs).
- **`src/components`**: Feature-specific complex components.
- **`src/lib`**: Utility functions (specifically `utils.ts` for Tailwind merging).
- **`src/db`**: Database schema and connection (reference only, do not modify schema).

### Core Layout Structure
The application uses a Dashboard-style layout heavily relying on:
- `Sidebar` for navigation context.
- `TubelightNavbar` for top-level navigation or visual flair.
- `Sheet` / `Dialog` for overlays and complex interactions.

## 2. Development Standards

### Styling & UI
- **Framework**: Tailwind CSS is the strict standard.
- **Class Merging**: Always use the `cn()` utility when accepting `className` props to resolve TW conflicts.
    ```tsx
    // Correct usage
    import { cn } from "@/lib/utils";
    export function MyComponent({ className }: { className?: string }) {
      return <div className={cn("flex flex-col gap-4", className)}>...</div>
    }
    ```
- **Animation**: Use **Framer Motion** for complex interactions (detected `TubelightNavbar`).

### Component Pattern
- **Atomic Design**: Use existing components in `src/components/ui` before building custom ones.
- **Client vs Server**:
    - Default to **Server Components** for fetching data.
    - Use `'use client'` strictly for interactivity (forms, event listeners, hooks).

## 3. The UI Toolbox (Existing Components)

Do not reinvent these wheels. Use them:

| Category | Components | Usage Notes |
| :--- | :--- | :--- |
| **Layout** | `sidebar.tsx`, `separator.tsx`, `sheet.tsx` | Use `Sheet` for mobile menus or side-panels. |
| **Navigation** | `tubelight-navbar.tsx`, `menubar.tsx` | `TubelightNavbar` provides a high-end glowing effect suitable for top-level/marketing usage. |
| **Feedback** | `spinner.tsx`, `tooltip.tsx`, `badge.tsx` | Use `Spinner` for loading states inside Suspense boundaries. |
| **Forms** | `input.tsx`, `label.tsx`, `radio-group.tsx` | Wrap inputs in `Label` for accessibility. |
| **Overlays** | `dialog.tsx`, `dropdown-menu.tsx` | Use `Dialog` for modals (e.g., "Create Chat"). |

## 4. Feature Workflows

### Workflow A: Creating a New Feature View
1.  **Route Creation**: Create `src/app/[feature]/page.tsx`.
2.  **Layout**: Ensure it creates a `SidebarProvider` context or sits within the main DashboardLayout.
3.  **Data Fetching**: Fetch data directly in the generic `page.tsx` (Server Component).
    ```tsx
    import { db } from "@/db";
    import { chats } from "@/db/schema";
    
    export default async function FeaturePage() {
      const data = await db.select().from(chats);
      return <FeatureClientView initialData={data} />;
    }
    ```

### Workflow B: Building an Interactive Form (e.g., Chat Input)
1.  **Client Component**: Create a component marked with `'use client'`.
2.  **UI Construction**:
    - Use `Input` or `Textarea` for content.
    - Use `Button` (with `Spinner` if `isSubmitting`) for actions.
    - Use `Tooltip` for icon-only buttons.
3.  **Validation**: Ensure all inputs utilize valid `Label` components.

### Workflow C: Implementation of "Content Library"
Based on the `libraryItems` schema:
1.  **List View**: Use `Card` (if available) or styled `div`s with `Badge` to show status (`draft`, `published`).
2.  **Filter**: Use `DropdownMenu` or `RadioGroup` to filter by `type` (text, image, carousel).
3.  **Action**: Use `Dialog` to open a preview of the content using `DialogContent` and `DialogDescription`.

## 5. Code Patterns & Snippets

### Tailwind Class Merge Pattern
```tsx
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### Typical Sidebar Setup
(Based on `src/components/ui/sidebar.tsx`)
```tsx
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarBody>
        <SidebarLink link={{ label: "Chats", href: "/chats", icon: <ChatIcon /> }} />
        <SidebarLink link={{ label: "Library", href: "/library", icon: <LibIcon /> }} />
      </SidebarBody>
    </Sidebar>
  );
}
```

## 6. Verification Checklist
Before finishing a task:
- [ ] Are all generic UI components imported from `@/components/ui`?
- [ ] Is `cn()` used for conditional classes?
- [ ] Are hardcoded colors replaced with Tailwind classes?
- [ ] Is the page responsive (using standard Tailwind breakpoints `md:`, `lg:`)?
- [ ] Are icons implemented using `lucide-react`?
```
