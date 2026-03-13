import { importShareLink } from "./endpoints/importShareLink";
import { buildCorsHeaders, json } from "./lib/json";
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

    if (
      request.method === "POST" &&
      url.pathname === "/api/imports/share-link"
    ) {
      return importShareLink(request, env, origin);
    }

    return json({ error: "Not found." }, 404, origin);
  },
};