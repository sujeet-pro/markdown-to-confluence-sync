# Reading Pages

md2cf can read Confluence pages back as Markdown using the `read` command. This enables a round-trip workflow: read a page, edit it locally, then sync it back.

## Basic usage

Print a page to stdout:

```bash
md2cf read <page-url>
```

Save to a file:

```bash
md2cf read <page-url> --output page.md
```

The URL must point to a specific page — space URLs are not supported for reading.

## Options

| Option | Description |
|--------|-------------|
| `--output <file>` | Write Markdown to a file instead of stdout |

## Read → Modify → Write workflow

The primary use case for `read` is editing existing Confluence pages locally:

```bash
# 1. Read the current page
md2cf read https://company.atlassian.net/wiki/spaces/ENG/pages/12345 \
  --output page.md

# 2. Edit page.md in your editor or with an AI agent

# 3. Sync it back
md2cf page.md https://company.atlassian.net/wiki/spaces/ENG/pages/12345 --yes
```

When you write a page back, the title is preserved from the Markdown content (the first `# H1` heading). You can override it with `--title`.

## Combining with merge strategies

Instead of overwriting the entire page, you can use a [merge strategy](./merge-strategies.md) to blend your local changes with any remote edits:

```bash
# Read the page
md2cf read <page-url> --output page.md

# Edit page.md ...

# Write back with auto-merge to preserve remote changes
md2cf page.md <page-url> --strategy auto-merge --yes
```

This is especially useful when multiple people edit the same page. See [Merge Strategies](./merge-strategies.md) for details on each strategy.

## ADF to Markdown conversion

Under the hood, `read` fetches the page's Atlassian Document Format (ADF) body and converts it to Markdown. Most Confluence content round-trips cleanly, including:

- Headings, paragraphs, and text formatting
- Bullet and numbered lists
- Code blocks with language identifiers
- Tables
- Links and images
- Blockquotes
- Horizontal rules

Some Confluence-specific macros (e.g. Jira issue links, custom macros) may not convert perfectly. Review the output after reading complex pages.
