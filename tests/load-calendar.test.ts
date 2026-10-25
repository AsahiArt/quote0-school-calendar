import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { loadCalendarDocument } from "../lib/load-calendar.ts";

const document = {
  periods: [
    {
      id: "custom-term",
      name: "春季学期",
      eyebrow: "2028 学年",
      start: "2028-02-01",
      end: "2028-06-30",
      type: "term",
    },
  ],
};

function jsonResponse(status = 200) {
  return new Response(JSON.stringify(document), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("calendar loading", { concurrency: 1 }, () => {
test("a remote calendar is reused when the next fetch fails temporarily", async () => {
  const originalFetch = globalThis.fetch;
  const originalNow = Date.now;
  const startedAt = originalNow();
  let calls = 0;
  try {
    globalThis.fetch = async () => {
      calls += 1;
      if (calls === 1) return jsonResponse();
      return jsonResponse(503);
    };
    const url = "https://example.com/school-calendar-fallback.json";
    const first = await loadCalendarDocument({ url });
    assert.equal(first.periods[0]?.id, "custom-term");
    Date.now = () => startedAt + 120_000;
    const second = await loadCalendarDocument({ url });
    assert.equal(second.periods[0]?.id, "custom-term");
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
    Date.now = originalNow;
  }
});

test("a remote calendar error is kept when the address rejects the request", async () => {
  const originalFetch = globalThis.fetch;
  const originalNow = Date.now;
  const startedAt = originalNow();
  let calls = 0;
  try {
    globalThis.fetch = async () => {
      calls += 1;
      if (calls === 1) return jsonResponse();
      return jsonResponse(404);
    };
    const url = "https://example.com/school-calendar-missing.json";
    await loadCalendarDocument({ url });
    Date.now = () => startedAt + 120_000;
    await assert.rejects(
      () => loadCalendarDocument({ url }),
      /HTTP 404/,
    );
  } finally {
    globalThis.fetch = originalFetch;
    Date.now = originalNow;
  }
});

test("a calendar file is read through the supplied reader", async () => {
  const calendar = await loadCalendarDocument({
    path: "/tmp/school-calendar.json",
    readFile: async () => JSON.stringify(document),
  });
  assert.equal(calendar.periods[0]?.id, "custom-term");
  await assert.rejects(
    () => loadCalendarDocument({ path: "/tmp/school-calendar.json" }),
    /不能读取校历文件/,
  );
});
});
