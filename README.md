# agents-tool-cli

Extensible CLI for managing AI agent assets — **skills**, **rules**, and **MCP servers** — across multiple AI coding agents.

## Quick Start

```bash
# Browse and install from the built-in skill catalog
npx agents-tool-cli --skills browse

# Or install directly from any GitHub repo
npx agents-tool-cli --skills add vercel-labs/agent-skills
```

## Supported Asset Types

| Type | Flag | Marker File | Description |
|---|---|---|---|
| Skills | `--skills` | `SKILL.md` | Instructions and guidelines for AI agents |
| Rules | `--rules` | `RULE.md` | Coding rules and constraints (like `.cursorrules`) |
| MCP Servers | `--mcp` | `MCP.md` / `mcp.json` | Model Context Protocol server configurations |

## Supported Agents

Claude Code, Cursor, Codex, OpenCode, Windsurf, Cline, Continue, Roo, Gemini CLI, and Universal.

---

## Usage

### Skills

```bash
# Browse the built-in catalog and install interactively
npx agents-tool-cli --skills browse

# Add from GitHub shorthand
npx agents-tool-cli --skills add vercel-labs/agent-skills

# Add from full GitHub URL
npx agents-tool-cli --skills add https://github.com/remotion-dev/skills

# Add a specific skill
npx agents-tool-cli --skills add vercel-labs/agent-skills --skill frontend-design

# Add to a specific agent only
npx agents-tool-cli --skills add vercel-labs/agent-skills -a claude-code

# Install globally (available across all projects)
npx agents-tool-cli --skills add vercel-labs/agent-skills -g

# List available skills in a repo without installing
npx agents-tool-cli --skills add vercel-labs/agent-skills --list

# Non-interactive install (CI/CD friendly)
npx agents-tool-cli --skills add vercel-labs/agent-skills --skill frontend-design -a claude-code -g -y

# List installed skills
npx agents-tool-cli --skills list

# Remove a skill
npx agents-tool-cli --skills remove frontend-design
```

### Rules

```bash
npx agents-tool-cli --rules add https://github.com/owner/rules-repo
npx agents-tool-cli --rules add owner/repo --rule my-rule
npx agents-tool-cli --rules list
npx agents-tool-cli --rules remove my-rule
```

### MCP Servers

```bash
npx agents-tool-cli --mcp add https://github.com/owner/mcp-repo
npx agents-tool-cli --mcp add owner/repo --mcp-name my-server
npx agents-tool-cli --mcp list
npx agents-tool-cli --mcp remove my-server
```

---

## Subcommands

| Subcommand | Short | Description |
|---|---|---|
| `add <source>` | `a` | Install skills/rules/mcp from a git repository |
| `browse` | `b` | Pick from the built-in curated catalog (skills only) |
| `list` | `ls` | List currently installed assets |
| `remove <name>` | `rm` | Uninstall an asset |
| `find [query]` | | Open the online skills registry |

## Options

| Option | Short | Description |
|---|---|---|
| `--global` | `-g` | Install globally (`~/.agents/...`) instead of project-level (`./.agents/...`) |
| `--agent <name>` | `-a` | Target a specific agent (e.g. `claude-code`, `cursor`) |
| `--skill <name>` | `-s` | Install a specific skill by name (skills only) |
| `--rule <name>` | | Install a specific rule by name (rules only) |
| `--mcp-name <name>` | | Install a specific MCP server by name (mcp only) |
| `--list` | `-l` | List available assets in a repo without installing |
| `--yes` | `-y` | Skip all confirmation prompts |
| `--copy` | | Copy files instead of symlinking |
| `--all` | | Install all assets to all agents without prompts |

---

## Source Formats

```bash
# GitHub shorthand
npx agents-tool-cli --skills add owner/repo

# Full GitHub URL
npx agents-tool-cli --skills add https://github.com/owner/repo

# GitHub URL pointing to a subdirectory
npx agents-tool-cli --skills add https://github.com/owner/repo/tree/main/skills/my-skill

# GitLab
npx agents-tool-cli --skills add https://gitlab.com/org/repo

# SSH git URL
npx agents-tool-cli --skills add git@github.com:owner/repo.git

# Local path
npx agents-tool-cli --skills add ./my-local-skills
```

