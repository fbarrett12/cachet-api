import type { Env } from "../env";
import type { ParsedBet } from "../types/bets";
import { createDbClient } from "./client";
import type { NormalizedBet } from "../normalization/types";

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
    normalizedBet: NormalizedBet;
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
        input.normalizedBet.externalBetId ?? null,
        input.normalizedBet.betType,
        input.normalizedBet.status ?? "pending",
        input.normalizedBet.placedAt ?? null,
        dollarsToCents(input.normalizedBet.stake),
        dollarsToCents(input.normalizedBet.payout),
        dollarsToCents(input.normalizedBet.potentialPayout),
      ],
    );

    const betId = betInsertResult.rows[0].id;

    const groups =
      input.normalizedBet.groups?.length
        ? input.normalizedBet.groups
        : [
            {
              groupType: "standalone" as const,
              label: "Ungrouped",
              eventName: undefined,
              legOrder: 0,
              legs: input.normalizedBet.legs,
            },
          ];

    for (const [groupIndex, group] of groups.entries()) {
      const groupInsertResult = await client.query<{ id: string }>(
        `
          insert into bet_leg_groups (
            bet_id,
            group_type,
            label,
            event_name,
            leg_order
          )
          values ($1, $2, $3, $4, $5)
          returning id
        `,
        [
          betId,
          group.groupType,
          group.label ?? null,
          group.eventName ?? null,
          group.legOrder ?? groupIndex,
        ],
      );

      const groupId = groupInsertResult.rows[0].id;

      for (const [legIndex, leg] of group.legs.entries()) {
        await client.query(
          `
            insert into bet_legs (
              bet_id,
              bet_leg_group_id,
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
              starts_at,
              parent_external_id,
              leg_order
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
              $11,
              $12,
              $13,
              $14,
              $15
            )
          `,
          [
            betId,
            groupId,
            leg.sport ?? null,
            leg.league ?? null,
            leg.eventName ?? null,
            leg.marketType ?? null,
            leg.marketName ?? null,
            leg.selection ?? null,
            leg.playerName ?? null,
            leg.line ?? null,
            leg.oddsAmerican ?? null,
            leg.result ?? "pending",
            leg.startsAt ?? null,
            leg.parentExternalId ?? null,
            leg.legOrder ?? legIndex,
          ],
        );
      }
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