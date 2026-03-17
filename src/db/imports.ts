import type { Env } from "../env";
import { createDbClient } from "./client";

type CreateBetImportInput = {
  sourceUrl: string;
  sportsbookSlug: "draftkings" | "fanduel" | "unknown";
};

export async function createBetImport(
  env: Env,
  input: CreateBetImportInput,
): Promise<{
  id: string;
  sportsbookSlug: string | null;
  parseStatus: string;
}> {
  const client = createDbClient(env);

  await client.connect();

  try {
    const result = await client.query<{
      id: string;
      sportsbook_slug: string | null;
      parse_status: string;
    }>(
      `
        insert into bet_imports (
          sportsbook_id,
          source_type,
          source_url,
          parse_status
        )
        values (
          (
            select id
            from sportsbooks
            where slug = $1
          ),
          $2,
          $3,
          $4
        )
        returning
          id,
          (
            select slug
            from sportsbooks
            where id = bet_imports.sportsbook_id
          ) as sportsbook_slug,
          parse_status
      `,
      [input.sportsbookSlug, "share_link", input.sourceUrl, "pending"],
    );

    const row = result.rows[0];

    return {
      id: row.id,
      sportsbookSlug: row.sportsbook_slug,
      parseStatus: row.parse_status,
    };
  } finally {
    await client.end();
  }
}

export async function updateBetImportAfterParse(
  env: Env,
  input: {
    importId: string;
    rawHtml: string;
    rawPayload?: unknown;
    parseStatus: "pending" | "parsed" | "failed";
    errorMessage?: string;
    parserVersion: string;
  },
): Promise<void> {
  const client = createDbClient(env);

  await client.connect();

  try {
    await client.query(
      `
        update bet_imports
        set
          raw_html = $2,
          raw_payload = $3,
          parse_status = $4,
          error_message = $5,
          parser_version = $6
        where id = $1
      `,
      [
        input.importId,
        input.rawHtml,
        input.rawPayload ? JSON.stringify(input.rawPayload) : null,
        input.parseStatus,
        input.errorMessage ?? null,
        input.parserVersion,
      ],
    );
  } finally {
    await client.end();
  }
}