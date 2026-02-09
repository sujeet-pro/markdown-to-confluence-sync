# Core Usage

## Basic syntax

```bash
md2cf <source> <url> [options]
```

- **`<source>`** — a local file path, a local folder, or a remote URL
- **`<url>`** — a Confluence page or space URL

The CLI determines the action based on the URL and the `--create` flag.

## Update an existing page

When no `--create` flag is provided, md2cf updates the page at the given URL:

```bash
md2cf ./README.md https://company.atlassian.net/wiki/spaces/ENG/pages/12345
```

You can also sync from a remote Markdown URL:

```bash
md2cf https://raw.githubusercontent.com/org/repo/main/README.md \
  https://company.atlassian.net/wiki/spaces/ENG/pages/12345
```

## Create a new page

Add `--create` (or `-c`) to create a new page:

```bash
# Create in the space root
md2cf ./guide.md https://company.atlassian.net/wiki/spaces/ENG --create

# Create as a child of an existing page
md2cf ./api-docs.md https://company.atlassian.net/wiki/spaces/ENG/pages/12345 --create
```

- If the URL points to a **space**, the page is created at the space root.
- If the URL points to a **page**, the page is created as a child of that page.

## Options

| Option            | Description                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| `-c, --create`    | Create a new page (child if URL is a page, root if URL is a space)                               |
| `--title <title>` | Override the page title. Only applies to single-file sync.                                       |
| `--dry-run`       | Preview what would happen without making any API calls                                           |
| `-y, --yes`       | Skip confirmation prompts (useful for CI / scripts)                                              |

## Title resolution

The page title is determined in order of priority:

1. `--title` flag value (if provided)
2. First `# H1` heading in the Markdown content
3. Filename converted to title case (e.g. `getting-started.md` becomes "Getting Started")

## Source types

| Source type   | Example                                                                   |
| ------------- | ------------------------------------------------------------------------- |
| Local file    | `./docs/guide.md`, `README.md`, `/absolute/path/file.md`                 |
| Local folder  | `./docs/`, `/absolute/path/to/folder/`                                   |
| Remote URL    | `https://raw.githubusercontent.com/org/repo/main/docs/guide.md`          |

For folder sources, see [Folder Sync](./folder-sync.md).
