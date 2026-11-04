import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("GitHub Pages build is static and uses the repository base path", async () => {
  const html = await readFile(
    new URL("../dist/pages/index.html", import.meta.url),
    "utf8",
  );
  assert.match(html, /沪上校历/);
  assert.match(html, /\/quote0-school-calendar\/_next\/static\//);
  assert.doesNotMatch(html, /chatgpt\.site/);
  await access(new URL("../dist/pages/.nojekyll", import.meta.url));
  await access(new URL("../dist/pages/_next/static", import.meta.url));

  const calendar = JSON.parse(
    await readFile(new URL("../dist/pages/calendar.json", import.meta.url), "utf8"),
  );
  const canvas = JSON.parse(
    await readFile(new URL("../dist/pages/canvas.json", import.meta.url), "utf8"),
  );
  assert.equal(calendar.schemaVersion, 1);
  assert.match(calendar.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(canvas.taskAlias, "沪上校历");
  assert.equal(canvas.data.date.replaceAll(".", "-"), calendar.date);
  assert.equal(
    canvas.meta.dataEndpoint,
    "https://asahiart.github.io/quote0-school-calendar/calendar.json",
  );
});

test("standalone Worker bundle is produced", async () => {
  const worker = await readFile(
    new URL("../dist/worker-api/api.js", import.meta.url),
    "utf8",
  );
  assert.match(worker, /quote0-school-calendar/);
  assert.match(worker, /api\/quote0\/canvas/);
  assert.doesNotMatch(worker, /node:fs/);
});

test("Docker target exposes the full application health endpoint", async () => {
  const dockerfile = await readFile(new URL("../Dockerfile", import.meta.url), "utf8");
  assert.match(dockerfile, /FROM node:22-bookworm-slim/);
  assert.match(dockerfile, /VINEXT_PLATFORM=node/);
  assert.match(dockerfile, /\/api\/health/);
  assert.match(dockerfile, /USER node/);
  assert.match(dockerfile, /VINEXT_STANDALONE=1/);
  assert.match(dockerfile, /dist\/standalone/);
  assert.match(dockerfile, /CMD \["node", "server\.js"\]/);
});
