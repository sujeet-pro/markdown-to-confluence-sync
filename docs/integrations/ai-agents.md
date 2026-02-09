# AI Agent Integration

md2cf can install a [SKILL.md](https://agentskills.io/) file that teaches AI coding agents how to sync Markdown to Confluence.

## Install a skill

```bash
md2cf --install-skill claude
```

This writes a skill file to the location expected by the target agent.

## Supported agents

| Agent    | Skill location                |
| -------- | ----------------------------- |
| `claude` | `.claude/skills/md2cf/SKILL.md` |
| `codex`  | `.codex/skills/md2cf/SKILL.md`  |
| `gemini` | `.gemini/skills/md2cf/SKILL.md` |

## What the skill teaches

The installed SKILL.md provides the agent with:

- The full `md2cf <source> <url>` command syntax
- How to create vs update pages (the `--create` flag)
- Available options (`--title`, `--dry-run`, `--yes`)
- Configuration commands (`md2cf config set ...`)
- Folder sync behaviour
- Title resolution rules
- Example commands for common workflows

Once installed, the agent can publish documentation to Confluence without you needing to explain the CLI syntax each time.

## Prerequisites

The skill assumes that md2cf is installed globally and configured:

```bash
npm install -g md2cf
md2cf config
```
