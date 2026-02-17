import type { AdfDocument, AdfNode, AdfMark } from "./types.js";

/**
 * Convert an ADF document back to Markdown.
 * Handles the ADF subset that Confluence pages typically produce.
 */
export function adfToMarkdown(adf: AdfDocument): string {
  const lines = adf.content.map((node) => convertNode(node, "")).join("\n\n");
  return lines.trimEnd() + "\n";
}

function convertNode(node: AdfNode, indent: string): string {
  switch (node.type) {
    case "heading":
      return convertHeading(node);
    case "paragraph":
      return convertParagraph(node);
    case "bulletList":
      return convertBulletList(node, indent);
    case "orderedList":
      return convertOrderedList(node, indent);
    case "codeBlock":
      return convertCodeBlock(node);
    case "blockquote":
      return convertBlockquote(node);
    case "table":
      return convertTable(node);
    case "rule":
      return "---";
    case "mediaSingle":
      return convertMediaSingle(node);
    case "panel":
      return convertPanel(node);
    case "expand":
      return convertExpand(node);
    case "extension":
      return convertExtension(node);
    default:
      // Fallback: try to extract any text content
      return convertInlineContent(node.content);
  }
}

function convertHeading(node: AdfNode): string {
  const level = (node.attrs?.level as number) || 1;
  const prefix = "#".repeat(level);
  const text = convertInlineContent(node.content);
  return `${prefix} ${text}`;
}

function convertParagraph(node: AdfNode): string {
  return convertInlineContent(node.content);
}

function convertInlineContent(content?: AdfNode[]): string {
  if (!content) return "";
  return content.map((child) => convertInlineNode(child)).join("");
}

function convertInlineNode(node: AdfNode): string {
  if (node.type === "text") {
    return applyMarks(node.text || "", node.marks);
  }
  if (node.type === "hardBreak") {
    return "\n";
  }
  if (node.type === "inlineCard") {
    const url = node.attrs?.url as string;
    return url ? `<${url}>` : "";
  }
  // Recurse for other inline nodes
  return convertInlineContent(node.content);
}

function applyMarks(text: string, marks?: AdfMark[]): string {
  if (!marks || marks.length === 0) return text;

  let result = text;
  for (const mark of marks) {
    switch (mark.type) {
      case "strong":
        result = `**${result}**`;
        break;
      case "em":
        result = `*${result}*`;
        break;
      case "code":
        result = `\`${result}\``;
        break;
      case "strike":
        result = `~~${result}~~`;
        break;
      case "link": {
        const href = mark.attrs?.href as string;
        if (href) {
          result = `[${result}](${href})`;
        }
        break;
      }
    }
  }
  return result;
}

function convertBulletList(node: AdfNode, indent: string): string {
  if (!node.content) return "";
  return node.content
    .map((item) => convertListItem(item, indent, "- "))
    .join("\n");
}

function convertOrderedList(node: AdfNode, indent: string): string {
  if (!node.content) return "";
  return node.content
    .map((item, i) => convertListItem(item, indent, `${i + 1}. `))
    .join("\n");
}

function convertListItem(node: AdfNode, indent: string, prefix: string): string {
  if (!node.content) return `${indent}${prefix}`;

  const parts: string[] = [];
  for (const child of node.content) {
    if (child.type === "paragraph") {
      parts.push(convertInlineContent(child.content));
    } else if (child.type === "bulletList") {
      parts.push(convertBulletList(child, indent + "  "));
    } else if (child.type === "orderedList") {
      parts.push(convertOrderedList(child, indent + "  "));
    } else {
      parts.push(convertNode(child, indent + "  "));
    }
  }

  if (parts.length === 0) return `${indent}${prefix}`;
  const [first, ...rest] = parts;
  const lines = [`${indent}${prefix}${first}`];
  for (const part of rest) {
    lines.push(part);
  }
  return lines.join("\n");
}

function convertCodeBlock(node: AdfNode): string {
  const language = (node.attrs?.language as string) || "";
  const text = convertInlineContent(node.content);
  return `\`\`\`${language}\n${text}\n\`\`\``;
}

function convertBlockquote(node: AdfNode): string {
  if (!node.content) return ">";
  const inner = node.content.map((child) => convertNode(child, "")).join("\n\n");
  return inner
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

function convertTable(node: AdfNode): string {
  if (!node.content) return "";

  const rows = node.content.filter((r) => r.type === "tableRow");
  if (rows.length === 0) return "";

  const tableData: string[][] = [];
  let hasHeader = false;

  for (const row of rows) {
    if (!row.content) continue;
    const cells: string[] = [];
    for (const cell of row.content) {
      if (cell.type === "tableHeader") hasHeader = true;
      const text = cell.content
        ? cell.content.map((c) => convertInlineContent(c.content)).join(" ")
        : "";
      cells.push(text.replace(/\|/g, "\\|"));
    }
    tableData.push(cells);
  }

  if (tableData.length === 0) return "";

  // Normalize column count
  const maxCols = Math.max(...tableData.map((r) => r.length));
  const normalized = tableData.map((r) => {
    while (r.length < maxCols) r.push("");
    return r;
  });

  const lines: string[] = [];
  lines.push("| " + normalized[0].join(" | ") + " |");

  if (hasHeader) {
    lines.push("| " + normalized[0].map(() => "---").join(" | ") + " |");
    for (let i = 1; i < normalized.length; i++) {
      lines.push("| " + normalized[i].join(" | ") + " |");
    }
  } else {
    lines.push("| " + normalized[0].map(() => "---").join(" | ") + " |");
    for (let i = 1; i < normalized.length; i++) {
      lines.push("| " + normalized[i].join(" | ") + " |");
    }
  }

  return lines.join("\n");
}

function convertMediaSingle(node: AdfNode): string {
  if (!node.content) return "";
  const media = node.content.find((c) => c.type === "media");
  if (!media) return "";

  const alt = (media.attrs?.alt as string) || "image";
  const url = (media.attrs?.url as string) || "";
  if (url) {
    return `![${alt}](${url})`;
  }
  // For file-type media (attachments), use best-effort
  const id = (media.attrs?.id as string) || "";
  return `![${alt}](attachment:${id})`;
}

/**
 * Confluence panelType → GFM alert type mapping.
 */
const PANEL_TO_ALERT: Record<string, string> = {
  info: "NOTE",
  success: "TIP",
  note: "IMPORTANT",
  warning: "WARNING",
  error: "CAUTION",
};

function convertPanel(node: AdfNode): string {
  const panelType = (node.attrs?.panelType as string) || "info";
  const alertType = PANEL_TO_ALERT[panelType] || "NOTE";
  const inner = node.content
    ? node.content.map((child) => convertNode(child, "")).join("\n\n")
    : "";
  const quoted = inner
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
  return `> [!${alertType}]\n${quoted}`;
}

function convertExpand(node: AdfNode): string {
  const title = (node.attrs?.title as string) || "Details";
  const inner = node.content
    ? node.content.map((child) => convertNode(child, "")).join("\n\n")
    : "";
  return `:::expand ${title}\n${inner}\n:::`;
}

function convertExtension(node: AdfNode): string {
  const key = (node.attrs?.extensionKey as string) || "unknown";
  return `<!-- confluence:${key} -->`;
}
