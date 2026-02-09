# Getting Started

## Prerequisites

- **Node.js** >= 24
- A **Confluence Cloud** instance (e.g. `https://company.atlassian.net`)
- An **Atlassian API token** — generate one at [id.atlassian.com](https://id.atlassian.com/manage/api-tokens)

## Installation

Install md2cf globally so the `md2cf` command is available everywhere:

```bash
npm install -g md2cf
```

## Configure credentials

Run the interactive setup:

```bash
md2cf config
```

You will be prompted for:

| Setting     | Description                                                              |
| ----------- | ------------------------------------------------------------------------ |
| **email**   | Your Atlassian account email                                             |
| **token**   | API token from [id.atlassian.com](https://id.atlassian.com/manage/api-tokens) |
| **baseUrl** | Your Confluence instance URL (e.g. `https://company.atlassian.net`)      |

Configuration is stored in `~/.md2cf/config.json`. See the [Configuration](./configuration.md) page for advanced options.

## Your first sync

Update an existing Confluence page from a local Markdown file:

```bash
md2cf ./README.md https://company.atlassian.net/wiki/spaces/ENG/pages/12345
```

Create a new page in a space:

```bash
md2cf ./docs/guide.md https://company.atlassian.net/wiki/spaces/ENG --create
```

Create a child page under an existing page:

```bash
md2cf ./api.md https://company.atlassian.net/wiki/spaces/ENG/pages/12345 --create
```

## Next steps

- [Configuration](./configuration.md) — manual config commands, config file location
- [Core Usage](./usage.md) — all CLI options, title resolution, remote sources
- [Folder Sync](./folder-sync.md) — mirror a folder tree to Confluence
