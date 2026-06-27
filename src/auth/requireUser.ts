import type { Env } from "../env";
import { verifySessionToken, type AuthUser } from "./jwt";

export async function getCurrentUserFromRequest(
  request: Request,
  env: Env,
): Promise<AuthUser | null> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice("Bearer ".length);

  return verifySessionToken(env, token);
}