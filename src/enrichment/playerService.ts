import type { Env } from "../env";
import {
  attachCanonicalPlayerToLeg,
  createCanonicalPlayer,
  findPlayersByNameAndLeague,
  listLegsNeedingPlayerEnrichment,
} from "./playerRepository";

function normalizeLeagueSlug(
  league: string | null | undefined,
): string | null {
  const normalized = league?.trim().toLowerCase();

  if (!normalized) return null;

  if (normalized === "nba") return "nba";
  if (normalized === "wnba") return "wnba";
  if (normalized === "mlb") return "mlb";

  return null;
}

export async function enrichCanonicalPlayers(
  env: Env,
  input: {
    limit?: number;
  },
) {
  const legs = await listLegsNeedingPlayerEnrichment(env, {
    limit: input.limit,
  });

  let matchedCount = 0;
  let createdCount = 0;
  let skippedCount = 0;

  for (const leg of legs) {
    const leagueSlug = normalizeLeagueSlug(leg.league);

    if (!leagueSlug) {
      skippedCount += 1;
      continue;
    }

    const players = await findPlayersByNameAndLeague(env, {
        playerName: leg.player_name,
        leagueSlug,
    });

    if (players.length > 1) {
        skippedCount += 1;
        continue;
    }


    let player = players[0];

    if (player) {
        matchedCount += 1;
    } else {
        player = await createCanonicalPlayer(env, {
        displayName: leg.player_name,
        leagueSlug,
      });

      createdCount += 1;
    }   

    await attachCanonicalPlayerToLeg(env, {
      legId: leg.id,
      playerId: player.id,
    });
  }

  return {
    inspectedCount: legs.length,
    matchedCount,
    createdCount,
    skippedCount,
  };
}