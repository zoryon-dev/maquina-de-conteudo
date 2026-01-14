# Documentation Index

Welcome to the **Maquina de Conteúdo** repository knowledge base. This directory acts as the central hub for all technical documentation, architectural decisions, and development guidelines.

## 📚 Core Guides

Start here to understand the project landscape, setup, and development standards.

| Guide | Description | Target Audience |
|-------|-------------|-----------------|
| **[Project Overview](./project-overview.md)** | Roadmap, vision, stakeholders, and high-level goals. | All |
| **[Development Workflow](./development-workflow.md)** | Environment setup, Git branching strategies, CI configurations, and contribution rules. | Developers |
| **[Architecture Notes](./architecture.md)** | System design, ADRs (Architecture Decision Records), service boundaries, and dependency graphs. | Architects, Leads |
| **[Testing Strategy](./testing-strategy.md)** | Testing frameworks, CI gates, coverage requirements, and handling flaky tests. | Developers, QA |
| **[Review Guidelines](./review-guidelines.md)** | Standards for code reviews, pull request templates, and merge criteria. | Developers |

## 🧠 Technical Deep Dives

Detailed explanations of specific domains and implementation details.

| Guide | Description | Key Concepts |
|-------|-------------|--------------|
| **[Data Flow & Integrations](./data-flow.md)** | System diagrams, API integration specs, and data lifecycle management. | Backend, Fullstep |
| **[Security & Compliance](./security.md)** | Authentication logic, secrets management, permission models, and compliance notes. | Security, DevOps |
| **[Tooling & Productivity](./tooling.md)** | CLI scripts, IDE configurations, generators, and automation workflows. | Developers |
| **[Glossary](./glossary.md)** | Domain-specific terminology, user personas, and business rules. | All |

## 🏗️ Codebase Structure

The application is built using **Next.js (App Router)** and **Shadcn/UI**.

```text
src/
├── app/               # Next.js App Router pages and layouts
│   ├── layout.tsx     # Root application layout
│   └── styleguide/    # Component styleguide and navigation logic
├── components/
│   └── ui/            # Reusable UI components (Shadcn + Custom)
│       ├── sidebar.tsx
│       ├── tubelight-navbar.tsx
│       └── ...
├── hooks/             # Custom React hooks (e.g., use-mobile.ts)
└── lib/               # Utility functions (e.g., cn for class merging)
```

## 🤝 How to contribute to documentation

Documentation is treated as code in this repository.
1.  **Update consistently**: If you change a core architectural pattern, update `architecture.md`.
2.  **Mermaid Diagrams**: Use Mermaid.js for diagrams where complex flows need visualization.
3.  **Cross-linking**: Always link related documents to help navigation.
