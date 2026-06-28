import type { Env } from "../env";

export type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

export function buildGoogleAuthUrl(env: Env): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", env.GOOGLE_REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "select_account");

  return url.toString();
}

export async function exchangeGoogleCodeForToken(
  env: Env,
  code: string,
): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  const data = (await response.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !data.access_token) {
    throw new Error(
      data.error_description ?? data.error ?? "Google token exchange failed.",
    );
  }

  return data.access_token;
}

export async function fetchGoogleUserInfo(
  accessToken: string,
): Promise<GoogleUserInfo> {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = (await response.json()) as GoogleUserInfo & {
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !data.sub || !data.email) {
    throw new Error(
      data.error_description ?? data.error ?? "Failed to fetch Google user.",
    );
  }

  return data;
}