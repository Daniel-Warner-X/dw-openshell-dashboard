---
name: check-patternfly-compliance
description: Reviews a page or component to verify PatternFly 6 design system compliance. Use this skill when you need to check if a design follows PatternFly standards for components, spacing, colors, and accessibility, or before sharing a prototype.
---

# Check PatternFly Compliance

Reviews a page or component to make sure it's using PatternFly 6 correctly and consistently.

## When to Use This Skill

- Verifying a prototype follows PatternFly standards before sharing
- Checking component usage in a specific file or directory
- Ensuring a new page is consistent with the rest of the dashboard

## Inputs

Provide a file or directory path to check (e.g. `frontend/src/pages/SandboxList.tsx`).

## Context

- Design system: **PatternFly 6**, via `@patternfly/react-core`
- **PatternFly documentation**: use the `patternfly-docs` MCP server for current
  component docs, design guidelines and accessibility standards
- **This repo's own rules are authoritative where they are stricter.** Read
  `.claude/rules/react.md` before reporting; it defines the styling hierarchy,
  import style and testing conventions this codebase enforces. Where a general
  PatternFly practice and this repo's rule disagree, the repo's rule wins — say
  so explicitly rather than silently picking one.

## Your Role

You're helping a designer confirm their work follows PatternFly — the right
components, spacing, colors and patterns that keep the UI consistent.

## Important

**Always check the latest PatternFly documentation** through the `patternfly-docs`
MCP server. If that server is not available in this session, say so up front and
continue — your findings are then based on the repo's rules and your own
knowledge, which is a weaker basis, and the user should know that.

## Process

1. **Get the current PatternFly documentation**
   - Fetch docs for each component under review from the MCP server
   - Pull the relevant design guidelines and accessibility standards

2. **Read this repo's rules**
   - `.claude/rules/react.md` — styling hierarchy, imports, TypeScript, testing
   - `CLAUDE.md` — the PatternFly-only constraint and downstream-consumption rules

3. **Review the code**
   - Read the target files
   - Identify every PatternFly component used
   - Check configuration and usage against both sources above

## What to Check

### Are we using the right components?
- [ ] PatternFly components instead of custom ones
- [ ] Components used for their intended purpose
- [ ] Not reinventing something PatternFly already provides
- [ ] Barrel imports (`import { Button } from '@patternfly/react-core'`)

### Does it look like PatternFly?
- [ ] PatternFly color tokens, never hardcoded values
- [ ] PatternFly spacing, not custom gaps or margins
- [ ] Layout follows PatternFly patterns
- [ ] Typography follows the PatternFly scale

### Does it follow this repo's styling hierarchy?
Per `.claude/rules/react.md`, in order of preference:
- [ ] **PF component props first** — `<Flex gap={{ default: 'gapSm' }}>`, `<Content component="p">`
- [ ] **PF utility classes** only where no prop exists — `pf-v6-u-text-truncate`
- [ ] **No `style={{}}` props, no hardcoded inline values**

### Is it consistent?
- [ ] Button variants match comparable buttons elsewhere
- [ ] Spacing is consistent across the page
- [ ] Component variants used appropriately

### Is it configured correctly?
- [ ] Accessibility features not removed or overridden
- [ ] `data-testid` on interactive and testable elements
- [ ] Component options and variants set properly

## What You'll Get

1. **Summary** — does this follow PatternFly? What works, what needs fixing.

2. **Issues found**, each with:
   - **What's not PatternFly**: plain description
   - **Where**: `file:line`
   - **Why it matters**: effect on consistency or maintainability
   - **The PatternFly way**: how to do it properly, with the component or prop named
   - **Priority**: Must fix / Should fix / Nice to fix

3. **Recommendations** — better components or patterns for this use case.

4. **What to do next** — a prioritized list of fixes.

Report only what you actually verified. If you could not check something —
the MCP server was unavailable, or a file was out of scope — say which, rather
than implying full coverage.
