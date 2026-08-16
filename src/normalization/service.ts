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
  },
) {
  const legs = await listLegsNeedingNormalization(env, {
    limit: input.limit,
  });

  let updatedCount = 0;
  let unchangedCount = 0;

  for (const leg of legs) {
    const normalized = normalizeLeg({
      sport: leg.sport ?? undefined,
      league: leg.league ?? undefined,
      eventName: leg.event_name ?? undefined,
      marketType: leg.market_type ?? undefined,
      marketSubtype: leg.market_subtype ?? undefined,
      selectionType: leg.selection_type ?? undefined,
      playerName: leg.player_name ?? undefined,
      lineValue: leg.line_value ?? undefined,
      oddsAmerican: leg.odds_american ?? undefined,
      result: leg.result ?? undefined,
      startsAt: leg.starts_at ?? undefined,
    });

    if (!normalized.playerName || !normalized.marketName) {
      unchangedCount += 1;
      continue;
    }

    await updateNormalizedLeg(env, {
      legId: leg.id,
      playerName: normalized.playerName,
      marketName: normalized.marketName,
    });

    updatedCount += 1;
  }

  return {
    inspectedCount: legs.length,
    updatedCount,
    unchangedCount,
  };
}