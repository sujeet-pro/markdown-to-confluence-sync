# Folder Sync

When the source argument is a directory, md2cf recursively mirrors its structure to Confluence.

## How it works

```bash
md2cf <folder> <page-or-space-url>
```

- **Folders** become container pages (with default content).
- **Markdown files** become content pages.
- The nested folder structure is preserved as parent-child page relationships.
- Existing pages are updated; new pages are created automatically.

## Example

Given this local folder:

```
docs/
  README.md
  api/
    auth.md
    users.md
  guides/
    getting-started.md
```

Running:

```bash
md2cf ./docs/ https://company.atlassian.net/wiki/spaces/ENG/pages/12345
```

Creates the following page tree under page 12345:

```
Page 12345
  ├── README
  ├── api              (folder page)
  │   ├── auth
  │   └── users
  └── guides           (folder page)
      └── getting-started
```

## Sync to a space root

You can also sync a folder to a space URL (without a page ID):

```bash
md2cf ./documentation/ https://company.atlassian.net/wiki/spaces/DOCS
```

## Behaviour details

- Hidden directories (names starting with `.`) and `node_modules` are skipped.
- Only files with `.md` or `.markdown` extensions are treated as Markdown.
- Page titles are derived from filenames (title-cased, hyphens/underscores become spaces).
