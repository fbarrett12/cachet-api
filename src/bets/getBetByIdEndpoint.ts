import { json } from "../lib/json";
import { getBetById } from "./repository";
import type { AuthUser } from "../auth/jwt";
import type { Env } from "../env";

export async function getBetByIdEndpoint(
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
    const bet = await getBetById(env, {
      betId,
      userId: authUser.id,
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