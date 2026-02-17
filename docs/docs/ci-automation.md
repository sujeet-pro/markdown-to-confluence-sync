# CI / Automation

md2cf is designed to run non-interactively in CI pipelines.

## Key flags

| Flag         | Purpose                                                |
| ------------ | ------------------------------------------------------ |
| `-y, --yes`  | Skip all confirmation prompts                          |
| `--dry-run`  | Preview actions without making API calls               |

Combine both to safely test your pipeline first, then remove `--dry-run` when ready.

## Environment setup

Set the three required config values before running md2cf:

```bash
md2cf config set email "$CONFLUENCE_EMAIL"
md2cf config set token "$CONFLUENCE_TOKEN"
md2cf config set baseUrl "$CONFLUENCE_BASE_URL"
```

Or run `md2cf config` once on a developer machine and copy `~/.md2cf/config.json` into your CI environment.

## GitHub Actions example

```yaml
- name: Install md2cf
  run: npm install -g md2cf

- name: Configure md2cf
  run: |
    md2cf config set email "${{ secrets.CONFLUENCE_EMAIL }}"
    md2cf config set token "${{ secrets.CONFLUENCE_TOKEN }}"
    md2cf config set baseUrl "${{ secrets.CONFLUENCE_BASE_URL }}"

- name: Sync docs to Confluence
  run: md2cf ./docs/ "${{ vars.CONFLUENCE_PAGE_URL }}" --yes
```

## Dry run

Use `--dry-run` to see what md2cf would do without touching Confluence:

```bash
md2cf ./README.md https://company.atlassian.net/wiki/spaces/ENG/pages/12345 --dry-run --yes
```

This prints the resolved title, action (create / update), and target page without making any API calls.
