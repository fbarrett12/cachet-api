import { z } from "zod";
import { ParsedBetSchema } from "./bets";

export const ParserResultSchema = z.object({
  parsedBet: ParsedBetSchema.nullable(),
  parseStatus: z.enum(["pending", "parsed", "failed"]),
  rawPayload: z.unknown().optional(),
  errorMessage: z.string().optional(),
});

export type ParserResult = z.infer<typeof ParserResultSchema>;