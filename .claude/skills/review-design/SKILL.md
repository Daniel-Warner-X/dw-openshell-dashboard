---
name: review-design
description: Provides comprehensive design review covering usability, visual design, accessibility, and PatternFly compliance. Use this skill when you want a fresh perspective on a prototype before sharing it with stakeholders.
---

# Review Design

A comprehensive design review covering usability, visual design, content,
accessibility and PatternFly compliance.

## When to Use This Skill

- Before sharing a prototype with stakeholders
- When you want a fresh perspective on your design
- To catch usability or accessibility issues early

## Inputs

Provide a file or directory path to review (e.g. `frontend/src/pages/SandboxList.tsx`).

## Context

- Project: **OpenShell Dashboard** — a web admin UI for OpenShell (React + PatternFly 6)
- Design standards: **PatternFly 6** and **WCAG 2.1 AA**
- **PatternFly documentation**: use the `patternfly-docs` MCP server for current
  guidelines, component docs and accessibility standards
- Personas this UI serves (from `CLAUDE.md`) — review against whichever applies:
  - **Platform Admin** — cross-workspace: gateway info, workspace CRUD, platform providers
  - **Workspace Admin** — per-workspace: members, providers, policies, inference
  - **User** — per-workspace: sandbox CRUD, logs, connect

## Your Role

You're giving a fresh perspective, like another designer reviewing the work —
usability, visual polish, accessibility, and whether it follows PatternFly.

## Important

Reference the latest PatternFly documentation through the `patternfly-docs` MCP
server so feedback matches current standards. If that server isn't available,
say so at the top of your review rather than letting the reader assume it was
consulted.

For a prototype, weight the feedback accordingly: a rough edge that exists only
to make the idea legible is not a defect. Call out what would block the *idea*
from being evaluated, and keep production-polish notes in the lowest tier.

## What Gets Reviewed

### User experience
- **Is it intuitive?** Can users figure out what to do without instructions?
- **Is it efficient?** Can users complete the task quickly?
- **Is the hierarchy clear?** Do important things stand out?
- **Are interactions obvious?** Do controls look actionable?
- **Is there feedback?** Do users know what's happening, especially during async work?
- **Does it handle errors and empty states?** Are messages helpful and constructive?

### Visual design
- **Does it look polished?**
- **Is the hierarchy clear** between headings, body and labels?
- **Is spacing consistent and balanced?**
- **Are colors helping or distracting?**
- **Do icons read clearly and consistently?**

### Content and messaging
- **Is the copy clear** and free of unexplained jargon?
- **Is the tone professional but approachable?**
- **Do buttons and links say what they do?**
- **Are empty states useful** — do they explain why it's empty and what to do?

### Accessibility (WCAG 2.1 AA)
- **Keyboard**: is everything reachable and operable, in a sensible order?
- **Screen readers**: are controls labeled, and is state announced?
- **Contrast**: does text meet AA?
- **Focus**: is the focus indicator visible and never suppressed?
- **Color**: is color never the only carrier of meaning?

### PatternFly compliance
- **Does it match the design system?**
- **Is it consistent with the rest of the dashboard?**
- **Could a PatternFly component replace something custom?**

For a deep PatternFly-only pass, use the `check-patternfly-compliance` skill instead.

## What You'll Get

1. **Overall assessment**
   - **The good**: what's working
   - **The concerns**: what needs attention
   - **The verdict**: Ready to share / Needs some fixes / Needs rework

2. **Detailed feedback**, each item with:
   - **The problem**: plain description
   - **Where**: `file:line`
   - **Why it matters**: impact on users
   - **How to improve**: a specific suggestion
   - **Priority**: Must fix / Should fix / Consider later

3. **Recommendations by priority**
   - **Fix now** — serious usability or accessibility problems
   - **Fix soon** — polish and consistency
   - **Consider later** — future enhancements

4. **What to do next** — clear action items, most important first.

Be specific and honest. A review that says everything is fine is only useful if
it's true; if you did not examine something, say so rather than implying you did.
