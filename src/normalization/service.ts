import type { Env } from "../env";
import { normalizeLeg } from "./normalizer";
import {
  listLegsNeedingNormalization,
  updateNormalizedLeg,
} from "./repository";

export async function backfillNormalizedLegs(
  env: Env,
  input: {
    limit?: number;
    afterId?: string;
  },
) {
  const legs = await listLegsNeedingNormalization(env, {
    limit: input.limit,
    afterId: input.afterId,
  });

  let updatedCount = 0;
  let unchangedCount = 0;

  for (const leg of legs) {
    const normalized = normalizeLeg({
      sport: leg.sport ?? undefined,
      league: leg.league ?? undefined,
      eventName: leg.event_name ?? undefined,
      marketType: leg.market_type ?? undefined,
      marketSubtype: leg.raw_market_subtype ?? undefined,
      selectionType: leg.selection_type ?? undefined,

      lineValue: leg.line_value ?? undefined,
      oddsAmerican: leg.odds_american ?? undefined,
      result: leg.result ?? undefined,
      startsAt: leg.starts_at ?? undefined,
    });

    if (!normalized.marketName) {
      unchangedCount += 1;
      continue;
    }

    const normalizedPlayerName =
      normalized.playerName ?? null;

    const currentPlayerName =
      leg.player_name ?? null;

    const playerChanged =
      normalizedPlayerName !== currentPlayerName;

    const marketChanged =
      normalized.marketName !== leg.market_subtype;

    if (!playerChanged && !marketChanged) {
      unchangedCount += 1;
      continue;
    }

    await updateNormalizedLeg(env, {
      legId: leg.id,
      playerName: normalizedPlayerName,
      marketName: normalized.marketName,
      clearCanonicalPlayer:
        currentPlayerName !== null &&
        normalizedPlayerName === null,
    });

    updatedCount += 1;
  }

  const nextCursor =
    legs.length > 0
      ? legs[legs.length - 1].id
      : null;

  return {
    inspectedCount: legs.length,
    updatedCount,
    unchangedCount,
    nextCursor,
  };
}