export async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: {
      "user-agent": "CachetBot/0.1",
      accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch share page: ${response.status}`);
  }

  return response.text();
}