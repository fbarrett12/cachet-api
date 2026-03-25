import { chromium } from "playwright";

const shareUrl =
  "https://sportsbook.draftkings.com/social/post/27682e19-cd5b-4671-ae22-13c173612895?slipAdd";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
});

page.on("request", (request) => {
  const url = request.url();
  if (
    /social|post|betslip|offer|outcome|eventgroup|selection|graphql|api/i.test(
      url,
    )
  ) {
    console.log("\n[REQUEST]", request.method(), url);
  }
});

page.on("response", async (response) => {
  const url = response.url();

  if (
    /social|post|betslip|offer|outcome|eventgroup|selection|graphql|api/i.test(
      url,
    )
  ) {
    console.log("\n[RESPONSE]", response.status(), url);

    const contentType = response.headers()["content-type"] || "";
    if (contentType.includes("application/json")) {
      try {
        const json = await response.json();
        console.log(
          JSON.stringify(json, null, 2).slice(0, 4000)
        );
      } catch {
        console.log("[json parse failed]");
      }
    }
  }
});

await page.goto(shareUrl, { waitUntil: "networkidle", timeout: 60000 });

console.log("\nFinal URL:", page.url());
console.log("Page title:", await page.title());

await page.waitForTimeout(5000);
await browser.close();