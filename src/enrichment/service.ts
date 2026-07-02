import type { Env } from "../env";
import {
  countUnenrichedLegs,
  findCanonicalMarketMatch,
  listUnenrichedLegs,
  summarizeUnenrichedLeagues,
  summarizeUnenrichedMarkets,
  updateLegCanonicalRefs,
} from "./repository";

function inferLeagueSlug(rawLeague: string | null): string | null {
  const normalized = rawLeague?.toLowerCase().trim();

  if (!normalized) return null;

  if (normalized === "nba") return "nba";
  if (normalized === "wnba") return "wnba";
  if (normalized === "mlb") return "mlb";

  return null;
}

function inferMarketSlug(input: {
  leagueSlug: string;
  marketSubtype: string | null;
}): string | null {
  const market = input.marketSubtype?.toLowerCase().trim();

  if (!market) return null;

  if (market.includes("moneyline")) {
    return `${input.leagueSlug}-moneyline`;
  }

  if (market.includes("points + rebounds + assists")) {
    return `${input.leagueSlug}-pra`;
  }

  if (market.includes("hits + runs + rbis")) {
    return `${input.leagueSlug}-hrrbi`;
  }

  if (market.includes("points")) {
    return `${input.leagueSlug}-points`;
  }

  if (market.includes("assists")) {
    return `${input.leagueSlug}-assists`;
  }

  if (market.includes("rebounds")) {
    return `${input.leagueSlug}-rebounds`;
  }

  return null;
}

export async function enrichBetLegs(env: Env, input: { limit?: number }) {
  const legs = await listUnenrichedLegs(env, {
    limit: input.limit,
  });

  let enrichedCount = 0;
  let skippedCount = 0;

  for (const leg of legs) {
    const leagueSlug = inferLeagueSlug(leg.league);

    if (!leagueSlug) {
      skippedCount += 1;
      continue;
    }

    const marketSlug = inferMarketSlug({
      leagueSlug,
      marketSubtype: leg.market_subtype,
    });

    if (!marketSlug) {
      skippedCount += 1;
      continue;
    }

    const match = await findCanonicalMarketMatch(env, {
      leagueSlug,
      marketSlug,
    });

    if (!match) {
      skippedCount += 1;
      continue;
    }

    await updateLegCanonicalRefs(env, {
      legId: leg.id,
      sportId: match.sport_id,
      leagueId: match.league_id,
      marketId: match.market_id,
    });

    enrichedCount += 1;
  }

  return {
    inspectedCount: legs.length,
    enrichedCount,
    skippedCount,
  };
}

export async function buildEnrichmentReport(env: Env) {
  const [totalUnenriched, byLeague, byMarketSubtype, sampleLegs] =
    await Promise.all([
      countUnenrichedLegs(env),
      summarizeUnenrichedLeagues(env, { limit: 20 }),
      summarizeUnenrichedMarkets(env, { limit: 20 }),
      listUnenrichedLegs(env, { limit: 10 }),
    ]);

  return {
    totalUnenriched,
    byLeague: byLeague.map((row) => ({
      league: row.league ?? "Unknown",
      count: Number(row.count),
    })),
    byMarketSubtype: byMarketSubtype.map((row) => ({
      marketSubtype: row.market_subtype ?? "Unknown",
      count: Number(row.count),
    })),
    sampleLegs: sampleLegs.map((leg) => ({
      id: leg.id,
      sport: leg.sport,
      league: leg.league,
      marketSubtype: leg.market_subtype,
    })),
  };
}