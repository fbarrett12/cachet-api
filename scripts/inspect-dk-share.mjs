import { chromium } from "playwright";

const shareUrl =
  "https://sportsbook.draftkings.com/social/post/27682e19-cd5b-4671-ae22-13c173612895?slipAdd";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
});

page.on("request", async (request) => {
  const url = request.url();

  if (!url.includes("api.draftkings.com/comments/feed/post/details.json")) {
    return;
  }

  console.log("\n=== MATCHED REQUEST ===");
  console.log("METHOD:", request.method());
  console.log("URL:", url);
  console.log("HEADERS:", JSON.stringify(request.headers(), null, 2));

  const postData = request.postData();
  if (postData) {
    console.log("POST DATA:", postData);
  } else {
    console.log("POST DATA: <none>");
  }
});

page.on("response", async (response) => {
  const url = response.url();

  if (!url.includes("api.draftkings.com/comments/feed/post/details.json")) {
    return;
  }

  console.log("\n=== MATCHED RESPONSE ===");
  console.log("STATUS:", response.status());
  console.log("URL:", url);

  try {
    const text = await response.text();
    console.log("BODY PREVIEW:");
    console.log(text.slice(0, 4000));
  } catch {
    console.log("BODY PREVIEW: <unavailable>");
  }
});

await page.goto(shareUrl, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(5000);
await browser.close();