```markdown
---
name: Feature Developer
role: frontend-feature-implementation
description: Specialist in building user-facing features using Next.js App Router, Shadcn UI components, and TypeScript.
expertise:
  - nextjs-app-router
  - react-server-components
  - shadcn-ui
  - tailwind-css
  - typescript
  - client-vs-server-components
---

# Feature Developer Playbook

## 1. Project Architecture & Standards

### Implementation Strategy
- **Framework**: Next.js (App Router) with TypeScript.
- **Styling**: Tailwind CSS.
- **Component Library**: Custom implementation based on Shadcn UI (`src/components/ui`).
- **Icons**: Lucide React (inferred from standard Shadcn usage).

### Directory Structure
- `src/app/`: Route definitions and page-level logic.
- `src/components/ui/`: Atomic design system components (buttons, inputs, dialogs).
- `src/components/`: Composite feature components (e.g., specific forms, dashboard widgets).
- `src/lib/`: Utility functions (checking for `utils.ts` for `cn()` helper).

---

## 2. UI Component Usage Guide

The application relies heavily on a local UI library. **Do not install external UI libraries** (like MUI or Chakra) unless strictly necessary. Reuse the existing components in `src/components/ui`.

### Common Patterns
Most UI components use a Composition pattern (Headless UI style).

**Modals & Sheets (Sidebars/Drawers)**
```tsx
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet"; // or dialog

export function FeaturePanel() {
  return (
    <Sheet>
      <SheetTrigger>Open Panel</SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Feature Configuration</SheetTitle>
        </SheetHeader>
        {/* Content goes here */}
      </SheetContent>
    </Sheet>
  );
}
```

**Form Elements**
Always wrap inputs in a `Label` for accessibility.
```tsx
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

<div className="grid w-full max-w-sm items-center gap-1.5">
  <Label htmlFor="email">Email</Label>
  <Input type="email" id="email" placeholder="Email" />
</div>
```

**Navigation**
The app uses a specific `TubelightNavbar`.
- **Location**: `src/components/ui/tubelight-navbar.tsx`
- **Usage**: Check the `NavBarProps` interface.
```tsx
import { NavBar } from "@/components/ui/tubelight-navbar";

const navItems = [
  { name: 'Home', url: '/', icon: HomeIcon },
  { name: 'Features', url: '/features', icon: Sparkles }
];

// In layout or page
<NavBar items={navItems} />
```

---

## 3. Workflow: Creating a New Feature

### Step 1: Route Definition
Create the folder structure in `src/app`. Determine if the page is Public or Protected (requires Auth).

**Example: A "Generator" Feature**
File: `src/app/generator/page.tsx`

```tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function GeneratorPage() {
  // 1. Server-side Auth Check (if not handled by middleware)
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  // 2. Render Page
  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <h1 className="text-3xl font-bold mb-6">Content Generator</h1>
      {/* 3. Load Client Component for interactivity */}
      <GeneratorForm />
    </main>
  );
}
```

### Step 2: Interactive Logic (Client Component)
Complex user interactions (forms, toggles, generic state) must remain in Client Components (`'use client'`).

File: `src/components/generator-form.tsx`

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button"; // Assuming exist or use similar
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export function GeneratorForm() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Logic here
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input placeholder="Enter topic..." />
      <Button disabled={loading}>
        {loading ? <Spinner /> : "Generate"}
      </Button>
    </form>
  );
}
```

---

## 4. Layout & Navigation Integration

### Sidebar Integration
If the feature requires the Sidebar context:
1. Ensure the `SidebarProvider` wraps the layout (usually done in root).
2. Use `useSidebar` in client components to trigger usage.

```tsx
"use client";
import { useSidebar } from "@/components/ui/sidebar";

export function ToggleSidebarButton() {
  const { toggleSidebar } = useSidebar();
  return <button onClick={toggleSidebar}>Menu</button>;
}
```

### Loading States
Use the existing `Spinner` component for loading states instead of creating new ones.
- Import: `import { Spinner } from "@/components/ui/spinner";`

---

## 5. Best Practices & Rules

1.  **State Management**:
    - Use Server Components (`src/app/page.tsx`) for data fetching and auth checks.
    - Use Client Components (`"use client"`) *only* for event listeners (`onClick`, `onChange`) and React hooks (`useState`, `useEffect`).

2.  **Responsiveness**:
    - Use Tailwind classes (`md:`, `lg:`) to ensure features work on mobile.
    - Test `Sheet` components on mobile (they usually act as drawers).

3.  **Styling**:
    - Do not use CSS modules. Use `className` with Tailwind utility classes.
    - Utilize `cn()` (likely in `src/lib/utils.ts`) for conditional classes:
      `className={cn("bg-blue-500", isActive && "bg-blue-700")}`

4.  **Icons**:
    - Stick to standard Lucide icons found in the codebase project dependencies.

5.  **Filesystem Organization**:
    - **Page**: `src/app/[feature]/page.tsx`
    - **Layout**: `src/app/[feature]/layout.tsx` (if specific structure needed)
    - **Feature Components**: `src/components/[feature-name]/[component].tsx` (Create subfolders in user components to keep `src/components` clean).
```
