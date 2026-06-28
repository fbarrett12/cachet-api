import type { Env } from "../env";
import { json } from "../lib/json";
import { getCurrentUserFromRequest } from "./requireUser";
import type { AuthUser } from "./jwt";

export type AuthenticatedHandler = (
  request: Request,
  env: Env,
  origin: string,
  user: AuthUser,
) => Promise<Response>;

export function withAuth(handler: AuthenticatedHandler) {
  return async (
    request: Request,
    env: Env,
    origin: string,
  ): Promise<Response> => {
    const user = await getCurrentUserFromRequest(request, env);

    if (!user) {
      return json({ error: "Unauthorized." }, 401, origin);
    }

    return handler(request, env, origin, user);
  };
}