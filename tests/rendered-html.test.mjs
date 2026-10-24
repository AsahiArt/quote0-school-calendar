import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function request(path = "/", accept = "text/html") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: handler } = await import(workerUrl.href);

  return handler(
    new Request(`http://localhost${path}`, { headers: { accept } }),
  );
}

test("server-renders the school calendar landing page", async () => {
  const response = await request();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>沪上校历｜Quote\/0 上海中小学校历插件<\/title>/);
  assert.match(html, /官方接入所需接口，已经就绪/);
  assert.match(html, /待官方审核/);
  assert.doesNotMatch(html, /href="\/api\/calendar"/);
  assert.doesNotMatch(html, /href="\/api\/quote0\/canvas"/);
  assert.match(html, /GET \/api\/calendar/);
  assert.match(html, /GET \/api\/quote0\/canvas/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("calendar API returns a stable Shanghai school-calendar snapshot", async () => {
  const response = await request("/api/calendar?date=2026-08-13", "application/json");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  assert.match(response.headers.get("cache-control") ?? "", /s-maxage=\d+/);
  assert.doesNotMatch(response.headers.get("cache-control") ?? "", /s-maxage=21600/);

  const body = await response.json();
  assert.equal(body.schemaVersion, 1);
  assert.equal(body.region.code, "CN-SH");
  assert.equal(body.date, "2026-08-13");
  assert.equal(body.phase.id, "summer-2026");
  assert.equal(body.display.primaryValue, 19);
  assert.equal(body.nextEvent.date, "2026-09-01");
  assert.match(body.source.url, /^https:\/\/edu\.sh\.gov\.cn\//);
});

test("Canvas endpoint exposes Quote/0 layout data", async () => {
  const response = await request("/api/quote0/canvas?date=2026-08-13", "application/json");
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.taskAlias, "沪上校历");
  assert.equal(body.data.primaryValue, 19);
  assert.ok(Array.isArray(body.windowData.default));
  assert.equal(body.meta.target, "quote_0_296x152");
  assert.match(body.link, /^https:\/\//);
});

test("calendar API rejects impossible dates", async () => {
  const response = await request("/api/calendar?date=2026-02-30", "application/json");
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error.code, "invalid_date");
});

test("calendar data endpoint returns the replaceable document", async () => {
  const response = await request("/api/calendar-data", "application/json");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  const body = await response.json();
  assert.equal(body.timezone, "Asia/Shanghai");
  assert.equal(body.periods[0].id, "term-2025-1");
});

test("health endpoint reports a stateless service", async () => {
  const response = await request("/api/health", "application/json");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.service, "quote0-school-calendar");
  assert.equal(body.timezone, "Asia/Shanghai");
});

test("Content Studio icon is a transparent 100 by 100 PNG", async () => {
  const png = await readFile(new URL("../public/content-studio-icon.png", import.meta.url));
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png.readUInt32BE(16), 100);
  assert.equal(png.readUInt32BE(20), 100);
  assert.equal(png[25], 6, "PNG color type 6 carries an alpha channel");
});
