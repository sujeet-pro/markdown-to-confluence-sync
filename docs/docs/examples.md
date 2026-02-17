# Common Recipes

Copy-paste examples for common md2cf workflows.

## 1. Update an existing page

```bash
md2cf ./README.md https://company.atlassian.net/wiki/spaces/ENG/pages/12345
```

The CLI fetches the existing page, prompts for confirmation, and updates it.

## 2. Create a new page

```bash
# In the space root
md2cf ./guide.md https://company.atlassian.net/wiki/spaces/ENG --create

# As a child of an existing page
md2cf ./api-docs.md https://company.atlassian.net/wiki/spaces/ENG/pages/12345 --create
```

## 3. Read and edit a page

```bash
# Read the page to a local file
md2cf read https://company.atlassian.net/wiki/spaces/ENG/pages/12345 \
  --output page.md

# Edit page.md in your editor ...

# Write it back
md2cf page.md https://company.atlassian.net/wiki/spaces/ENG/pages/12345 --yes
```

## 4. Add content to a page

Use the `append` strategy to add content below existing page content without modifying it:

```bash
md2cf new-section.md \
  https://company.atlassian.net/wiki/spaces/ENG/pages/12345 \
  --strategy append --yes
```

## 5. Sync an entire docs folder

```bash
md2cf ./docs/ https://company.atlassian.net/wiki/spaces/ENG/pages/12345
```

This mirrors the folder structure to Confluence: folders become container pages, Markdown files become pages.

## 6. Preview before syncing

```bash
md2cf ./README.md \
  https://company.atlassian.net/wiki/spaces/ENG/pages/12345 \
  --dry-run
```

Shows the action, title, and target without making any API calls.

## 7. Auto-sync in CI

```yaml
# .github/workflows/docs-sync.yml
name: Sync docs to Confluence

on:
  push:
    branches: [main]
    paths: ["docs/**"]

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 24

      - run: npm install -g md2cf

      - run: md2cf config set email "${{ secrets.CONFLUENCE_EMAIL }}"
      - run: md2cf config set token "${{ secrets.CONFLUENCE_TOKEN }}"
      - run: md2cf config set baseUrl "${{ secrets.CONFLUENCE_BASE_URL }}"

      - run: |
          md2cf ./docs/ \
            https://company.atlassian.net/wiki/spaces/ENG/pages/12345 \
            --yes
```

See [CI / Automation](./ci-automation.md) for more details.

## 8. Use panels for callouts

GFM alert syntax converts to Confluence panels:

```markdown
> [!NOTE]
> This becomes a blue info panel.

> [!TIP]
> This becomes a green success panel.

> [!WARNING]
> This becomes a yellow warning panel.

> [!CAUTION]
> This becomes a red error panel.

> [!IMPORTANT]
> This becomes a purple note panel.
```

See [Syntax Reference](./markdown-syntax.md#panels-gfm-alerts) for the full mapping table.

## 9. Add collapsible sections

Use the `:::expand` directive:

```markdown
:::expand Click to see implementation details
This content is hidden by default on Confluence.

- Step 1: Configure settings
- Step 2: Run the sync
- Step 3: Verify on Confluence
:::
```

## 10. Scaffold a new page

```bash
# Generate a sample file with all supported features
md2cf init

# Edit confluence-sample.md to match your content ...

# Sync it to Confluence
md2cf confluence-sample.md \
  https://company.atlassian.net/wiki/spaces/ENG/pages/12345
```

The `init` command creates `confluence-sample.md` in the current directory with examples of every supported Markdown feature.
