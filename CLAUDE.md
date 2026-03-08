# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm build          # Compile TypeScript → dist/ via tsup
pnpm dev            # Run CLI directly with tsx (no build step)
pnpm test           # Run all tests once (vitest run)
pnpm test:watch     # Watch mode
pnpm type-check     # tsc --noEmit only, no emit

# Run a single test file
pnpm vitest run tests/source-parser.test.ts

# Run CLI locally after building
node bin/cli.mjs --skills add vercel-labs/agent-skills
```

`bin/cli.mjs` is a thin ESM wrapper that dynamically imports `dist/cli.js`, so always run `pnpm build` before testing the bin entry point. During development use `pnpm dev` instead.

## Architecture

The CLI is structured around **asset types** (`skills`, `rules`, `mcp`), each treated as a first-class module. The top-level flag (`--skills`, `--rules`, `--mcp`) selects the type; the next argument is the subcommand (`add`, `list`, `remove`, `find`, `browse`).

```
src/cli.ts          → parses argv[2] as asset-type flag, argv[3] as subcommand
src/registry.ts     → maps AssetType → CommandHandler function
src/{type}/index.ts → owns parseArgs() + subcommand dispatch for that type
src/{type}/add.ts   → clone → discover → interactive select → installAsset()
src/{type}/browse.ts   → (skills only) catalog multiselect → group by source → clone & install
src/{type}/catalog.ts  → (skills only) static curated catalog + groupBySource() helper
src/{type}/discover.ts → scans cloned repo for marker files (SKILL.md / RULE.md / MCP.md)
src/{type}/installer.ts → writes canonical dir + agent symlink/copy
src/{type}/list.ts  → reads from .agents/<type>/ on disk
src/{type}/remove.ts → calls uninstallAsset() + cleans symlinks
```

### Canonical storage model

Assets are stored in a two-layer layout:

1. **Canonical dir** (single source of truth):
   - Project: `.agents/<type>/<sanitized-name>/`
   - Global: `~/.agents/<type>/<sanitized-name>/`

2. **Agent-specific dir** (symlink by default, copy with `--copy`):
   - Project: `.<agent>/<type>/<name>` → `../../.agents/<type>/<name>`
   - Global: `~/.<agent>/<type>/<name>` → canonical global path

The `universal` agent is special — it writes directly to the canonical dir with no extra symlink. All other agents symlink into it.

`installAsset()` in `src/skills/installer.ts` owns this logic. `src/rules/installer.ts` and `src/mcp/installer.ts` re-export it, passing the appropriate `AssetType`.

### Adding a new asset type

1. Add the new type to `AssetType` union in `src/types.ts`
2. Add a marker file constant in `src/constants.ts`
3. Create `src/<newtype>/` with `discover.ts`, `installer.ts`, `add.ts`, `list.ts`, `remove.ts`, `index.ts` — follow the `skills/` module as the template
4. Register in `src/registry.ts`

### argv parsing

There is no CLI framework. Each `src/{type}/index.ts` contains a local `parseArgs(args: string[])` that returns `{ positional, flags, has(), get(), getAll() }`. Flags that take multiple values (e.g. `--skill a --skill b`) are accumulated into arrays.

### Asset discovery

`discover.ts` for each type:
- Prefers `<type>/` subdirectory (e.g. `skills/my-skill/SKILL.md`)
- Falls back to root-level marker file (e.g. `SKILL.md`) when no subdirectory assets found
- Parses frontmatter via `gray-matter`; `name` and `description` are the only required fields

### Lock file

`agents-tool-cli-lock.json` (project) or `~/.agents-tool-cli-lock.json` (global) tracks installed sources, asset names, target agents, and timestamp. Managed by `src/lock.ts`.

### Key dependencies

| Package | Purpose |
|---|---|
| `@clack/prompts` | Interactive TUI (spinner, multiselect, confirm) |
| `gray-matter` | Frontmatter parsing for `SKILL.md` / `RULE.md` / `MCP.md` |
| `simple-git` | Shallow clone of remote repos into `os.tmpdir()` |
| `picocolors` | Terminal color output |

All imports must use `.js` extensions (ESM module resolution).

## Rules

### After every code change

After completing any modification to the codebase, always update both:

1. **`CLAUDE.md`** — reflect any architectural changes, new modules, new subcommands, new dependencies, or updated conventions
2. **`README.md`** — reflect any changes visible to users: new commands, new options, new catalog entries, changed behavior, updated examples

This applies to: adding features, adding subcommands, adding catalog entries, changing file structure, adding dependencies, or any other meaningful change.
