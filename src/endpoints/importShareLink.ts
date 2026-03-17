import { json } from "../lib/json";
import { detectSportsbook } from "../lib/sportsbook";
import { ImportShareLinkRequestSchema } from "../types/bets";
import {
  createBetImport,
  updateBetImportAfterParse,
} from "../db/imports";
import { fetchHtml } from "../lib/fetchHtml";
import { parseSharePage } from "../parsers";
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

    const html = await fetchHtml(parsed.data.url);
    const parserResult = parseSharePage(sportsbook, html);

    await updateBetImportAfterParse(env, {
      importId: createdImport.id,
      rawHtml: html,
      rawPayload: parserResult.rawPayload,
      parseStatus: parserResult.parseStatus,
      errorMessage: parserResult.errorMessage,
      parserVersion: "v1_stub",
    });

    return json(
      {
        importId: createdImport.id,
        sportsbook,
        status: parserResult.parseStatus,
        parsedBet: parserResult.parsedBet,
        message:
          parserResult.parseStatus === "parsed"
            ? "Import fetched and parsed."
            : parserResult.errorMessage ?? "Import saved but parsing failed.",
      },
      200,
      origin,
    );
  } catch (error) {
    console.error("Failed to import share link", error);

    return json({ error: "Failed to import share link." }, 500, origin);
  }
}