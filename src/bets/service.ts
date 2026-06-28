import type { Env } from "../env";
import { getBetById, listBets } from "./repository";

export async function listUserBets(
  env: Env,
  input: {
    userId: string;
    limit?: number;
  },
) {
  return listBets(env, input);
}

export async function getUserBetById(
  env: Env,
  input: {
    userId: string;
    betId: string;
  },
) {
  return getBetById(env, input);
}