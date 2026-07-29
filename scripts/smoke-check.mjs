import { readFile } from "node:fs/promises";

const baseUrl = process.argv[2];
if (!baseUrl) throw new Error("usage: node scripts/smoke-check.mjs <base-url>");
const cafes = JSON.parse(await readFile(new URL("../data/cafes.json", import.meta.url), "utf8"));
if (!Array.isArray(cafes) || cafes.length === 0) throw new Error("cafe data is empty");
const requests = [new URL("/", baseUrl), new URL(`/cafes/${encodeURIComponent(cafes[0].id)}`, baseUrl)];

for (const url of requests) {
  let response;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      response = await fetch(url, { redirect: "follow" });
      if (response.ok) break;
    } catch {
      // The local production server can still be starting up.
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  if (!response?.ok) throw new Error(`${url} returned ${response?.status ?? "no response"}`);
  const html = await response.text();
  if (!html.includes(cafes[0].name)) throw new Error(`${url} did not render cafe data`);
  console.log(`OK ${response.status} ${url}`);
}
