import type { Env } from "../env";
import { createDbClient } from "../db/client";

export type NormalizableLegRow = {
  id: string;
  sport: string | null;
  league: string | null;
  event_name: string | null;
  market_type: string | null;
  market_subtype: string | null;
  selection_type: string | null;
  player_name: string | null;
  line_value: number | null;
  odds_american: number | null;
  result: string | null;
  starts_at: string | null;
};

export async function listLegsNeedingNormalization(
  env: Env,
  input: {
    limit?: number;
    afterId?: string;
  },
): Promise<NormalizableLegRow[]> {
  const client = createDbClient(env);
  await client.connect();

  try {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);

    const sql = `
      select
        id,
        sport,
        league,
        event_name,
        market_type,
        market_subtype,
        selection_type,
        player_name,
        line_value,
        odds_american,
        result,
        starts_at
      from bet_legs
      where market_subtype is not null
        and (
          $2::uuid is null
          or id > $2
        )
      order by id asc
      limit $1
    `;

    const values = [
      limit,
      input.afterId,
    ];

    const result =
      await client.query<NormalizableLegRow>(sql, values);

    return result.rows;
  } finally {
    await client.end();
  }
}

export async function updateNormalizedLeg(
  env: Env,
  input: {
    legId: string;
    playerName: string | null;
    marketName: string;
    clearCanonicalPlayer?: boolean;
  },
): Promise<void> {
  const client = createDbClient(env);
  await client.connect();

  try {
    const sql = `
      update bet_legs
      set
        player_name = $2,
        market_subtype = $3,
        canonical_player_id = case
          when $4 then null
          else canonical_player_id
        end
      where id = $1
    `;

    const values = [
      input.legId,
      input.playerName,
      input.marketName,
    ];

    await client.query(sql, values);
  } finally {
    await client.end();
  }
}