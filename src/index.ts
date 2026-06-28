import { importShareLinkController } from "./imports/controller";
import {
  getBetByIdController,
  listBetsController,
} from "./bets/controller";
import { buildCorsHeaders, json } from "./lib/json";
import {
  googleAuthCallbackController,
  googleAuthStartController,
  loginController,
  meController,
  registerController,
} from "./auth/controller";
import { withAuth } from "./auth/withAuth";
import type { Env } from "./env";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("origin") ?? "*";

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: buildCorsHeaders(origin),
      });
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return json(
        {
          ok: true,
          service: "cachet-api",
        },
        200,
        origin,
      );
    }

    if (request.method === "POST" && url.pathname === "/api/auth/register") {
      return registerController(request, env, origin);
    }

    if (request.method === "POST" && url.pathname === "/api/auth/login") {
      return loginController(request, env, origin);
    }

    if (request.method === "GET" && url.pathname === "/api/auth/me") {
      return withAuth(meController)(request, env, origin);
    }

    if (request.method === "GET" && url.pathname === "/api/auth/google/start") {
      return googleAuthStartController(request, env);
    }

    if (request.method === "GET" && url.pathname === "/api/auth/google/callback") {
      return googleAuthCallbackController(request, env, origin);
    }

    if (
      request.method === "POST" &&
      url.pathname === "/api/imports/share-link"
    ) {
      return withAuth(importShareLinkController)(request, env, origin);
    }

    if (request.method === "GET" && url.pathname === "/api/bets") {
      return withAuth(listBetsController)(request, env, origin);
    }

    if (request.method === "GET" && /^\/api\/bets\/[^/]+$/.test(url.pathname)) {
      return withAuth(getBetByIdController)(request, env, origin);
    }

    return json({ error: "Not found." }, 404, origin);
  },
};