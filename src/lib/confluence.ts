import { buildApiBaseUrl } from "./url-parser.js";
import type {
  ConfluencePage,
  ConfluenceFolder,
  ConfluenceSpace,
  ConfluenceSpacesResponse,
  ConfluencePagesResponse,
  AdfDocument,
  AttachmentUploadResult,
} from "./types.js";

/** HTTP client for the Confluence Cloud REST API v2. */
export class ConfluenceClient {
  private apiBase: string;
  private v1ApiBase: string;
  private authHeader: string;

  constructor(baseUrl: string, email: string, token: string) {
    this.apiBase = buildApiBaseUrl(baseUrl);
    this.v1ApiBase = baseUrl.replace(/\/+$/, "") + "/wiki/rest/api";
    this.authHeader = "Basic " + Buffer.from(`${email}:${token}`).toString("base64");
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.apiBase}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...((options.headers as Record<string, string>) || {}),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let message = `Confluence API error (${response.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.errors?.[0]?.title) {
          message = `${message}: ${errorJson.errors[0].title}`;
        } else if (errorJson.message) {
          message = `${message}: ${errorJson.message}`;
        }
      } catch {
        if (errorText) {
          message = `${message}: ${errorText.slice(0, 200)}`;
        }
      }
      throw new Error(message);
    }

    const text = await response.text();
    if (!text) {
      return {} as T;
    }
    return JSON.parse(text) as T;
  }

  /** Verifies that the configured credentials can reach the Confluence API. */
  async checkAccess(): Promise<void> {
    try {
      await this.request<ConfluenceSpacesResponse>("/spaces?limit=1");
    } catch (err) {
      const message = (err as Error).message;
      if (message.includes("401")) {
        throw new Error("Authentication failed. Check your email and API token (md2cf config).");
      }
      if (message.includes("403")) {
        throw new Error("Access denied. Your token may lack Confluence permissions.");
      }
      throw new Error(`Cannot reach Confluence: ${message}`);
    }
  }

  /** Fetches a page by its numeric ID, including ADF body. */
  async getPage(pageId: string): Promise<ConfluencePage> {
    return this.request<ConfluencePage>(`/pages/${pageId}?body-format=atlas_doc_format`);
  }

  /** Fetches a folder by its numeric ID. */
  async getFolder(folderId: string): Promise<ConfluenceFolder> {
    return this.request<ConfluenceFolder>(`/folders/${folderId}`);
  }

  /** Fetches a space by its key (e.g. "ENG"). Throws if not found. */
  async getSpace(spaceKey: string): Promise<ConfluenceSpace> {
    const response = await this.request<ConfluenceSpacesResponse>(
      `/spaces?keys=${encodeURIComponent(spaceKey)}&limit=1`,
    );
    if (!response.results || response.results.length === 0) {
      throw new Error(`Space not found: ${spaceKey}`);
    }
    return response.results[0];
  }

  /** Searches for a page by title within a space. Returns null if not found. */
  async findPageByTitle(spaceId: string, title: string): Promise<ConfluencePage | null> {
    const response = await this.request<ConfluencePagesResponse>(
      `/spaces/${spaceId}/pages?title=${encodeURIComponent(title)}&limit=1`,
    );
    if (!response.results || response.results.length === 0) {
      return null;
    }
    return response.results[0];
  }

  /** Creates a new page in a space, optionally as a child of a parent page. */
  async createPage(
    spaceId: string,
    title: string,
    adfBody: AdfDocument,
    parentId?: string,
  ): Promise<ConfluencePage> {
    const body: Record<string, unknown> = {
      spaceId,
      status: "current",
      title,
      body: {
        representation: "atlas_doc_format",
        value: JSON.stringify(adfBody),
      },
    };

    if (parentId) {
      body.parentId = parentId;
    }

    return this.request<ConfluencePage>("/pages", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /** Updates an existing page with new content, incrementing the version number. */
  async updatePage(
    pageId: string,
    title: string,
    adfBody: AdfDocument,
    versionNumber: number,
    versionMessage?: string,
  ): Promise<ConfluencePage> {
    const body = {
      id: pageId,
      status: "current",
      title,
      body: {
        representation: "atlas_doc_format",
        value: JSON.stringify(adfBody),
      },
      version: {
        number: versionNumber,
        message: versionMessage || "Updated via md2cf",
      },
    };

    return this.request<ConfluencePage>(`/pages/${pageId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  /** Lists child pages of a given parent page. */
  async getPageChildren(pageId: string): Promise<ConfluencePage[]> {
    const response = await this.request<ConfluencePagesResponse>(
      `/pages/${pageId}/children?limit=250`,
    );
    return response.results || [];
  }

  /** Gets the current version number for a page. */
  async getPageVersion(pageId: string): Promise<number> {
    const page = await this.getPage(pageId);
    return page.version?.number || 0;
  }

  /**
   * Uploads a file attachment to a Confluence page via the REST API v1.
   * If the attachment already exists (HTTP 400), it updates the existing one.
   */
  async uploadAttachment(
    pageId: string,
    filename: string,
    buffer: Buffer,
  ): Promise<AttachmentUploadResult> {
    const url = `${this.v1ApiBase}/content/${pageId}/child/attachment`;
    const blob = new Blob([buffer], { type: "image/png" });
    const formData = new FormData();
    formData.append("file", blob, filename);
    formData.append("minorEdit", "true");

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: this.authHeader,
          "X-Atlassian-Token": "nocheck",
        },
        body: formData,
      });

      if (response.ok) {
        const data = (await response.json()) as {
          results?: Array<{
            extensions?: { fileId?: string; collectionName?: string };
          }>;
        };
        const attachment = data.results?.[0];
        return {
          success: true,
          fileId: attachment?.extensions?.fileId,
          collectionName: attachment?.extensions?.collectionName || `contentId-${pageId}`,
        };
      }

      // Handle duplicate — update existing attachment
      if (response.status === 400) {
        return this.updateExistingAttachment(pageId, filename, buffer);
      }

      const errorText = await response.text();
      return {
        success: false,
        error: `Upload failed (${response.status}): ${errorText.slice(0, 200)}`,
      };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  private async updateExistingAttachment(
    pageId: string,
    filename: string,
    buffer: Buffer,
  ): Promise<AttachmentUploadResult> {
    // Find existing attachment ID
    const listUrl = `${this.v1ApiBase}/content/${pageId}/child/attachment?filename=${encodeURIComponent(filename)}`;
    try {
      const listResponse = await fetch(listUrl, {
        headers: {
          Authorization: this.authHeader,
          Accept: "application/json",
        },
      });

      if (!listResponse.ok) {
        return { success: false, error: `Failed to list attachments (${listResponse.status})` };
      }

      const listData = (await listResponse.json()) as {
        results?: Array<{
          id?: string;
          extensions?: { fileId?: string; collectionName?: string };
        }>;
      };
      const existingAttachment = listData.results?.[0];
      if (!existingAttachment?.id) {
        return {
          success: false,
          error: "Duplicate attachment detected but could not find existing",
        };
      }

      // Update existing attachment
      const updateUrl = `${this.v1ApiBase}/content/${pageId}/child/attachment/${existingAttachment.id}/data`;
      const blob = new Blob([buffer], { type: "image/png" });
      const formData = new FormData();
      formData.append("file", blob, filename);
      formData.append("minorEdit", "true");

      const updateResponse = await fetch(updateUrl, {
        method: "POST",
        headers: {
          Authorization: this.authHeader,
          "X-Atlassian-Token": "nocheck",
        },
        body: formData,
      });

      if (updateResponse.ok) {
        const data = (await updateResponse.json()) as {
          extensions?: { fileId?: string; collectionName?: string };
        };
        return {
          success: true,
          fileId: data.extensions?.fileId || existingAttachment.extensions?.fileId,
          collectionName:
            data.extensions?.collectionName ||
            existingAttachment.extensions?.collectionName ||
            `contentId-${pageId}`,
        };
      }

      return { success: false, error: `Update attachment failed (${updateResponse.status})` };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }
}
