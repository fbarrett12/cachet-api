import { json } from "../lib/json";
import { getBetById } from "../db/betReads";
import type { Env } from "../env";

export async function getBetByIdEndpoint(
  request: Request,
  env: Env,
  origin: string,
): Promise<Response> {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const betId = pathParts[pathParts.length - 1];

  if (!betId) {
    return json({ error: "Bet ID is required." }, 400, origin);
  }

  try {
    const bet = await getBetById(env, betId);

    if (!bet) {
      return json({ error: "Bet not found." }, 404, origin);
    }

    return json({ bet }, 200, origin);
  } catch (error) {
    console.error("Failed to fetch bet by ID", error);

    return json(
      {
        error: "Failed to fetch bet.",
        details: error instanceof Error ? error.message : String(error),
      },
      500,
      origin,
    );
  }
}