type DraftKingsSocialApiResponse = {
  post?: {
    key?: string;
    postEntries?: Array<{
      metadataProperties?: {
        propertyTypeId?: number;
        properties?: {
          name?: string;
          value?: string;
        };
      };
    }>;
  };
};

export function extractDraftKingsPostIdFromUrl(url: string): string | null {
  const match = url.match(/draftkings\.com\/social\/post\/([0-9a-fA-F-]+)/);
  return match?.[1] ?? null;
}

export async function fetchDraftKingsSocialPost(
  postId: string,
): Promise<DraftKingsSocialApiResponse> {
  const response = await fetch(
    "https://api.draftkings.com/comments/feed/post/details.json",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/plain, */*",
        referer: "https://sportsbook.draftkings.com/",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({
        postKey: postId,
        replyDepth: 1,
        replyScrolling: {
          limit: 10,
          sort: "desc",
        },
      }),
    },
  );

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `DraftKings social API request failed: ${response.status} ${response.statusText}. Body: ${text.slice(0, 500)}`,
    );
  }

  try {
    return JSON.parse(text) as DraftKingsSocialApiResponse;
  } catch {
    throw new Error(
      `DraftKings social API returned non-JSON. Body: ${text.slice(0, 500)}`,
    );
  }
}

export function extractBetJsonBase64(
  payload: DraftKingsSocialApiResponse,
): string | null {
  const entries = payload.post?.postEntries ?? [];

  for (const entry of entries) {
    const props = entry.metadataProperties?.properties;

    if (props?.name === "betJSON" && typeof props.value === "string") {
      return props.value;
    }
  }

  return null;
}

export function decodeBase64Json<T>(value: string): T {
  const decoded = atob(value);
  return JSON.parse(decoded) as T;
}