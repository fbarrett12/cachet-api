import type { Env } from "../env";
import type { ParsedBet } from "../types/bets";
import { createDbClient } from "./client";

function dollarsToCents(value: number | undefined): number | null {
  if (value == null) return null;
  return Math.round(value * 100);
}

export async function createBetWithLegs(
  env: Env,
  input: {
    userId?: string | null;
    sportsbookSlug: "draftkings" | "fanduel" | "unknown";
    betImportId: string;
    parsedBet: ParsedBet;
  },
): Promise<{ betId: string }> {
  const client = createDbClient(env);

  await client.connect();

  try {
    await client.query("begin");

    const betInsertResult = await client.query<{ id: string }>(
      `
        insert into bets (
          user_id,
          sportsbook_id,
          bet_import_id,
          external_share_id,
          bet_type,
          status,
          placed_at,
          stake_cents,
          payout_cents,
          to_win_cents,
          is_user_confirmed
        )
        values (
          $1,
          (
            select id
            from sportsbooks
            where slug = $2
          ),
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          false
        )
        returning id
      `,
      [
        input.userId ?? null,
        input.sportsbookSlug,
        input.betImportId,
        input.parsedBet.externalBetId ?? null,
        input.parsedBet.betType,
        input.parsedBet.status ?? "pending",
        input.parsedBet.placedAt ?? null,
        dollarsToCents(input.parsedBet.stake),
        dollarsToCents(input.parsedBet.payout),
        dollarsToCents(input.parsedBet.potentialPayout),
      ],
    );

    const betId = betInsertResult.rows[0].id;

    for (const leg of input.parsedBet.legs) {
      await client.query(
        `
          insert into bet_legs (
            bet_id,
            sport,
            league,
            event_name,
            market_type,
            market_subtype,
            selection_type,
            player_name,
            line_value,
            odds_american,
            starts_at
          )
          values (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11
          )
        `,
        [
          betId,
          leg.sport ?? null,
          leg.league ?? null,
          leg.eventName ?? null,
          leg.marketType ?? null,
          leg.marketSubtype ?? null,
          leg.selectionType ?? null,
          leg.playerName ?? null,
          leg.lineValue ?? null,
          leg.oddsAmerican ?? null,
          leg.startsAt ?? null,
        ],
      );
    }

    await client.query("commit");

    return { betId };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}