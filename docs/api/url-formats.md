# URL Formats

md2cf accepts three Confluence Cloud URL patterns. The parser extracts the base URL, space key, and (optionally) page ID from the URL.

## Supported patterns

### Page URL with title

```
https://domain.atlassian.net/wiki/spaces/SPACE/pages/12345/Page+Title
```

Extracts: `baseUrl`, `spaceKey`, `pageId`

### Page URL without title

```
https://domain.atlassian.net/wiki/spaces/SPACE/pages/12345
```

Extracts: `baseUrl`, `spaceKey`, `pageId`

### Space URL

```
https://domain.atlassian.net/wiki/spaces/SPACE
```

Extracts: `baseUrl`, `spaceKey` (no `pageId`)

## How the URL determines the action

| URL type  | `--create` flag | Action                              |
| --------- | --------------- | ----------------------------------- |
| Page URL  | No              | Update the page                     |
| Page URL  | Yes             | Create a new child page             |
| Space URL | Yes             | Create a new page in the space root |

A space URL without `--create` is not valid for single-file sync (there is no page to update).

## Programmatic usage

```ts
import { parseConfluenceUrl, buildApiBaseUrl, buildPageWebUrl, extractPageId } from "md2cf";

const parsed = parseConfluenceUrl(
  "https://company.atlassian.net/wiki/spaces/ENG/pages/12345/My+Page",
);
// { baseUrl: "https://company.atlassian.net", spaceKey: "ENG", pageId: "12345" }

const apiBase = buildApiBaseUrl("https://company.atlassian.net");
// "https://company.atlassian.net/wiki/api/v2"

const pageId = extractPageId("12345"); // "12345"
const pageId2 = extractPageId(
  "https://company.atlassian.net/wiki/spaces/ENG/pages/67890",
); // "67890"
```
