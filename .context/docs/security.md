# Security & Compliance

This document outlines the security architecture, policies, and best practices for the **Máquina de Conteúdo** project. As a Next.js application utilizing React Server Components and client-side interactivity, security is handled at multiple layers.

## Authentication & Authorization

> **Status:** Implementation Pending/TBD
>
> *Architecture decisions regarding specific providers (NextAuth, Clerk, Supabase, etc.) should be documented here once finalized.*

### Standard Protocols
When implementing authentication, the following standards must be adhered to:

*   **Identity Providers (IdP):** Prefer OAuth 2.0 / OIDC providers (Google, GitHub, Microsoft) over local username/password storage.
*   **Session Management:**
    *   Use HTTP-only, Secure, SameSite cookies for session tokens.
    *   Avoid storing sensitive tokens (JWTs) in `localStorage` or `sessionStorage` to prevent XSS exfiltration.
*   **RBAC (Role-Based Access Control):**
    *   **Admin:** Full access to settings, user management, and all content.
    *   **Editor:** Access to create and modify content.
    *   **Viewer:** Read-only access to published content.

## Secrets & Sensitive Data

### Environment Variables
We use Next.js environment variable conventions to manage configuration and secrets.

*   **Storage:** Local secrets are stored in `.env.local` (git-ignored).
*   **Exposure:**
    *   **Server-side:** Variables meant for the server (e.g., `DATABASE_URL`, `API_SECRET`) must **not** have the `NEXT_PUBLIC_` prefix.
    *   **Client-side:** Only non-sensitive public configuration (e.g., `NEXT_PUBLIC_ANALYTICS_ID`) may use the `NEXT_PUBLIC_` prefix.
*   **CI/CD:** Secrets are injected via the deployment platform (Vercel, AWS, etc.) environment configuration settings.

### Data Handling
*   **Encryption at Rest:** All sensitive user data in the future database must be encrypted at rest.
*   **Encryption in Transit:** All traffic must be served over HTTPS (TLS 1.2+).

## Frontend Security

### Cross-Site Scripting (XSS)
*   **React Escaping:** React automatically escapes data bound in JSX. This is our primary defense.
*   **Dangerous APIs:** Avoid using `dangerouslySetInnerHTML`. If strictly necessary for rendering rich text content, use a sanitization library like `dompurify` before rendering.

### Input Validation
*   Inputs (via `src/components/ui/input.tsx`) and Forms must be validated on both Client and Server.
*   **Recommended libraries:** `zod` for schema definition and `react-hook-form` for form management.

### Component Security
This project uses components based on Radix UI primitives (via shadcn/ui).
*   **Accessibility:** Components like `Dialog`, `Sheet`, and `DropdownMenu` manage focus traps and screen reader announcements, reducing the risk of UI-redressing attacks.
*   **Updates:** Regularly update generic UI components to patch internal logic vulnerabilities.

## Dependency Management

*   **Auditing:** Run `npm audit` on a regular cadence (e.g., before every major release).
*   **Lockfile:** Ensure `package-lock.json` is committed to guarantee consistent dependency trees across environments.
*   **Tooling:** Use Dependabot or Renovate to automate patch updates.

## Compliance & Policies

### Accessibility (a11y)
Compliance with **WCAG 2.1 AA** standards is a priority for the "styleguide" and UI components.
*   All interactive elements must have focus states.
*   Using primitives like `src/components/ui/tooltip.tsx` and `label.tsx` ensures proper ARIA attributes are maintained.

## Incident Response

In the event of a security breach or vulnerability discovery:

1.  **Detection:** Monitor logs and user reports.
2.  **Triage:** Assess severity (Critical, High, Medium, Low).
3.  **Containment:**
    *   Rotate compromised secrets immediately.
    *   Roll back deployment if a specific commit introduced the vulnerability.
4.  **Remediation:** Apply patches and verify fixes in a staging environment.
5.  **Post-Mortem:** specific incident analysis to prevent recurrence.

---

*Last Updated: 2026-01-14*
