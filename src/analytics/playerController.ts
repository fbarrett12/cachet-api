import type { AuthUser } from "../auth/jwt";
import type { Env } from "../env";
import { json } from "../lib/json";
import { getPlayerAnalytics } from "./playerService";

export async function getPlayerAnalyticsController(
  request: Request,
  env: Env,
  origin: string,
  authUser: AuthUser,
): Promise<Response> {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/").filter(Boolean);

  const playerId = pathParts[pathParts.length - 1];

  if (!playerId) {
    return json(
      { error: "Player ID is required." },
      400,
      origin,
    );
  }

  try {
    const analytics = await getPlayerAnalytics(env, {
      userId: authUser.id,
      playerId,
    });

    if (!analytics) {
      return json(
        { error: "No betting history found for this player." },
        404,
        origin,
      );
    }

    return json(
      { analytics },
      200,
      origin,
    );
  } catch (error) {
    console.error("Failed to fetch player analytics", error);

    return json(
      {
        error: "Failed to fetch player analytics.",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      500,
      origin,
    );
  }
}