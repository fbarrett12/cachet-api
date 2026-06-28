import { importShareLinkController } from "./imports/controller";
import {
  getBetByIdController,
  listBetsController,
} from "./bets/controller";
import { buildCorsHeaders, json } from "./lib/json";
import { registerEndpoint } from "./endpoints/register";
import { loginEndpoint } from "./endpoints/login";
import { meEndpoint } from "./endpoints/me";
import {
  googleAuthCallbackEndpoint,
  googleAuthStartEndpoint,
} from "./endpoints/googleAuth";
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
      return registerEndpoint(request, env, origin);
    }

    if (request.method === "POST" && url.pathname === "/api/auth/login") {
      return loginEndpoint(request, env, origin);
    }

    if (request.method === "GET" && url.pathname === "/api/auth/google/start") {
      return googleAuthStartEndpoint(request, env);
    }

    if (request.method === "GET" && url.pathname === "/api/auth/google/callback") {
      return googleAuthCallbackEndpoint(request, env, origin);
    }

    if (request.method === "GET" && url.pathname === "/api/auth/me") {
      return meEndpoint(request, env, origin);
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