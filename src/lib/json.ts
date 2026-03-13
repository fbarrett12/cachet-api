export function buildCorsHeaders(origin: string = "*"): HeadersInit {
  return {
    "content-type": "application/json",
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
  };
}

export function json(
  data: unknown,
  status = 200,
  origin: string = "*",
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: buildCorsHeaders(origin),
  });
}