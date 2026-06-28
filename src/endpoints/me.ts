import type { Env } from "../env";
import { getCurrentUserFromRequest } from "../auth/requireUser";
import { findUserById } from "../auth/repository";
import { json } from "../lib/json";

export async function meEndpoint(
  request: Request,
  env: Env,
  origin: string,
): Promise<Response> {
  const authUser = await getCurrentUserFromRequest(request, env);

  if (!authUser) {
    return json({ error: "Unauthorized." }, 401, origin);
  }

  const user = await findUserById(env, authUser.id);

  if (!user) {
    return json({ error: "User not found." }, 404, origin);
  }

  return json(
    {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
      },
    },
    200,
    origin,
  );
}