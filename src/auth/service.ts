import type { Env } from "../env";
import {
  attachGoogleToExistingUser,
  createGoogleUser,
  createPasswordUser,
  findUserByEmail,
  findUserByGoogleSub,
  findUserById,
} from "./repository";
import {
  buildGoogleAuthUrl,
  exchangeGoogleCodeForToken,
  fetchGoogleUserInfo,
} from "./google";
import { createSessionToken } from "./jwt";
import { hashPassword, verifyPassword } from "./password";

export async function registerWithPassword(
  env: Env,
  input: {
    email: string;
    password: string;
    displayName?: string;
  },
) {
  const existingUser = await findUserByEmail(env, input.email);

  if (existingUser) {
    return {
      ok: false as const,
      status: 409,
      error: "A user with that email already exists.",
    };
  }

  const passwordHash = await hashPassword(input.password);

  const user = await createPasswordUser(env, {
    email: input.email,
    passwordHash,
    displayName: input.displayName,
  });

  const token = await createSessionToken(env, {
    id: user.id,
    email: user.email,
  });

  return {
    ok: true as const,
    status: 201,
    token,
    user: serializeUser(user),
  };
}

export async function loginWithPassword(
  env: Env,
  input: {
    email: string;
    password: string;
  },
) {
  const user = await findUserByEmail(env, input.email);

  if (!user || !user.password_hash) {
    return {
      ok: false as const,
      status: 401,
      error: "Invalid email or password.",
    };
  }

  const isValidPassword = await verifyPassword(input.password, user.password_hash);

  if (!isValidPassword) {
    return {
      ok: false as const,
      status: 401,
      error: "Invalid email or password.",
    };
  }

  const token = await createSessionToken(env, {
    id: user.id,
    email: user.email,
  });

  return {
    ok: true as const,
    status: 200,
    token,
    user: serializeUser(user),
  };
}

export async function getCurrentUserProfile(
  env: Env,
  input: {
    userId: string;
  },
) {
  const user = await findUserById(env, input.userId);

  if (!user) {
    return {
      ok: false as const,
      status: 404,
      error: "User not found.",
    };
  }

  return {
    ok: true as const,
    status: 200,
    user: serializeUser(user),
  };
}

export function getGoogleAuthUrl(env: Env): string {
  return buildGoogleAuthUrl(env);
}

export async function handleGoogleCallback(
  env: Env,
  input: {
    code: string;
  },
) {
  const accessToken = await exchangeGoogleCodeForToken(env, input.code);
  const googleUser = await fetchGoogleUserInfo(accessToken);

  if (googleUser.email_verified === false) {
    return {
      ok: false as const,
      status: 401,
      error: "Google email is not verified.",
    };
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

  return {
    ok: true as const,
    status: 200,
    token,
    user: serializeUser(user),
  };
}

function serializeUser(user: {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
  };
}