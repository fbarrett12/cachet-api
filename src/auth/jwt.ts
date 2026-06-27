import { SignJWT, jwtVerify } from "jose";
import type { Env } from "../env";

const encoder = new TextEncoder();

export type AuthUser = {
  id: string;
  email: string;
};

export async function createSessionToken(
  env: Env,
  user: AuthUser,
): Promise<string> {
  return new SignJWT({
    email: user.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encoder.encode(env.JWT_SECRET));
}

export async function verifySessionToken(
  env: Env,
  token: string,
): Promise<AuthUser | null> {
  try {
    const result = await jwtVerify(token, encoder.encode(env.JWT_SECRET));

    const userId = result.payload.sub;
    const email = result.payload.email;

    if (!userId || typeof email !== "string") return null;

    return {
      id: userId,
      email,
    };
  } catch {
    return null;
  }
}