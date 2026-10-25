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
