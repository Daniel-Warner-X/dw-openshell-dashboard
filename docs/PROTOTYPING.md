# Prototyping environment

This fork is a place to iterate on UI-focused prototypes of the OpenShell
Dashboard and share them. It adds a prototyping toolchain on top of the
upstream dashboard; nothing here changes how the dashboard itself builds or runs.

## Setup

```bash
./scripts/prototyping-setup.sh
```

Then restart Claude Code so it picks up the new skills.

The script initializes the submodules and links their skills into
`.claude/skills/`. It is idempotent and repairs stale links, so re-run it
whenever a submodule moves.

## What's here

| Piece | Where it comes from | What it is |
|---|---|---|
| **prototype-creator** | [andybraren/prototype-creator](https://github.com/andybraren/prototype-creator) | A pipeline that turns an idea into a clickable prototype, then scores it against a UX rubric. 19 skills — 9 `prototype-*` plus 10 `eval-*` nested under its `eval/` directory. |
| **Decision Kit** | [jnemargut/decision-kit](https://github.com/jnemargut/decision-kit) | A planning layer that surfaces decisions as browsable comparisons before code is written. 35 skills. |
| **check-patternfly-compliance** | adapted from the RHOAI prototyping repo | PatternFly 6 compliance pass over a file or directory. |
| **review-design** | adapted from the RHOAI prototyping repo | Usability, visual, content and accessibility review. |

Both upstream repos are pinned as **git submodules** under `.agents/skills/`.
They are not copied, so they can be updated independently:

```bash
git submodule update --remote .agents/skills/decision-kit
./scripts/prototyping-setup.sh   # re-link in case skills were added or renamed
```

## Layout

Claude Code only discovers skills at `.claude/skills/<name>/SKILL.md`, so each
vendored skill is symlinked into place — 60 skills total, 6 real directories
and 54 links:

```
.agents/skills/
  prototype-creator/     submodule — .claude/skills/, incl. a nested eval/ group
  decision-kit/          submodule — thinking/ action/ configuration/ orchestrator/
.claude/skills/
  add-page/ add-rpc/ dev-workflow/ proto-sync/        real dirs (upstream)
  check-patternfly-compliance/ review-design/          real dirs (this fork)
  prototype-create -> ../../.agents/skills/prototype-creator/...   54 symlinks
  eval-usability -> ../../.agents/skills/prototype-creator/.claude/skills/eval/...
  decide -> ../../.agents/skills/decision-kit/orchestrator/decide
  ...
```

The layout is not uniform, which is why the script discovers skills by looking
for `SKILL.md` rather than globbing one level down: prototype-creator's `eval/`
is a plain container holding ten more skills, so a flat glob would both miss
those and register `eval` itself as a skill it isn't.

A fresh clone needs `git clone --recurse-submodules`, or the symlinks dangle
until `./scripts/prototyping-setup.sh` runs.

## How the two toolkits relate

They are not alternatives — prototype-creator depends on Decision Kit. Its
"decide mode" emits a Decision Kit artifact at each design junction, and it
ships `scripts/bootstrap-decision-kit.sh`, which sparse-checkouts its own copy
into `.context/decision-kit` (gitignored). That private copy is separate from
the submodule here and is only used by prototype-creator's internals.

## Using it

Start with Decision Kit when the question is *what to build*:

```
/decide should the sandbox list group by workspace or by label?
```

It surfaces options with tradeoffs and waits for your call, writing an HTML
artifact to `.decisions/`.

Use prototype-creator when the question is *what it looks like*. It was built
around an RFE/Jira pipeline, which this fork does not use; the parts that apply
here are:

- `/prototype-speedrun` — fastest path from idea to a clickable artifact
- `/prototype-create --workspace=.` — target this codebase rather than a
  standalone HTML file, so prototypes use the real React + PatternFly components
- `/prototype-review` — score against the UX rubric
- `/prototype-refine` — iterate on the result

Skip `prototype-pull`, `prototype-push` and `prototype-submit` unless you wire up
the Jira/CI side; they assume that pipeline.

Then `review-design` and `check-patternfly-compliance` for a design pass before
sharing.

## Dependencies

- **`patternfly-docs` MCP server** — configured in `.mcp.json`, run via `npx` on
  demand. Both review skills use it for current PatternFly docs; approve it when
  Claude Code prompts. They degrade gracefully and will tell you if it's absent.
- **`uv`** — only needed for prototype-creator's Python scripts (scoring,
  publishing). Run `uv sync` inside the submodule if you use those.
