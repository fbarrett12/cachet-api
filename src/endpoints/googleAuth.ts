import {
  attachGoogleToExistingUser,
  createGoogleUser,
  findUserByEmail,
  findUserByGoogleSub,
} from "../auth/repository";
import type { Env } from "../env";
import {
  buildGoogleAuthUrl,
  exchangeGoogleCodeForToken,
  fetchGoogleUserInfo,
} from "../auth/google";
import { createSessionToken } from "../auth/jwt";
import { json } from "../lib/json";

export async function googleAuthStartEndpoint(
  _request: Request,
  env: Env,
): Promise<Response> {
  return Response.redirect(buildGoogleAuthUrl(env), 302);
}

export async function googleAuthCallbackEndpoint(
  request: Request,
  env: Env,
  origin: string,
): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return json({ error: "Missing Google authorization code." }, 400, origin);
  }

  try {
    const accessToken = await exchangeGoogleCodeForToken(env, code);
    const googleUser = await fetchGoogleUserInfo(accessToken);

    if (googleUser.email_verified === false) {
      return json({ error: "Google email is not verified." }, 401, origin);
    }

    let user = await findUserByGoogleSub(env, googleUser.sub);

    if (!user) {
      const existingEmailUser = await findUserByEmail(env, googleUser.email);

      user = existingEmailUser
        ? await attachGoogleToExistingUser(env, {
            userId: existingEmailUser.id,
            googleSub: googleUser.sub,
            displayName: googleUser.name,
            avatarUrl: googleUser.picture,
          })
        : await createGoogleUser(env, {
            email: googleUser.email,
            googleSub: googleUser.sub,
            displayName: googleUser.name,
            avatarUrl: googleUser.picture,
          });
    }

    const token = await createSessionToken(env, {
      id: user.id,
      email: user.email,
    });

    const redirectUrl = new URL(`${env.FRONTEND_URL}/auth/callback`);
    redirectUrl.searchParams.set("token", token);

    return Response.redirect(redirectUrl.toString(), 302);
  } catch (error) {
    console.error("Google OAuth failed", error);

    const redirectUrl = new URL(`${env.FRONTEND_URL}/login`);
    redirectUrl.searchParams.set("error", "google_oauth_failed");

    return Response.redirect(redirectUrl.toString(), 302);
  }
}