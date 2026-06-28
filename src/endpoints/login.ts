import { z } from "zod";
import type { Env } from "../env";
import { json } from "../lib/json";
import { findUserByEmail } from "../auth/repository";
import { verifyPassword } from "../auth/password";
import { createSessionToken } from "../auth/jwt";

const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function loginEndpoint(
  request: Request,
  env: Env,
  origin: string,
): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400, origin);
  }

  const parsed = LoginRequestSchema.safeParse(body);

  if (!parsed.success) {
    return json(
      {
        error: "Invalid payload.",
        issues: parsed.error.issues,
      },
      400,
      origin,
    );
  }

  const user = await findUserByEmail(env, parsed.data.email);

  if (!user || !user.password_hash) {
    return json({ error: "Invalid email or password." }, 401, origin);
  }

  const isValidPassword = await verifyPassword(
    parsed.data.password,
    user.password_hash,
  );

  if (!isValidPassword) {
    return json({ error: "Invalid email or password." }, 401, origin);
  }

  const token = await createSessionToken(env, {
    id: user.id,
    email: user.email,
  });

  return json(
    {
      token,
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