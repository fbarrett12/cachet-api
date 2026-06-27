import { z } from "zod";
import type { Env } from "../env";
import { json } from "../lib/json";
import { createPasswordUser, findUserByEmail } from "../db/users";
import { hashPassword } from "../auth/password";
import { createSessionToken } from "../auth/jwt";

const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).optional(),
});

export async function registerEndpoint(
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

  const parsed = RegisterRequestSchema.safeParse(body);

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

  const existingUser = await findUserByEmail(env, parsed.data.email);

  if (existingUser) {
    return json({ error: "A user with that email already exists." }, 409, origin);
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const user = await createPasswordUser(env, {
    email: parsed.data.email,
    passwordHash,
    displayName: parsed.data.displayName,
  });

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
    201,
    origin,
  );
}