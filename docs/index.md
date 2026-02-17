---
layout: home

hero:
  name: md2cf
  text: Markdown to Confluence
  tagline: Publish documentation to Confluence from the terminal. Works standalone or as an AI agent tool — no admin access or connectors required.
  actions:
    - theme: brand
      text: Get Started
      link: /docs/getting-started
    - theme: alt
      text: Use with AI Agents
      link: /docs/agents
    - theme: alt
      text: GitHub
      link: https://github.com/sujeet-pro/markdown-to-confluence-sync

features:
  - icon: "\U0001F4DD"
    title: Write Markdown, Publish to Confluence
    details: Write documentation in Markdown — md2cf converts it to Atlassian Document Format and syncs it to Confluence Cloud via the REST API.
  - icon: "\U0001F504"
    title: Read, Edit, Write Back
    details: Read any Confluence page as Markdown, edit it locally or with an AI agent, and push changes back with merge strategies.
  - icon: "\U0001F916"
    title: AI Agent Ready
    details: Install a skill file so Claude, Codex, or Gemini can publish to Confluence. The agent runs CLI commands — your token never leaves your machine.
  - icon: "\U0001F512"
    title: No Connectors Needed
    details: Uses a personal API token. No OAuth apps, marketplace add-ons, or admin approval. Works even when your org has disabled third-party integrations.
  - icon: "\U0001F4C1"
    title: Folder Sync & Page Hierarchy
    details: Mirror a local folder structure to Confluence. Folders become container pages, Markdown files become child pages — synced recursively.
  - icon: "\U0001F3A8"
    title: Panels, Expand, Mermaid & More
    details: GFM alerts become Confluence panels. Collapsible sections with :::expand. Mermaid diagrams rendered as PNG attachments. Table of Contents auto-generated.
---

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: linear-gradient(135deg, #0052CC 0%, #36B37E 100%);
}
</style>

## Who is md2cf for?

### CLI users

You write docs in Markdown and want to publish them to Confluence without leaving the terminal. One command to update a page, one command to create a new one. Use `--dry-run` to preview, `--yes` to automate in CI.

```bash
md2cf ./docs/guide.md https://company.atlassian.net/wiki/spaces/ENG/pages/12345
```

### AI agent users

Your coding agent (Claude, Codex, Gemini) already writes great Markdown. Install the md2cf skill and the agent can read, create, and update Confluence pages through CLI commands — without needing a native connector or broad API access.

```bash
md2cf --install-skill claude
```

### Teams without Confluence integrations enabled

Many organizations restrict OAuth apps, marketplace add-ons, and third-party connectors in Confluence. md2cf uses a personal API token that works on any Confluence Cloud instance. No admin approval required. You control which pages the tool can access by choosing which URLs to pass.

---

<div style="text-align: center; padding: 2rem 0;">
  <a href="/markdown-to-confluence-sync/docs/getting-started" style="display: inline-block; padding: 0.75rem 2rem; background: #0052CC; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">Get Started in 2 Minutes</a>
</div>
