import { logger } from "./logger";

type RawSuggestion = {
  title?: unknown;
  description?: unknown;
  children?: unknown;
};

export interface AiSubnodeSuggestion {
  title: string;
  children?: AiSubnodeSuggestion[];
}

interface GenerateSubnodesParams {
  parentDescription: string;
  existingChildren?: string[];
  mindmap?: MindmapNodeSummary[];
}

interface MindmapNodeSummary {
  id: string;
  parentId: string | null;
  description: string;
}

interface AzureOpenAiConfig {
  endpoint: string;
  apiKey: string;
  model: string;
  apiVersion: string;
}

interface AzureChatCompletionsResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
}

class AiSuggestionService {
  private ensureConfig(): AzureOpenAiConfig {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const model = process.env.AZURE_OPENAI_MODEL;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION;

    if (!endpoint || !apiKey || !model || !apiVersion) {
      logger.error("Azure OpenAI configuration missing", {
        hasEndpoint: Boolean(endpoint),
        hasApiKey: Boolean(apiKey),
        hasModel: Boolean(model),
        hasApiVersion: Boolean(apiVersion),
      });
      throw new Error("Azure OpenAI configuration is incomplete");
    }

    return { endpoint, apiKey, model, apiVersion };
  }

  async generateSubnodes(
    params: GenerateSubnodesParams,
  ): Promise<AiSubnodeSuggestion[]> {
    const config = this.ensureConfig();

    const url = `${config.endpoint.replace(/\/$/, "")}/openai/deployments/${config.model}/chat/completions?api-version=${config.apiVersion}`;

    const childSummary =
      params.existingChildren && params.existingChildren.length > 0
        ? params.existingChildren.map((child) => `- ${child}`).join("\n")
        : "(No existing children)";

    const mindmapOutline = this.renderMindmapOutline(params.mindmap);

    const requestBody = {
      messages: [
        {
          role: "system",
          content:
            "You are assisting with mind mapping. Respond using JSON matching the schema " +
            '{"suggestions": [{"title": string, "children"?: Suggestion[]}]} where Suggestion follows the same shape. ' +
            "Provide concise titles for the first level (ideally under 8 words, maximum 12). " +
            "You may extend nested suggestions up to three levels deep; deeper children can use slightly longer, phrase-like titles when that adds clarity. " +
            "You can also add more descriptive text to the suggestions when it helps convey the idea or information - like actual numerical values or dates if relevant. " +
            "Include a relevant emoji when it enhances understanding.",
        },
        {
          role: "user",
          content:
            `The parent node is: "${params.parentDescription}".\n` +
            `Existing children are:\n${childSummary}\n\n` +
            `Full mind map outline:\n${mindmapOutline}\n\n` +
            `Suggest 1-5 additional child nodes relevant to the parent. ` +
            `Avoid duplicates of existing topics. ` +
            `Include nested child ideas when useful by populating children arrays.`,
        },
      ],
      temperature: 0.4,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": config.apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();

      logger.error("Azure OpenAI request failed to URL " + url, {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error("Failed to generate AI suggestions");
    }

    const data = (await response.json()) as AzureChatCompletionsResponse;
    const messageContent = data.choices?.[0]?.message?.content;
    const rawContent = Array.isArray(messageContent)
      ? messageContent
          .map((part) =>
            typeof part === "string"
              ? part
              : typeof part.text === "string"
                ? part.text
                : "",
          )
          .join("")
      : messageContent;

    if (typeof rawContent !== "string" || !rawContent.trim()) {
      logger.error("Azure OpenAI returned empty content", { rawContent });
      throw new Error("Azure OpenAI response did not include content");
    }

    let parsed: { suggestions?: RawSuggestion[] };

    try {
      parsed = JSON.parse(rawContent);
    } catch (error) {
      logger.error("Unable to parse Azure OpenAI response", {
        error,
        rawContent,
      });
      throw new Error("Unable to parse AI response");
    }

    if (!Array.isArray(parsed.suggestions)) {
      logger.error("Azure OpenAI response missing suggestions array", {
        parsed,
      });
      throw new Error("AI response did not contain suggestions");
    }

    const suggestions: AiSubnodeSuggestion[] = [];

    for (const item of parsed.suggestions) {
      const suggestion = this.transformRawSuggestion(item);

      if (suggestion) {
        suggestions.push(suggestion);
      }
    }

    return suggestions;
  }

  private renderMindmapOutline(mindmap?: MindmapNodeSummary[]): string {
    if (!mindmap || mindmap.length === 0) {
      return "(No additional context provided)";
    }

    const childrenMap = new Map<string | null, MindmapNodeSummary[]>();

    for (const node of mindmap) {
      const parentId = node.parentId;
      const entry = childrenMap.get(parentId) ?? [];

      entry.push(node);
      childrenMap.set(parentId, entry);
    }

    const roots =
      childrenMap.get(null) ?? mindmap.filter((node) => !node.parentId);

    const lines: string[] = [];

    const traverse = (node: MindmapNodeSummary, depth: number) => {
      const indent = "  ".repeat(depth);
      const text = node.description.trim().replace(/[\r\n]+/g, " ");

      lines.push(`${indent}- ${text}`);
      const children = childrenMap.get(node.id);

      if (children) {
        children.sort((a, b) => a.description.localeCompare(b.description));

        for (const child of children) {
          traverse(child, depth + 1);
        }
      }
    };

    roots
      .filter(
        (node, index, self) =>
          self.findIndex((candidate) => candidate.id === node.id) === index,
      )
      .sort((a, b) => a.description.localeCompare(b.description))
      .forEach((root) => {
        traverse(root, 0);
      });

    return lines.join("\n") || "(Mind map content omitted)";
  }

  private transformRawSuggestion(
    raw: RawSuggestion,
  ): AiSubnodeSuggestion | undefined {
    if (!raw || typeof raw !== "object") {
      return undefined;
    }

    if (typeof raw.title !== "string") {
      return undefined;
    }

    const cleanedTitle = raw.title.trim();

    if (!cleanedTitle) {
      return undefined;
    }

    let children: AiSubnodeSuggestion[] | undefined;

    if (Array.isArray(raw.children)) {
      children = raw.children
        .map((child) => this.transformRawSuggestion(child as RawSuggestion))
        .filter((child): child is AiSubnodeSuggestion => Boolean(child));
    }

    return {
      title: cleanedTitle,
      children: children && children.length > 0 ? children : undefined,
    };
  }
}

export const aiSuggestionService = new AiSuggestionService();
