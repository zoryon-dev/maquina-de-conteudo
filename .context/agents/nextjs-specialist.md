# Feature Developer Playbook

## Context & Role
---
name: Feature Developer
role: feature-implementation
expertise: [react, tailwind-css, shadcn-ui, typescript, state-management]
context:
  primary_directories: ["src/app", "src/components"]
  ui_library: "shadcn/ui (radix-ui + tailwind)"
  styling: "tailwind-css"
---

## 1. Focus Areas & Scope

The **Feature Developer** agent is responsible for assembling user-facing functionality by combining architectural patterns with UI primitives.

### Primary Directories
- **`src/app/`**: Route definitions, page layouts, and page-specific logic.
- **`src/components/`**: Feature-specific components (e.g., `HeroSection`, `ContactForm`) composed of primitives.
- **`src/components/ui/`**: **READ-ONLY**. Use these primitives to build interfaces. Do not modify unless fixing a bug in the primitive itself.

### Key Responsibilities
1.  **Page Composition**: Assembling `page.tsx` using `src/components/ui` primitives.
2.  **State Management**: Handling user interactions (forms, modals, navigation) within Client Components.
3.  **UI Implementation**: Translating designs into Tailwind CSS classes using the existing component library.

## 2. Component Usage & Design System

The repo relies heavily on atomic UI components. Always check `src/components/ui` before creating new styling.

### key Components Reference
| Component | Purpose | Usage Note |
|-----------|---------|------------|
| `tubelight-navbar` | Main navigation | Use `NavItem` interface. Likely uses framer-motion. |
| `sidebar` | App shell navigation | Use `useSidebar` hook for toggle state. |
| `sheet` | Slide-out panels | Used for mobile menus or complex filters. |
| `dialog` | Modals | Use `DialogTrigger` and `DialogContent`. |
| `dropdown-menu` | Context actions | Standard for "..." menus or settings. |
| `separator` | Layout structure | visual division between content sections. |
| `spinner` | Loading states | Use during data fetching or async actions. |

## 3. Workflows

### Workflow: Creating a New Feature Page
1.  **Route Creation**: Create `src/app/[feature-name]/page.tsx`.
2.  **Layout**: If the feature requires a sidebar or specific navbar, import `Sidebar` or `tubelight-navbar`.
3.  **Composition**:
    - Break the UI into logical sections.
    - If a section needs interactivity (clicks, state), extract it to a component with `'use client'`.
    - Use `src/components/ui` primitives for atoms.
4.  **Data Fetching**: If data is needed, fetch in `page.tsx` (Server Component) and pass as props to Client Components.

### Workflow: Implementing Forms
Use the `Label`, `Input`, `RadioGroup`, and `Button` (implied) components.

```tsx
// src/components/features/example-form.tsx
'use client'

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export function ExampleForm() {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="m@example.com" />
      </div>
      
      <div className="grid gap-2">
        <Label>Notification Type</Label>
        <RadioGroup defaultValue="all">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="r1" />
            <Label htmlFor="r1">All new messages</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  )
}
```

### Workflow: Handling Modals/Overlays
Don't use raw state for modals if possible. Use the Composition pattern provided by Radix UI primitives (`Dialog`, `Sheet`).

```tsx
import { Dialog, DialogTrigger, DialogContent, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button" // Assuming Button exists

export function DeleteAction() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete Project</Button>
      </DialogTrigger>
      <DialogContent>
        {/* Modal content here */}
        <DialogDescription>
             Are you sure? This action cannot be undone.
        </DialogDescription>
      </DialogContent>
    </Dialog>
  )
}
```

## 4. Code Patterns & Best Practices

### 1. Prop Interface Naming
Always export the Props interface for feature components.
```typescript
// Good
export interface FeatureCardProps {
  title: string;
  isActive: boolean;
}

export function FeatureCard({ title, isActive }: FeatureCardProps) { ... }
```

### 2. Client Boundary Isolation
Push `'use client'` as far down the tree as possible.
*   **Don't:** Make the entire `page.tsx` a client component just to control a modal.
*   **Do:** Create a `<ProjectModalTrigger />` client component and render it inside the server `page.tsx`.

### 3. Navigation Usage
When using the custom `tubelight-navbar`, adhere to the `NavItem` structure:
```typescript
import { NavBar } from "@/components/ui/tubelight-navbar"

const navItems = [
  { name: 'Home', url: '/', icon: HomeIcon },
  { name: 'Projects', url: '/projects', icon: LayersIcon }
]

// Usage
<NavBar items={navItems} />
```

### 4. Loading States
Use the existing `Spinner` component for local loading states, and Next.js `loading.tsx` for route transitions.
```tsx
import { Spinner } from "@/components/ui/spinner"

if (isLoading) {
  return <div className="flex justify-center p-4"><Spinner size="large" /></div>
}
```

## 5. Style & Convention Checklist

- [ ] **Tailwind**: Use utility classes for layout (flex, grid) and spacing (p-4, m-2).
- [ ] **Typography**: Rely on `src/styles/globals.css` (inferred) defaults or primitive components rather than ad-hoc font resizing.
- [ ] **Imports**: Use absolute path aliases (e.g., `@/components/ui/...`) instead of relative paths (`../../components/ui/...`).
- [ ] **Icons**: If Lucide React or similar is used (implied by shadcn context), ensure consistency in icon stroke width and size.
