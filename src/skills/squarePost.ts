import { Skill, SkillContext, SkillResult } from "./types";

const SQUARE_ENDPOINT = "/bapi/composite/v1/public/pgc/openApi/content/add";
const SQUARE_BASE_URL = "www.binance.com";

const ERROR_MESSAGES: Record<string, string> = {
  "10004": "Network error. Please try again",
  "10005":
    "Identity verification required. Please complete Binance identity verification to use Square posting",
  "10007": "Feature unavailable",
  "20002": "Content contains sensitive words. Please revise and try again",
  "20013": "Content length exceeds limit",
  "20020": "Cannot post empty content",
  "20022": "Content contains sensitive words with risk segments",
  "20041": "URL in content poses security risk",
  "30004": "User not found",
  "30008": "Account banned for violating platform guidelines",
  "220003": "API Key not found",
  "220004": "API Key expired",
  "220009": "Daily post limit exceeded for OpenAPI",
  "220010": "Unsupported content type",
  "220011": "Content body must not be empty",
  "2000001": "Account permanently blocked from posting",
  "2000002": "Device permanently blocked from posting",
};

interface SquarePostResult {
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
  code?: string;
}

async function squarePostRequest(
  content: string,
  apiKey: string,
  sessionId?: string,
): Promise<SquarePostResult> {
  const proxyResponse = await fetch("/api/binance/proxy", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(sessionId ? { "x-session-id": sessionId } : {}),
    },
    body: JSON.stringify({
      endpoint: SQUARE_ENDPOINT,
      baseUrl: SQUARE_BASE_URL,
      method: "POST",
      customHeaders: {
        "X-Square-OpenAPI-Key": apiKey,
        clienttype: "binanceSkill",
      },
      params: {
        bodyTextOnly: content,
      },
    }),
  });

  const data = await proxyResponse.json();

  if (data.code === "000000") {
    const postId = data.data?.id;
    return {
      success: true,
      postId: postId || undefined,
      postUrl: postId ? `https://www.binance.com/square/post/${postId}` : undefined,
      code: data.code,
    };
  }

  const errorMessage = ERROR_MESSAGES[data.code] || data.message || "Unknown error occurred";
  return {
    success: false,
    error: errorMessage,
    code: data.code,
  };
}

export const squarePost: Skill = {
  id: "binance-square/square-post",
  name: "Square Post",
  namespace: "binance-square",
  version: "1.2",
  description:
    'Post text content to Binance Square. Auto-run on messages like "post to square", "square post". Supports pure text posts with #hashtags.',
  inputSchema: {
    content: {
      type: "string",
      required: true,
      description: "The text content to post to Binance Square. Supports #hashtags.",
    },
  },
  execute: async (params: Record<string, unknown>, context: SkillContext): Promise<SkillResult> => {
    const content = params.content as string;

    if (!content || content.trim().length === 0) {
      return {
        success: false,
        data: {},
        summary: "No content provided. Please specify what you want to post.",
      };
    }

    if (content.length > 2000) {
      return {
        success: false,
        data: {},
        summary: "Content exceeds maximum length of 2000 characters.",
      };
    }

    const apiKey = context.apiKeys?.squareApiKey;

    if (!apiKey || apiKey.trim() === "") {
      return {
        success: false,
        data: {},
        summary:
          "Square API Key not configured. Please add your Binance Square API key in Settings to post to Square.",
      };
    }

    if (apiKey === "your_api_key" || apiKey === "YOUR_API_KEY") {
      return {
        success: false,
        data: {},
        summary:
          "Square API Key appears to be a placeholder. Please configure a valid API key in Settings.",
      };
    }

    try {
      const result = await squarePostRequest(content, apiKey);

      if (result.success) {
        return {
          success: true,
          data: {
            postId: result.postId,
            postUrl: result.postUrl,
          },
          summary: result.postUrl
            ? `Successfully posted to Binance Square! View at: ${result.postUrl}`
            : "Posted successfully, but post URL is unavailable.",
        };
      }

      return {
        success: false,
        data: { error: result.error || "Failed to post to Square" },
        summary:
          result.error ||
          "Failed to post to Square. Please check your Square API key and try again.",
      };
    } catch (error) {
      console.error("[SquarePost] Error posting to Square:", error);
      return {
        success: false,
        data: { error: "Network error posting to Square" },
        summary: `Error posting to Square: ${error instanceof Error ? error.message : "Unknown error"}. Please check your API keys and try again.`,
      };
    }
  },
};
