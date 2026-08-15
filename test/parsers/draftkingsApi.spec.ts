import { describe, expect, it } from "vitest";
import { decodeBase64Json } from "../../src/parsers/draftkingsApi";

function encodeBase64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);

  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

describe("decodeBase64Json", () => {
  it("preserves UTF-8 characters when decoding DraftKings betJSON", () => {
    const original = {
      playedOddsAmerican: "−115",
      playerName: "A'ja Wilson",
    };

    const encoded = encodeBase64Utf8(JSON.stringify(original));

    const decoded =
      decodeBase64Json<typeof original>(encoded);

    expect(decoded).toEqual(original);
    expect(decoded.playedOddsAmerican).toBe("−115");
  });
});