---

## Installation Scope

| Scope | Flag | Location | Use case |
|---|---|---|---|
| Project | *(default)* | `.agents/<type>/<name>/` | Committed with your project, shared with team |
| Global | `-g` | `~/.agents/<type>/<name>/` | Available across all projects |

### How assets are stored

Assets are written to a **canonical directory** (`.agents/<type>/`) as the single source of truth. Each agent then receives a **symlink** pointing to the canonical copy (or an independent copy if `--copy` is used).

```
.agents/
  skills/
    frontend-design/       ← canonical copy
      SKILL.md
.claude/
  skills/
    frontend-design/       ← symlink → ../../.agents/skills/frontend-design
.cursor/
  skills/
    frontend-design/       ← symlink → ../../.agents/skills/frontend-design
```

This means updating the canonical copy propagates to all agents automatically.

---

## Skills Catalog

Run `--skills browse` to pick from the built-in curated catalog:

| Skill | Description | Tags |
|---|---|---|
| Ant Design | Component patterns and best practices for Ant Design (antd) | react, ui, antd |
| React Hook Form + Zod | Type-safe form handling with react-hook-form and Zod schema validation | react, forms, validation |
| Next.js App Router | Best practices for App Router, Server Components, and server actions | nextjs, react |
| Tailwind CSS | Utility-first CSS patterns and component design with Tailwind CSS | css, styling |
| Zustand | Minimal, scalable state management with Zustand | react, state |
| TanStack Query | Async state management and data fetching with TanStack Query | react, data-fetching |
| React Composition Patterns | Scalable React composition — eliminates boolean prop proliferation, flexible component APIs | react, architecture, vercel |
| Deploy to Vercel | Deploy apps to Vercel — handles deploy, preview, and live link creation | vercel, deployment |
| React & Next.js Best Practices | Performance optimization guidelines from Vercel Engineering | react, nextjs, performance, vercel |
| React Native & Expo | Best practices for performant mobile apps with React Native and Expo | react-native, expo, mobile |
| Web Design Guidelines | UI code review for accessibility, UX audit, and design best practices | design, accessibility, ux |

> The catalog data is in `src/skills/catalog.json`. To add a skill, open a PR adding an entry to that file — no TypeScript knowledge required.

---

## Creating an Asset Repository

### Skills repo

```
my-skills-repo/
├── skills/
│   ├── frontend-design/
│   │   └── SKILL.md
│   └── api-guidelines/
│       └── SKILL.md
└── SKILL.md        # fallback for single-skill repos
```

**`SKILL.md`** frontmatter:
```markdown
---
name: Frontend Design Guidelines
description: UI/UX best practices for React applications
---

Your skill instructions here...
```

### Rules repo

```
my-rules-repo/
├── rules/
│   └── typescript-strict/
│       └── RULE.md
└── RULE.md
```

**`RULE.md`** frontmatter:
```markdown
---
name: TypeScript Strict Mode
description: Enforce strict TypeScript configuration
globs: "**/*.ts,**/*.tsx"
alwaysApply: false
---

Rule content here...
```

### MCP repo

```
my-mcp-repo/
├── mcp/
│   └── my-server/
│       └── MCP.md    # or mcp.json
└── MCP.md
```

**`MCP.md`** frontmatter:
```markdown
---
name: My MCP Server
description: Provides context from my internal API
command: npx
args: ["@my-org/mcp-server"]
env:
  API_KEY: ""
---

Usage instructions...
```

---

## Lock File

Installed assets are tracked in `agents-tool-lock.json` at your project root (or `~/.agents-tool-lock.json` globally):

```json
{
  "version": 1,
  "entries": [
    {
      "source": "https://github.com/vercel-labs/agent-skills",
      "assetType": "skills",
      "assets": ["frontend-design"],
      "agents": ["claude-code", "cursor"],
      "installedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

Commit this file to share installed assets with your team.

---

## Development

```bash
pnpm install
pnpm build        # compile to dist/
pnpm test         # run tests
pnpm dev          # run CLI without building (uses tsx)
```

## License

MIT
