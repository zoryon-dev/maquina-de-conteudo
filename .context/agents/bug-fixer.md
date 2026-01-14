---
status: unfilled
generated: 2026-01-14
---

# Bug Fixer Agent Playbook

## Mission
Describe how the bug fixer agent supports the team and when to engage it.

## Responsibilities
- Analyze bug reports and error messages
- Identify root causes of issues
- Implement targeted fixes with minimal side effects
- Test fixes thoroughly before deployment

## Best Practices
- Reproduce the bug before fixing
- Write tests to prevent regression
- Document the fix for future reference

## Key Project Resources
- Documentation index: [docs/README.md](../docs/README.md)
- Agent handbook: [agents/README.md](./README.md)
- Agent knowledge base: [AGENTS.md](../../AGENTS.md)
- Contributor guide: [CONTRIBUTING.md](../../CONTRIBUTING.md)

## Repository Starting Points
- `drizzle/` — TODO: Describe the purpose of this directory.
- `public/` — TODO: Describe the purpose of this directory.
- `src/` — TODO: Describe the purpose of this directory.

## Key Files
- *No key files detected.*

## Architecture Context

### Utils
Shared utilities and helpers
- **Directories**: `src/lib`
- **Symbols**: 1 total
- **Key exports**: [`cn`](src/lib/utils.ts#L4)

### Components
UI components and views
- **Directories**: `src/components`, `src/app`, `src/components/ui`, `src/app/styleguide`
- **Symbols**: 26 total
## Key Symbols for This Agent
- [`NavItem`](src/app/styleguide/navigation.ts#L1) (interface)
- [`NavSection`](src/app/styleguide/navigation.ts#L6) (interface)

## Documentation Touchpoints
- [Documentation Index](../docs/README.md)
- [Project Overview](../docs/project-overview.md)
- [Architecture Notes](../docs/architecture.md)
- [Development Workflow](../docs/development-workflow.md)
- [Testing Strategy](../docs/testing-strategy.md)
- [Glossary & Domain Concepts](../docs/glossary.md)
- [Data Flow & Integrations](../docs/data-flow.md)
- [Security & Compliance Notes](../docs/security.md)
- [Tooling & Productivity Guide](../docs/tooling.md)

## Collaboration Checklist

1. Confirm assumptions with issue reporters or maintainers.
2. Review open pull requests affecting this area.
3. Update the relevant doc section listed above.
4. Capture learnings back in [docs/README.md](../docs/README.md).

## Hand-off Notes

Summarize outcomes, remaining risks, and suggested follow-up actions after the agent completes its work.
