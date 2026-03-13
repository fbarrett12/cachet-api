export function detectSportsbook(
  url: string,
): "draftkings" | "fanduel" | "unknown" {
  const normalized = url.toLowerCase();

  if (normalized.includes("draftkings")) return "draftkings";
  if (normalized.includes("fanduel")) return "fanduel";

  return "unknown";
}