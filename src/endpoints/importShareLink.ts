import { json } from "../lib/json";
import { detectSportsbook } from "../lib/sportsbook";
import { ImportShareLinkRequestSchema } from "../types/bets";
import {
  createBetImport,
  updateBetImportAfterParse,
} from "../db/imports";
import { createBetWithLegs } from "../db/bets";
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
    console.log("Creating bet import", { url: parsed.data.url, sportsbook });

    const createdImport = await createBetImport(env, {
      sourceUrl: parsed.data.url,
      sportsbookSlug: sportsbook,
    });

    console.log("Bet import created", { importId: createdImport.id });

    const html = await fetchHtml(parsed.data.url);
    console.log("Fetched share HTML", { length: html.length });

    const parserResult = await parseSharePage(sportsbook, {
      html,
      shareUrl: parsed.data.url,
    });

    console.log("Parser result received", {
      parseStatus: parserResult.parseStatus,
      hasParsedBet: !!parserResult.parsedBet,
    });

    await updateBetImportAfterParse(env, {
      importId: createdImport.id,
      rawHtml: html,
      rawPayload: parserResult.rawPayload,
      parseStatus: parserResult.parseStatus,
      errorMessage: parserResult.errorMessage,
      parserVersion: "draftkings_social_v1",
    });

    let betId: string | undefined;

    if (parserResult.parseStatus === "parsed" && parserResult.parsedBet) {
      const persistedBet = await createBetWithLegs(env, {
        userId: null,
        sportsbookSlug: sportsbook,
        betImportId: createdImport.id,
        parsedBet: parserResult.parsedBet,
      });

      betId = persistedBet.betId;
    }

    return json(
      {
        importId: createdImport.id,
        betId,
        sportsbook,
        status: parserResult.parseStatus,
        parsedBet: parserResult.parsedBet,
        message:
          parserResult.parseStatus === "parsed"
            ? "Import fetched, parsed, and persisted."
            : parserResult.errorMessage ?? "Import saved but parsing failed.",
      },
      200,
      origin,
    );
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