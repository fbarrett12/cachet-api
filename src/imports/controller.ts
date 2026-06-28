import type { AuthUser } from "../auth/jwt";
import type { Env } from "../env";
import { json } from "../lib/json";
import { ImportShareLinkRequestSchema } from "../types/bets";
import { importSharedBet } from "./service";

export async function importShareLinkController(
  request: Request,
  env: Env,
  origin: string,
  authUser: AuthUser,
): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400, origin);
  }

  const parsed = ImportShareLinkRequestSchema.safeParse(body);

  if (!parsed.success) {
    return json(
      {
        error: "Invalid payload.",
        issues: parsed.error.issues,
      },
      400,
      origin,
    );
  }

  try {
    const result = await importSharedBet(env, {
      authUser,
      shareUrl: parsed.data.url,
    });

    return json(result, 200, origin);
  } catch (error) {
    console.error("Failed to import share link", error);

    return json(
      {
        error: "Failed to import share link.",
        details: error instanceof Error ? error.message : String(error),
      },
      500,
      origin,
    );
  }
}