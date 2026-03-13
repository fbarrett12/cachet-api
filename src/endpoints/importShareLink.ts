import { json } from "../lib/json";
import { detectSportsbook } from "../lib/sportsbook";
import { ImportShareLinkRequestSchema } from "../types/bets";
import { createBetImport } from "../db/imports";
import type { Env } from "../env";

export async function importShareLink(
  request: Request,
  env: Env,
  origin: string,
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

  const sportsbook = detectSportsbook(parsed.data.url);

  try {
    const createdImport = await createBetImport(env, {
      sourceUrl: parsed.data.url,
      sportsbookSlug: sportsbook,
    });

    return json(
      {
        importId: createdImport.id,
        sportsbook,
        status: createdImport.parseStatus,
        parsedBet: {
          sportsbook,
          betType: "unknown",
          legs: [],
        },
        message: "Import accepted and persisted.",
      },
      200,
      origin,
    );
  } catch (error) {
    console.error("Failed to create bet import", error);

    return json(
      { error: "Failed to persist import." },
      500,
      origin,
    );
  }
}