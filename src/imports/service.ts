import type { AuthUser } from "../auth/jwt";
import { createBetWithLegs } from "../db/bets";
import type { Env } from "../env";
import { fetchHtml } from "../lib/fetchHtml";
import { detectSportsbook } from "../lib/sportsbook";
import { parseSharePage } from "../parsers";
import type { Sportsbook } from "../types/bets";
import {
  createBetImport,
  updateBetImportAfterParse,
} from "./repository";

const PARSER_VERSION = "draftkings_social_v2_nested";

export async function importSharedBet(
  env: Env,
  input: {
    authUser: AuthUser;
    shareUrl: string;
  },
) {
  const userId = input.authUser.id;
  const shareUrl = input.shareUrl;
  const sportsbook = detectSportsbook(shareUrl);

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

  return {
    importId: createdImport.id,
    betId,
    sportsbook,
    status: parserResult.parseStatus,
    parsedBet: parserResult.parsedBet,
    message,
  };
}