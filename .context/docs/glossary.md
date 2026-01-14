# Glossary & Domain Concepts

This document defines the terminology, acronyms, and technical concepts used within the **Máquina de Conteúdo** (Content Machine) repository. It serves as a reference for developers to understand the domain language and structural components of the application.

## Core Domain Terms

Key concepts related to the business logic and application structure.

| Term | Definition | Context |
|------|------------|---------|
| **Content Machine** | The overarching application designed to automate, manage, or facilitate content creation workflows. | Project Root |
| **Styleguide** | An isolated environment within the app used to develop, test, and document UI components independently of the main business logic. | `src/app/styleguide` |
| **Tubelight Navigation**| A specific UI pattern for navigation bars that features a moving "light" or active indicator effect tracking the selected item. | `src/components/ui/tubelight-navbar.tsx` |

## Technical Terminology & Utils

Terms related to the codebase architecture and utility functions.

### `cn` (Classname Utility)
A utility function that merges tailwind classes conditionally. It combines `clsx` for conditional logic and `tailwind-merge` to resolve conflicting classes (e.g., overriding padding).
- **Source:** [`src/lib/utils.ts`](src/lib/utils.ts)

### Sidebar Context
A React Context provider that manages the global state of the application's sidebar (expanded, collapsed, mobile view). It relies on cookies to persist state across reloads.
- **Source:** [`src/components/ui/sidebar.tsx`](src/components/ui/sidebar.tsx)

### Mobile Breakpoint
The specific screen width threshold used to determine if the layout should switch to mobile mode. Governed by the `useIsMobile` hook.
- **Source:** [`src/hooks/use-mobile.ts`](src/hooks/use-mobile.ts)

## Type Definitions

Key TypeScript interfaces and types used to enforce data structures across the application.

### `NavItem`
Defines the structure for a single navigation link within menus or sidebars.
- **Properties:**
  - `title`: Display text.
  - `url`: Destination path.
  - `icon` (optional): Lucide icon component.
  - `isActive` (optional): Boolean state.
  - `items` (optional): Nested sub-menu items.
- **Defined in:** [`src/app/styleguide/navigation.ts`](src/app/styleguide/navigation.ts)

### `NavSection`
Represents a grouped collection of `NavItem` objects, usually rendered with a section header in the sidebar.
- **Properties:**
  - `title`: Section header text.
  - `items`: Array of `NavItem`.
- **Defined in:** [`src/app/styleguide/navigation.ts`](src/app/styleguide/navigation.ts)

### `SidebarContextProps`
Usage definition for the Sidebar state management.
- **Properties:**
  - `state`: 'expanded' | 'collapsed'.
  - `open`: Boolean alias for expanded state.
  - `setOpen`: State setter function.
  - `openMobile`: Boolean state for mobile drawer.
  - `setOpenMobile`: State setter for mobile drawer.
  - `isMobile`: Boolean indicating current viewport.
  - `toggleSidebar`: Helper function to switch states.
- **Defined in:** [`src/components/ui/sidebar.tsx`](src/components/ui/sidebar.tsx)

## Acronyms & Abbreviations

| Acronym | Full Term | Description |
|---------|-----------|-------------|
| **UI** | User Interface | Refers to the visual components in `src/components/ui`. |
| **DX** | Developer Experience | Relates to the setup in `styleguide` for easier component development. |
| **a11y** | Accessibility | Often referenced regarding screen reader supports (Radix primitives). |

## Personas / Actors

| Persona | Description | Key Workflows |
|---------|-------------|---------------|
| **Developer** | Maintains the codebase and builds new UI components. | Uses the `Styleguide` to test components; implements `Sidebar` layouts. |
| **Content Creator** | The end-user of the application. | Interacts with the `RootLayout` navigation to access content tools. |

## Domain Rules & Invariants

1.  **Sidebar Persistence**: The state of the sidebar (expanded/collapsed) must be persisted via cookies `sidebar:state` to prevent layout flickering on page reloads.
2.  **Mobile First**: UI components like `Sheet` and `Sidebar` must handle mobile viewports (`MICSS` breakpoints) gracefully using the `useIsMobile` hook hierarchy.
3.  **Component Isolation**: Components in `src/components/ui` should be "dumb" (presentational) where possible, receiving data via props, while logic usage resides in `src/app`.
