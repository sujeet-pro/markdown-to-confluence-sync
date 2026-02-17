# Using with AI Agents

md2cf works as a bridge between AI coding agents and Confluence. Instead of giving an agent direct API access to your wiki, you install a skill file that teaches it the md2cf CLI commands. The agent reads and writes pages through the CLI while you control authentication and scope.

## Why CLI + agent instead of a native connector?

Most AI coding agents (Claude, Codex, Gemini) can use Confluence connectors or MCP servers, but there are practical reasons to prefer the CLI approach:

**Your org may not have connectors enabled.** Many companies restrict third-party integrations in Confluence. The admin panel may not allow OAuth apps, marketplace add-ons, or MCP server connections. md2cf uses a personal API token, which works on any Confluence Cloud instance without admin approval.

**You control the access scope.** With a native connector, the agent typically gets broad read/write access to your entire Confluence instance. With md2cf, the agent can only touch pages you explicitly pass as URLs. It cannot browse spaces, search content, or modify pages you haven't mentioned in the conversation.

**The token stays on your machine.** Your API token lives in `~/.md2cf/config.json` and is never sent to the agent provider. The agent runs CLI commands locally — it never sees or handles your credentials directly.

**Offline-first, git-friendly workflow.** The agent works with local Markdown files that you can review, diff, and version control before pushing to Confluence. This gives you a review step that native connectors skip.

**Standard Markdown input.** Agents already write good Markdown. They don't need to learn ADF, Confluence macros, or a proprietary API. md2cf handles the conversion.

## Installing the agent skill

The `--install-skill` flag writes a `SKILL.md` file to the location expected by each agent:

```bash
# Install for Claude Code
md2cf --install-skill claude

# Install for Codex
md2cf --install-skill codex

# Install for Gemini
md2cf --install-skill gemini
```

### Where skills are installed

| Agent | Skill file location |
|-------|-------------------|
| Claude | `~/.claude/skills/md2cf/SKILL.md` |
| Codex | `~/.codex/skills/md2cf/SKILL.md` |
| Gemini | `~/.gemini/skills/md2cf/SKILL.md` |

### Prerequisites

Before the agent can use the skill, md2cf must be installed and configured:

```bash
npm install -g md2cf
md2cf config
```

Configuration requires your Atlassian email, an [API token](https://id.atlassian.com/manage/api-tokens), and your Confluence base URL.

## What gets installed

The skill file is a Markdown document with YAML frontmatter that teaches the agent md2cf's commands, options, merge strategies, and workflows. Below is the full content — you can also copy this directly into your agent's skill directory if you prefer not to use the install command.

:::expand Full SKILL.md content (click to expand)
````markdown
---
name: md2cf
description: >
  Sync markdown files to Confluence pages. Use this skill when asked to publish,
  sync, read, or upload markdown content to Confluence, or when the user provides
  a *atlassian.net/wiki/* URL. Handles creating new pages, updating existing pages,
  reading pages as markdown, diff sync with merge strategies, panels (GFM alerts),
  expand/collapse sections, and scaffolding new pages with init. The primary workflow
  when given a Confluence URL is: read the page, modify locally, write back.
  Keywords: confluence, wiki, markdown, publish, sync, read, diff sync, init,
  atlassian, documentation, panels, expand, callouts.
license: MIT
compatibility: Requires md2cf CLI to be installed globally (npm install -g md2cf)
  and configured (md2cf config). Requires Node.js >= 24.
metadata:
  author: sujeet-pro
  version: "3.0"
---

## Instructions

Use the `md2cf` CLI tool to sync markdown files to Confluence pages. The tool
converts Markdown to Atlassian Document Format (ADF) and uses the Confluence
REST API v2.

### Commands

#### Sync (default) — update or create pages

md2cf <source> <page-url>                  # update existing page
md2cf <source> <space-url> --create        # create in space root
md2cf <source> <page-url> --create         # create as child page

#### Read — get a page as Markdown

md2cf read <page-url>                      # print to stdout
md2cf read <page-url> --output page.md     # write to file

#### Init — scaffold a sample file

md2cf init

### Options

| Option              | Description                                      |
|---------------------|--------------------------------------------------|
| `-c, --create`      | Create a new page                                |
| `--title <title>`   | Override page title                              |
| `--strategy <s>`    | Merge strategy: auto-merge, local-wins, remote-wins, append |
| `--dry-run`         | Preview without making changes                   |
| `-y, --yes`         | Skip confirmation prompts                        |
| `--skip-mermaid`    | Skip mermaid diagram rendering                   |
| `-o, --output <f>`  | Write output to file (read command)              |

### Merge Strategies

| Strategy     | Behavior                                         |
|------------- |--------------------------------------------------|
| local-wins   | Full replacement with local content (default)    |
| auto-merge   | Line-level merge, prefers local for conflicts    |
| remote-wins  | Keep remote content, discard local               |
| append       | Add local content after remote content           |

### Primary Workflow

When given a Confluence URL, always start with `md2cf read`:

1. md2cf read <page-url> --output page.md
2. Modify page.md
3. md2cf page.md <page-url> --strategy auto-merge --yes

### Supported Markdown

Headings, bold, italic, strikethrough, code blocks, lists, tables, links,
images, blockquotes, horizontal rules, TOC sections, mermaid diagrams,
panels (> [!NOTE], > [!TIP], > [!IMPORTANT], > [!WARNING], > [!CAUTION]),
expand/collapse (:::expand Title ... :::).

Avoid: raw HTML, task lists, footnotes, definition lists.
````
:::

## How agents use the skill

Once the skill is installed, the agent automatically recognizes Confluence-related requests. When you mention a `*.atlassian.net/wiki/*` URL or ask the agent to publish to Confluence, it uses md2cf commands.

### Typical agent workflow

1. You share a Confluence page URL with the agent
2. The agent runs `md2cf read <url> --output page.md` to fetch the content
3. It edits the Markdown based on your instructions
4. It runs `md2cf page.md <url> --strategy auto-merge --yes` to push changes

### What you can ask the agent to do

- "Update this Confluence page with the latest API docs" — reads the page, updates content, syncs back
- "Create a new page under the Engineering space with our onboarding guide" — writes Markdown, uses `--create`
- "Add a changelog entry to the bottom of this page" — uses `--strategy append`
- "Split this long page into child pages" — reads, splits into files, creates children with `--create`
- "Sync our docs/ folder to Confluence" — runs folder sync

## Manual skill installation

If you prefer to set up the skill file yourself instead of using `--install-skill`:

**For Claude Code:**
```bash
mkdir -p ~/.claude/skills/md2cf
# Copy the SKILL.md content above into:
# ~/.claude/skills/md2cf/SKILL.md
```

**For Codex:**
```bash
mkdir -p ~/.codex/skills/md2cf
# Copy into ~/.codex/skills/md2cf/SKILL.md
```

**For Gemini:**
```bash
mkdir -p ~/.gemini/skills/md2cf
# Copy into ~/.gemini/skills/md2cf/SKILL.md
```

## Security model

| Concern | md2cf approach |
|---------|---------------|
| **Credential storage** | Token stored locally in `~/.md2cf/config.json`, never sent to agent providers |
| **Access scope** | Agent can only touch pages whose URLs you provide in the conversation |
| **Review step** | Agent writes local Markdown files — you review before syncing |
| **Audit trail** | Every sync is a Confluence page version; `--dry-run` previews before committing |
| **Revocation** | Revoke your API token at any time from the Atlassian account settings |
| **No admin required** | Uses personal API tokens — no OAuth apps or marketplace add-ons needed |
