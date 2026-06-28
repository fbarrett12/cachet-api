import { z } from "zod";
import type { AuthUser } from "./jwt";
import type { Env } from "../env";
import { json } from "../lib/json";
import {
  getCurrentUserProfile,
  getGoogleAuthUrl,
  handleGoogleCallback,
  loginWithPassword,
  registerWithPassword,
} from "./service";

const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).optional(),
});

type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type LoginRequest = z.infer<typeof LoginRequestSchema>;

export async function registerController(
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

  try {
    const registerInput: RegisterRequest = parsed.data;

    const result = await registerWithPassword(env, {
        email: registerInput.email,
        password: registerInput.password,
        displayName: registerInput.displayName,
    });

    if (!result.ok) {
      return json({ error: result.error }, result.status, origin);
    }

    return json(
      {
        token: result.token,
        user: result.user,
      },
      result.status,
      origin,
    );
  } catch (error) {
    console.error("Failed to register user", error);

    return json(
      {
        error: "Failed to register user.",
        details: error instanceof Error ? error.message : String(error),
      },
      500,
      origin,
    );
  }
}

export async function loginController(
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

  try {
    const loginInput: LoginRequest = parsed.data;

    const result = await loginWithPassword(env, {
        email: loginInput.email,
        password: loginInput.password,
    });

    if (!result.ok) {
      return json({ error: result.error }, result.status, origin);
    }

    return json(
      {
        token: result.token,
        user: result.user,
      },
      result.status,
      origin,
    );
  } catch (error) {
    console.error("Failed to login user", error);

    return json(
      {
        error: "Failed to login user.",
        details: error instanceof Error ? error.message : String(error),
      },
      500,
      origin,
    );
  }
}

export async function meController(
  _request: Request,
  env: Env,
  origin: string,
  authUser: AuthUser,
): Promise<Response> {
  try {
    const result = await getCurrentUserProfile(env, {
      userId: authUser.id,
    });

    if (!result.ok) {
      return json({ error: result.error }, result.status, origin);
    }

    return json({ user: result.user }, result.status, origin);
  } catch (error) {
    console.error("Failed to fetch current user", error);

    return json(
      {
        error: "Failed to fetch current user.",
        details: error instanceof Error ? error.message : String(error),
      },
      500,
      origin,
    );
  }
}

export async function googleAuthStartController(
  _request: Request,
  env: Env,
): Promise<Response> {
  return Response.redirect(getGoogleAuthUrl(env), 302);
}

export async function googleAuthCallbackController(
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
    const result = await handleGoogleCallback(env, { code });

    if (!result.ok) {
      const redirectUrl = new URL(`${env.FRONTEND_URL}/login`);
      redirectUrl.searchParams.set("error", result.error);

      return Response.redirect(redirectUrl.toString(), 302);
    }

    const redirectUrl = new URL(`${env.FRONTEND_URL}/auth/callback`);
    redirectUrl.searchParams.set("token", result.token);

    return Response.redirect(redirectUrl.toString(), 302);
  } catch (error) {
    console.error("Google OAuth failed", error);

    const redirectUrl = new URL(`${env.FRONTEND_URL}/login`);
    redirectUrl.searchParams.set("error", "google_oauth_failed");

    return Response.redirect(redirectUrl.toString(), 302);
  }
}