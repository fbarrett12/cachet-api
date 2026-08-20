import type { AuthUser } from "../auth/jwt";
import type { Env } from "../env";
import { json } from "../lib/json";
import { getBettorRankings } from "./rankingsService";

export async function getBettorRankingsController(
  _request: Request,
  env: Env,
  origin: string,
  authUser: AuthUser,
): Promise<Response> {
  try {
    const rankings = await getBettorRankings(env, {
      userId: authUser.id,
    });

    return json(
      {
        rankings,
      },
      200,
      origin,
    );
  } catch (error) {
    console.error("Failed to fetch bettor rankings", error);

    return json(
      {
        error: "Failed to fetch bettor rankings.",
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