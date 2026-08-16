import type { Env } from "../env";
import { createDbClient } from "../db/client";

export type PlayerBettingPerformanceRow = {
  player_id: string;
  player_name: string;
  total_legs: string;
  wins: string;
  losses: string;
};

export async function getPlayerBettingPerformance(
  env: Env,
  input: {
    userId: string;
    playerId: string;
  },
): Promise<PlayerBettingPerformanceRow | null> {
  const client = createDbClient(env);
  await client.connect();

  try {
    const sql = `
      select
        p.id as player_id,
        p.display_name as player_name,
        count(bl.id)::text as total_legs,
        count(*) filter (
          where lower(bl.result) = 'won'
        )::text as wins,
        count(*) filter (
          where lower(bl.result) = 'lost'
        )::text as losses
      from players p
      join bet_legs bl
        on bl.canonical_player_id = p.id
      join bets b
        on b.id = bl.bet_id
      where p.id = $1
        and b.user_id = $2
      group by
        p.id,
        p.display_name
      limit 1
    `;

    const values = [
      input.playerId,
      input.userId,
    ];

    const result =
      await client.query<PlayerBettingPerformanceRow>(sql, values);

    return result.rows[0] ?? null;
  } finally {
    await client.end();
  }
}