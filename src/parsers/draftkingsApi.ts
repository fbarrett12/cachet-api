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
  const match = url.match(
    /draftkings\.com\/social\/post\/([0-9a-fA-F-]+)/,
  );

  return match?.[1] ?? null;
}

export async function fetchDraftKingsSocialPost(
  postId: string,
): Promise<DraftKingsSocialApiResponse> {
  const response = await fetch(
    `https://sportsbook-nash.draftkings.com/api/sportscontent/social/v1/posts/${postId}`,
    {
      method: "GET",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        accept: "application/json, text/plain, */*",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`DraftKings social API request failed: ${response.status}`);
  }

  return response.json() as Promise<DraftKingsSocialApiResponse>;
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