import type { AuthUser } from "../auth/jwt";
import type { Env } from "../env";
import { json } from "../lib/json";
import { getUserBetById, listUserBets } from "./service";

export async function listBetsController(
  request: Request,
  env: Env,
  origin: string,
  authUser: AuthUser,
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
    const bets = await listUserBets(env, {
      userId: authUser.id,
      limit,
    });

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

export async function getBetByIdController(
  request: Request,
  env: Env,
  origin: string,
  authUser: AuthUser,
): Promise<Response> {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const betId = pathParts[pathParts.length - 1];

  if (!betId) {
    return json({ error: "Bet ID is required." }, 400, origin);
  }

  try {
    const bet = await getUserBetById(env, {
      userId: authUser.id,
      betId,
    });

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