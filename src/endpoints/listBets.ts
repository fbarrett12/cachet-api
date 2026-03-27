import { listBets } from "../db/betReads";
import { json } from "../lib/json";
import type { Env } from "../env";

export async function listBetsEndpoint(
  request: Request,
  env: Env,
  origin: string,
): Promise<Response> {
  const url = new URL(request.url);
  const rawLimit = url.searchParams.get("limit");

  let limit: number | undefined;

  if (rawLimit != null) {
    const parsed = Number(rawLimit);

    if (!Number.isInteger(parsed) || parsed < 1) {
      return json({ error: "limit must be a positive integer." }, 400, origin);
    }

    limit = parsed;
  }

  try {
    const bets = await listBets(env, { limit });

    return json(
      {
        bets,
        count: bets.length,
      },
      200,
      origin,
    );
  } catch (error) {
    console.error("Failed to list bets", error);

    return json(
      {
        error: "Failed to list bets.",
        details: error instanceof Error ? error.message : String(error),
      },
      500,
      origin,
    );
  }
}