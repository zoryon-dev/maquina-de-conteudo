# Development Workflow

This document outlines the day-to-day engineering process for the **Maquina de Conteudo** repository. It covers environment setup, coding standards, branching strategies, and review processes.

## 1. Local Development Setup

### Prerequisites
- **Node.js**: Ensure you have the latest LTS version installed.
- **npm**: Used as the package manager.
- **Git**: For version control.

### Installation & Execution

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/jonasviana/maquina-de-conteudo.git
    cd maquina-de-conteudo
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Start the development server**:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.

4.  **Build for production**:
    To verify the build process locally before pushing:
    ```bash
    npm run build
    ```

## 2. Project Architecture

The project follows a modern Next.js App Router structure:

| Directory | Purpose |
| to | to |
| `src/app` | Main application routes and pages (App Router). |
| `src/components/ui` | Reusable UI components (buttons, dialogs, sidebar), primarily based on *shadcn/ui*. |
| `src/lib` | Utility functions (including the `cn` helper for Tailwind). |
| `src/hooks` | Custom React hooks (e.g., `use-mobile.ts`). |
| `src/app/styleguide` | Internal documentation regarding navigation and style references. |

### Component Guidelines
- **Styling**: We use **Tailwind CSS**.
- **Class Merging**: Always use the `cn()` utility from `src/lib/utils.ts` when accepting `className` props to ensure proper overrides.
    ```tsx
    import { cn } from "@/lib/utils"

    export function MyComponent({ className, ...props }: Props) {
      return <div className={cn("bg-primary p-4", className)} {...props} />
    }
    ```
- **Structure**: Keep components small and focused. Complex logic should be extracted to custom hooks in `src/hooks`.

## 3. Branching & Version Control

We follow a **Feature Branch Workflow**.

### Branch Naming Convention
- **Features**: `feat/short-description` (e.g., `feat/sidebar-navigation`)
- **Bug Fixes**: `fix/issue-description` (e.g., `fix/mobile-menu-overflow`)
- **Refactoring**: `refactor/component-name`
- **Documentation**: `docs/update-workflow`

### Commit Messages
We encourage **Conventional Commits** to keep history readable:
- `feat: add new tooltip component`
- `fix: resolve hydration error in layout`
- `style: update navbar padding`
- `chore: bump dependencies`

### Pull Request Process
1.  Create a branch from `main`.
2.  Implement your changes.
3.  Push to origin and open a Pull Request (PR).
4.  Ensure CI checks pass (build, lint).

## 4. Code Review Expectations

All changes must be reviewed before merging to `main`.

### Review Checklist
- **Functionality**: Does the code do what it claims?
- **Responsiveness**: Did you check `useIsMobile` behavior and mobile viewports?
- **Accessibility**:
    - Are `aria-label` functionality used where text is missing?
    - Do standard UI components (`Dialog`, `Sheet`, `Dropdown`) manage focus correctly?
- **Type Safety**: Are there explicit `any` types? (Avoid them).
- **Clean Code**: Are unused imports removed? Is the formatting consistent?

### Collaboration with Agents
If you are using AI agents to assist in development, please refer to [AGENTS.md](../../AGENTS.md) for best practices on prompting and context sharing.

## 5. Styleguide & Navigation

When working on layout or navigation changes:
1.  Check `src/app/styleguide/navigation.ts` for the source of truth regarding `NavItem` and `NavSection` structures.
2.  Verify the `RootLayout` in `src/app/layout.tsx` to ensure global styles are not negatively impacted.
3.  Test the `TubelightNavbar` or `Sidebar` components on both desktop and mobile.

## 6. Onboarding Tasks

New to the specific codebase? Start here:

1.  **Explore the UI Library**: Look through `src/components/ui/` to understand the available building blocks (Sheet, Dialog, Tooltip, etc.).
2.  **Review Utilities**: Open `src/lib/utils.ts` to understand how styles are managed.
3.  **Run a Build**: Ensure your environment is set up correctly by running `npm run build` successfully.
4.  **Pick a "Good First Issue"**: Look for UI glitches or minor responsiveness tweaks in the issue tracker.
