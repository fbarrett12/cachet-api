import type { Env } from "../env";
import { createDbClient } from "../db/client";

export type PlayerEnrichmentLegRow = {
  id: string;
  player_name: string;
  league: string;
};

export type CanonicalPlayerRow = {
  id: string;
  display_name: string;
};

export async function listLegsNeedingPlayerEnrichment(
  env: Env,
  input: {
    limit?: number;
  },
): Promise<PlayerEnrichmentLegRow[]> {
  const client = createDbClient(env);
  await client.connect();

  try {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);

    const sql = `
      select
        id,
        player_name,
        league
      from bet_legs
      where player_name is not null
        and league is not null
        and canonical_player_id is null
      order by created_at asc
      limit $1
    `;

    const values = [limit];

    const result =
      await client.query<PlayerEnrichmentLegRow>(sql, values);

    return result.rows;
  } finally {
    await client.end();
  }
}

export async function findPlayersByNameAndLeague(
  env: Env,
  input: {
    playerName: string;
    leagueSlug: string;
  },
): Promise<CanonicalPlayerRow[]> {
  const client = createDbClient(env);
  await client.connect();

  try {
    const sql = `
      select
        p.id,
        p.display_name
      from players p
      join leagues l on l.id = p.league_id
      where lower(trim(p.display_name)) = lower(trim($1))
        and l.slug = $2
    `;

    const values = [
      input.playerName,
      input.leagueSlug,
    ];

    const result =
      await client.query<CanonicalPlayerRow>(sql, values);

    return result.rows;
  } finally {
    await client.end();
  }
}

export async function createCanonicalPlayer(
  env: Env,
  input: {
    displayName: string;
    leagueSlug: string;
  },
): Promise<CanonicalPlayerRow> {
  const client = createDbClient(env);
  await client.connect();

  try {
    const slug = createPlayerSlug(
      input.displayName,
      input.leagueSlug,
    );

    const sql = `
      insert into players (
        league_id,
        display_name,
        slug
      )
      select
        l.id,
        $1,
        $2
      from leagues l
      where l.slug = $3
      on conflict (slug)
      do update set
        display_name = excluded.display_name
      returning
        id,
        display_name
    `;

    const values = [
      input.displayName,
      slug,
      input.leagueSlug,
    ];

    const result =
      await client.query<CanonicalPlayerRow>(sql, values);

    const player = result.rows[0];

    if (!player) {
      throw new Error(
        `Could not create canonical player because league "${input.leagueSlug}" was not found.`,
      );
    }

    return player;
  } finally {
    await client.end();
  }
}

export async function attachCanonicalPlayerToLeg(
  env: Env,
  input: {
    legId: string;
    playerId: string;
  },
): Promise<void> {
  const client = createDbClient(env);
  await client.connect();

  try {
    const sql = `
      update bet_legs
      set canonical_player_id = $2
      where id = $1
    `;

    const values = [
      input.legId,
      input.playerId,
    ];

    await client.query(sql, values);
  } finally {
    await client.end();
  }
}

function createPlayerSlug(
  displayName: string,
  leagueSlug: string,
): string {
  const normalizedName = displayName
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${normalizedName}-${leagueSlug}`;
}