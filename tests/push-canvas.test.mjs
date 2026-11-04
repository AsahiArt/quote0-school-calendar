import assert from "node:assert/strict";
import test from "node:test";
import { canvasPushBody } from "../scripts/push-canvas.mjs";

const canvas = {
  taskAlias: "沪上校历",
  data: { primaryValue: 1 },
  windowData: { default: [] },
  layoutFull: { tw: "p-[10px]" },
  link: "https://example.com/",
  border: 0,
  meta: { dataEndpoint: "https://example.com/calendar.json" },
};

test("device push keeps the canvas fields and drops local metadata", () => {
  const body = canvasPushBody(canvas, { taskType: "loop", taskKey: "card-1" });
  assert.equal(body.refreshNow, true);
  assert.equal(body.taskType, "loop");
  assert.equal(body.taskKey, "card-1");
  assert.equal(body.data, canvas.data);
  assert.equal(body.meta, undefined);
});

test("fixed content is saved without requesting an immediate refresh", () => {
  const body = canvasPushBody(canvas, { taskType: "fixed" });
  assert.equal(body.refreshNow, false);
  assert.equal(body.taskKey, undefined);
});
