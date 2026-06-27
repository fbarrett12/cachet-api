import { getCurrentUserFromRequest } from "../auth/requireUser";
import { createBetWithLegs } from "../db/bets";
import {
  createBetImport,
  updateBetImportAfterParse,
} from "../db/imports";
import type { Env } from "../env";
import { fetchHtml } from "../lib/fetchHtml";
import { json } from "../lib/json";
import { detectSportsbook } from "../lib/sportsbook";
import { parseSharePage } from "../parsers";
import { ImportShareLinkRequestSchema } from "../types/bets";

const PARSER_VERSION = "draftkings_social_v2_nested";

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

  const authUser = await getCurrentUserFromRequest(request, env);

  if (!authUser) {
    return json({ error: "Unauthorized." }, 401, origin);
  }

  const shareUrl = parsed.data.url;
  const userId = authUser.id;
  const sportsbook = detectSportsbook(shareUrl);

  try {
    console.log("Creating bet import", {
      userId,
      sportsbook,
      shareUrl,
    });

    const createdImport = await createBetImport(env, {
      userId,
      sourceUrl: shareUrl,
      sportsbookSlug: sportsbook,
    });

    console.log("Bet import created", {
      importId: createdImport.id,
      userId,
    });

    const html = await fetchHtml(shareUrl);

    console.log("Fetched share HTML", {
      importId: createdImport.id,
      length: html.length,
    });

    const parserResult = await parseSharePage(sportsbook, {
      html,
      shareUrl,
    });

    console.log("Parser result received", {
      importId: createdImport.id,
      parseStatus: parserResult.parseStatus,
      hasParsedBet: Boolean(parserResult.parsedBet),
    });

    await updateBetImportAfterParse(env, {
      importId: createdImport.id,
      rawHtml: html,
      rawPayload: parserResult.rawPayload,
      parseStatus: parserResult.parseStatus,
      errorMessage: parserResult.errorMessage,
      parserVersion: PARSER_VERSION,
    });

    let betId: string | undefined;

    if (parserResult.parseStatus === "parsed" && parserResult.parsedBet) {
      const persistedBet = await createBetWithLegs(env, {
        userId,
        sportsbookSlug: sportsbook,
        betImportId: createdImport.id,
        parsedBet: parserResult.parsedBet,
      });

      betId = persistedBet.betId;
    }

    const message =
      parserResult.parseStatus === "parsed"
        ? "Import fetched, parsed, and persisted."
        : parserResult.errorMessage ?? "Import saved but parsing failed.";

    return json(
      {
        importId: createdImport.id,
        betId,
        sportsbook,
        status: parserResult.parseStatus,
        parsedBet: parserResult.parsedBet,
        message,
      },
      200,
      origin,
    );
  } catch (error) {
    console.error("Failed to import share link", {
      userId,
      sportsbook,
      shareUrl,
      error,
    });

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