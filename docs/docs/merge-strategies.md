# Merge Strategies

When updating an existing page, md2cf supports four merge strategies via the `--strategy` flag. The default behavior is `local-wins`, which replaces the remote content entirely with your local Markdown.

## Strategy overview

| Strategy | Behavior | Use case |
|----------|----------|----------|
| `local-wins` | Full replacement with local content (default) | You own the page and want to overwrite it |
| `auto-merge` | Line-level merge; prefers local for conflicts | Multiple editors; preserve non-conflicting remote changes |
| `remote-wins` | Keep remote content, discard local | Roll back or defer to the remote version |
| `append` | Concatenate local content after remote | Add a section without touching existing content |

## Usage

```bash
md2cf <source> <page-url> --strategy <strategy> [--yes]
```

## `local-wins` (default)

Replaces the entire page with your local Markdown. This is the default when no `--strategy` flag is provided.

```bash
md2cf page.md <page-url> --yes
# equivalent to:
md2cf page.md <page-url> --strategy local-wins --yes
```

**When to use:** You are the sole author and want to push your local version as the source of truth.

## `auto-merge`

Performs a line-level diff between the remote page and your local Markdown. Non-conflicting changes from both sides are preserved. When both sides changed the same lines, local content wins.

```bash
md2cf page.md <page-url> --strategy auto-merge --yes
```

The CLI reports merge stats showing lines added, removed, and unchanged. If conflicts were detected (and resolved by preferring local), it warns you:

```
⚠ Merged with conflicts (local preferred) [+5 -2 ~48]
```

**When to use:** Multiple people edit the page, and you want to preserve their changes alongside yours.

## `remote-wins`

Keeps the remote content and discards your local Markdown. The page is not modified.

```bash
md2cf page.md <page-url> --strategy remote-wins --yes
```

**When to use:** You want to verify merge stats without changing the page, or you want to explicitly defer to the remote version.

## `append`

Concatenates your local Markdown after the existing remote content, separated by a horizontal rule (`---`).

```bash
md2cf new-section.md <page-url> --strategy append --yes
```

The remote content is left untouched. Your local content is added below it.

**When to use:** You want to add content to a page without modifying what's already there — for example, appending meeting notes or a new section.

## Examples

### Read, edit, and merge back

```bash
# Read the current page
md2cf read <page-url> --output page.md

# Edit page.md ...

# Merge your changes with any remote edits
md2cf page.md <page-url> --strategy auto-merge --yes
```

### Append a changelog entry

```bash
# changelog-entry.md contains just the new entry
md2cf changelog-entry.md <page-url> --strategy append --yes
```

### Preview a merge with dry-run

```bash
md2cf page.md <page-url> --strategy auto-merge --dry-run
```

This shows what would happen without making any API calls.
