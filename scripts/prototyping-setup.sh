#!/usr/bin/env bash
# Set up the prototyping environment: vendored skill repos + skill symlinks.
#
# The prototyping skills live in two upstream repos, pinned here as git
# submodules under .agents/skills/. Claude Code only discovers skills at
# .claude/skills/<name>/SKILL.md, so this script links each one into place.
#
# Idempotent: safe to re-run. It repairs stale or dangling links rather than
# leaving them broken, which is the failure mode this layout is prone to.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

SKILLS_DIR=".claude/skills"
PROTO_SUB=".agents/skills/prototype-creator"
DK_SUB=".agents/skills/decision-kit"

info() { printf '  %s\n' "$*"; }
warn() { printf '  WARNING: %s\n' "$*" >&2; }

echo "==> Initializing submodules"
git submodule update --init --recursive
info "done"

# Fail loudly if a submodule is empty — every link below would dangle.
for sub in "$PROTO_SUB" "$DK_SUB"; do
    if [ ! -d "$sub" ] || [ -z "$(ls -A "$sub" 2>/dev/null)" ]; then
        echo "ERROR: submodule '$sub' is empty. Run: git submodule update --init --recursive" >&2
        exit 1
    fi
done

mkdir -p "$SKILLS_DIR"

# Drop links this script previously made that no longer point at a skill:
# a renamed or removed upstream skill, or a container directory that only
# looked like one. Only ever touches symlinks into .agents/ — a real
# directory here is hand-written and is left alone.
echo "==> Pruning stale links"
PRUNED=0
for link in "$SKILLS_DIR"/*; do
    [ -L "$link" ] || continue
    case "$(readlink "$link")" in
        *.agents/skills/*) ;;
        *) continue ;;
    esac
    if [ ! -f "$link/SKILL.md" ]; then
        info "removing $(basename "$link") — target is not a skill"
        rm "$link"
        PRUNED=$((PRUNED + 1))
    fi
done
info "$PRUNED removed"

# Skill names are a flat namespace. Seed it with the real directories already
# present so a vendored skill can never shadow one written in this repo.
SEEN_NAMES=" "
for d in "$SKILLS_DIR"/*/; do
    [ -d "$d" ] && [ ! -L "${d%/}" ] && SEEN_NAMES="$SEEN_NAMES$(basename "$d") "
done

# link_skill <target-path-relative-to-repo-root> <skill-name>
link_skill() {
    local target="$1" name="$2"
    local link="$SKILLS_DIR/$name"

    if [ ! -d "$target" ]; then
        warn "skipping '$name' — source not found at $target"
        return
    fi

    # A real directory here is a hand-written skill; never clobber it.
    if [ -d "$link" ] && [ ! -L "$link" ]; then
        warn "skipping '$name' — a real directory already exists at $link"
        return
    fi

    # Skill names are a flat namespace: two sources claiming one name would
    # silently shadow each other. Keep the first and say so.
    case "$SEEN_NAMES" in
        *" $name "*)
            warn "duplicate skill name '$name' — keeping the first, ignoring $target"
            return
            ;;
    esac
    SEEN_NAMES="$SEEN_NAMES$name "

    # Compute the path from inside $SKILLS_DIR back to the target.
    local rel="../../$target"

    if [ -L "$link" ]; then
        if [ "$(readlink "$link")" = "$rel" ] && [ -e "$link" ]; then
            return  # already correct
        fi
        rm "$link"
    fi

    ln -s "$rel" "$link"
    LINKED=$((LINKED + 1))
}

# A skill is any directory holding a SKILL.md — never assume a flat layout.
# prototype-creator nests ten more under .claude/skills/eval/, and `eval`
# itself is a plain container, so globbing one level deep would both miss
# those and register a bogus skill with no SKILL.md.
link_skills_under() {
    local root="$1" depth="$2"
    [ -d "$root" ] || { warn "no such directory: $root"; return; }
    while IFS= read -r manifest; do
        local dir
        dir="$(dirname "$manifest")"
        link_skill "$dir" "$(basename "$dir")"
    done < <(find "$root" -mindepth 2 -maxdepth "$depth" -name SKILL.md -type f | sort)
}

echo "==> Linking prototype-creator skills"
LINKED=0
link_skills_under "$PROTO_SUB/.claude/skills" 3
info "$LINKED new or repaired"

echo "==> Linking decision-kit skills"
LINKED=0
for category in thinking action configuration orchestrator; do
    link_skills_under "$DK_SUB/$category" 2
done
info "$LINKED new or repaired"

echo "==> Verifying every link resolves"
BROKEN=0
for link in "$SKILLS_DIR"/*; do
    [ -L "$link" ] || continue
    if [ ! -e "$link" ]; then
        warn "dangling: $link -> $(readlink "$link")"
        BROKEN=$((BROKEN + 1))
    fi
done
if [ "$BROKEN" -gt 0 ]; then
    echo "ERROR: $BROKEN dangling symlink(s)." >&2
    exit 1
fi

TOTAL=$(find "$SKILLS_DIR" -maxdepth 1 -mindepth 1 | wc -l | tr -d ' ')
info "all links resolve ($TOTAL skills total)"

cat <<'EOF'

==> Optional extras (not run automatically — each needs network and time)

  PatternFly design-system context for prototype-creator:
    (cd .agents/skills/prototype-creator && bash scripts/fetch-design-system-context.sh)

  Python deps for prototype-creator's scoring and publishing scripts:
    (cd .agents/skills/prototype-creator && uv sync)

Setup complete. Restart Claude Code to pick up the new skills.
EOF
