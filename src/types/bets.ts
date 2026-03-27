import { z } from "zod";

export const SportsbookSchema = z.enum(["draftkings", "fanduel", "unknown"]);
export type Sportsbook = z.infer<typeof SportsbookSchema>;

export const BetTypeSchema = z.enum([
  "single",
  "parlay",
  "same_game_parlay",
  "round_robin",
  "unknown",
]);
export type BetType = z.infer<typeof BetTypeSchema>;

export const ParsedBetLegSchema = z.object({
  sport: z.string().optional(),
  league: z.string().optional(),
  eventName: z.string().optional(),
  marketType: z.string().optional(),
  marketSubtype: z.string().optional(),
  selectionType: z.string().optional(),
  playerName: z.string().optional(),
  lineValue: z.number().optional(),
  oddsAmerican: z.number().optional(),
  startsAt: z.string().optional(),
});
export type ParsedBetLeg = z.infer<typeof ParsedBetLegSchema>;

export const ParsedBetSchema = z.object({
  sportsbook: SportsbookSchema,
  betType: BetTypeSchema,
  externalBetId: z.string().optional(),
  status: z.string().optional(),
  placedAt: z.string().optional(),
  settledAt: z.string().optional(),
  stake: z.number().optional(),
  payout: z.number().optional(),
  potentialPayout: z.number().optional(),
  oddsAmerican: z.number().optional(),
  legs: z.array(ParsedBetLegSchema),
});
export type ParsedBet = z.infer<typeof ParsedBetSchema>;

export const ImportShareLinkRequestSchema = z.object({
  url: z.string().url(),
});
export type ImportShareLinkRequest = z.infer<
  typeof ImportShareLinkRequestSchema
>;

export const ImportShareLinkResponseSchema = z.object({
  importId: z.string(),
  betId: z.string().optional(),
  sportsbook: SportsbookSchema,
  status: z.enum(["pending", "parsed", "failed"]),
  parsedBet: ParsedBetSchema.nullable(),
  message: z.string().optional(),
});
export type ImportShareLinkResponse = z.infer<
  typeof ImportShareLinkResponseSchema
>;