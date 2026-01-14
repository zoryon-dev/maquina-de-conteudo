```markdown
# Project Overview

"Máquina de Conteúdo" is a modern web application built with Next.js, designed to facilitate content creation or management tasks. The project utilizes a component-driven architecture with a strong emphasis on a modular UI system, likely aimed at providing a streamlined user interface for content generators.

## Quick Facts

- **Root path**: `/Users/jonasviana/Documents/repositorios_git/maquina-de-conteudo`
- **Primary stack**: Next.js (App Router), TypeScript, Tailwind CSS.
- **Language**: TypeScript (`.ts`, `.tsx`) is strictly enforced.
- **Project Type**: Web Application.

## Architecture & Code Organization

The project follows the standard **Next.js App Router** structure, organized to separate routing, UI components, and business logic.

### Directory Structure

- **`src/app/`**: Contains the application routes, layouts, and pages.
    - **`styleguide/`**: A specific route dedicated to documenting and testing UI components, utilizing `navigation.ts` for structure.
    - **`layout.tsx`**: Defines the root layout structure, wrapping the application.
- **`src/components/ui/`**: A library of reusable UI components (Buttons, Inputs, Dialogs, Sidebars). This structure strongly suggests usage of **shadcn/ui** or a similar headless UI implementation.
- **`src/hooks/`**: Custom React hooks (e.g., `use-mobile.ts` for responsive logic).
- **`src/lib/`**: Utility functions (e.g., `cn` for class merging).
- **`drizzle/`**: Directory reserved for Database schemas and migrations (Drizzle ORM).
- **`public/`**: Static assets.

## Technology Stack

### Core Frameworks
- **Next.js**: The primary React framework handling routing, rendering (SSR/CSR), and build optimization.
- **React**: The library for building the user interface.
- **TypeScript**: Used for static typing across the entire codebase.

### Styling & UI
- **Tailwind CSS**: Utility-first CSS framework used for styling components.
- **Shadcn UI (Inferred)**: The presence of `components.json` and the structure of `src/components/ui` (containing `sheet`, `dialog`, `separator`) indicates the use of Shadcn UI components built on top of Radix UI primitives.
- **Lucide React**: Likely used for iconography (standard with Shadcn UI).

### Data Layer
- **Drizzle ORM**: The `drizzle/` directory suggests this is used as the Object Relational Mapper for database interactions.

## Key Concepts & Components

### 1. Styleguide & Navigation
The project includes a built-in styleguide to manage component development.
- **`NavItem` & `NavSection`**: Interfaces defined in `src/app/styleguide/navigation.ts` to structure the documentation navigation.

### 2. UI Component Ecosystem
The application relies heavily on composed UI components located in `src/components/ui`:
- **Layout Components**: `Sidebar`, `Sheet`, `Menubar`, `Separator`.
- **Feedback Components**: `Spinner`, `Badge`, `Skeleton`.
- **Form Elements**: `Input`, `Label`, `RadioGroup`.
- **Specialized Components**: `TubelightNavbar` suggests custom, high-fidelity UI elements.

### 3. Utility Patterns
- **`cn()`**: A utility function located in `src/lib/utils.ts` that combines `clsx` and `tailwind-merge` to handle conditional class names dynamically and prevent conflicts.

## Getting Started

To set up the development environment:

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Run Development Server**:
    ```bash
    npm run dev
    ```

3.  **Database Setup (If applicable)**:
    Check `package.json` for Drizzle kit commands (e.g., `npm run db:push` or `drizzle-kit generate`).

## Configuration Files

- **`next.config.ts`**: Core Next.js configuration.
- **`components.json`**: Configuration for the shadcn/ui CLI.
- **`postcss.config.mjs`**: Configuration for CSS processing.
- **`tsconfig.json`**: TypeScript compiler options.
```
