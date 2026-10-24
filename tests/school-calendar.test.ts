import assert from "node:assert/strict";
import test from "node:test";

import {
  calendarCacheControl,
  calendarSnapshot,
  dateFromKey,
  parseCalendarDocument,
} from "../lib/school-calendar.ts";

test("teaching weeks run Monday-Sunday from the Monday on or before term start", () => {
  assert.equal(calendarSnapshot("2026-09-01").display.teachingWeek, 1);
  assert.equal(calendarSnapshot("2026-09-06").display.teachingWeek, 1);
  assert.equal(calendarSnapshot("2026-09-07").display.teachingWeek, 2);

  const termEnd = calendarSnapshot("2027-01-22");
  assert.equal(termEnd.range, "active");
  assert.equal(termEnd.phase.id, "term-2026-1");
  assert.equal(termEnd.display.teachingWeek, 21);
});

test("2026-08-13 summer snapshot stays a countdown to the autumn term", () => {
  const snapshot = calendarSnapshot("2026-08-13");
  assert.equal(snapshot.range, "active");
  assert.equal(snapshot.phase.id, "summer-2026");
  assert.equal(snapshot.display.primaryValue, 19);
  assert.equal(snapshot.display.teachingWeek, null);
  assert.equal(snapshot.nextEvent?.date, "2026-09-01");
  assert.equal(snapshot.nextEvent?.label, "秋季开学");
});

test("dates before the first period are upcoming instead of day zero", () => {
  const snapshot = calendarSnapshot("2025-08-31");
  assert.equal(snapshot.range, "upcoming");
  assert.equal(snapshot.phase.id, "term-2025-1");
  assert.equal(snapshot.schoolYear, "2025学年");
  assert.equal(snapshot.display.primaryLabel, "距开学");
  assert.equal(snapshot.display.primaryValue, 1);
  assert.equal(snapshot.display.secondaryLabel, "阶段共");
  assert.equal(snapshot.display.secondaryValue, 152);
  assert.equal(snapshot.display.progressPercent, 0);
  assert.equal(snapshot.display.teachingWeek, null);
  assert.equal(snapshot.nextEvent?.date, "2025-09-01");
  assert.equal(snapshot.nextEvent?.daysAway, 1);
  assert.equal(snapshot.nextEvent?.label, "第一学期");
});

test("dates after the last period are ended and do not stay on vacation", () => {
  const snapshot = calendarSnapshot("2027-09-01");
  assert.equal(snapshot.range, "ended");
  assert.equal(snapshot.phase.id, "summer-2027");
  assert.equal(snapshot.schoolYear, "2026学年");
  assert.equal(snapshot.display.primaryLabel, "结束后");
  assert.equal(snapshot.display.primaryValue, 1);
  assert.notEqual(snapshot.display.primaryLabel, "假期还剩");
  assert.equal(snapshot.display.secondaryLabel, "超出收录");
  assert.equal(snapshot.display.secondaryValue, 1);
  assert.equal(snapshot.display.progressPercent, 100);
  assert.equal(snapshot.display.teachingWeek, null);
  assert.equal(snapshot.nextEvent, null);
});

test("a replacement calendar is parsed and used without the built-in periods", () => {
  const document = parseCalendarDocument({
    periods: [
      {
        id: "custom-term",
        name: "春季学期",
        eyebrow: "2028 学年",
        start: "2028-02-01",
        end: "2028-06-30",
        weeks: 20,
        type: "term",
      },
    ],
  });
  const snapshot = calendarSnapshot("2028-02-01", document.periods);
  assert.equal(snapshot.range, "active");
  assert.equal(snapshot.phase.id, "custom-term");
  assert.equal(snapshot.display.primaryLabel, "开学第");
  assert.equal(snapshot.display.primaryValue, 1);
  assert.throws(() => parseCalendarDocument({ periods: [] }), (error: unknown) => {
    assert.equal(error instanceof Error, true);
    assert.equal((error as Error).message, "校历文件至少要有一个阶段");
    return true;
  });
});

test("calendarCacheControl keeps other dates long and today until Shanghai midnight", () => {
  const now = dateFromKey("2026-08-13");
  assert.equal(
    calendarCacheControl("2026-01-01", now),
    "public, max-age=86400, s-maxage=604800",
  );
  assert.equal(
    calendarCacheControl("2026-08-13", now),
    "public, max-age=0, s-maxage=3600, stale-while-revalidate=60",
  );

  const midnight = dateFromKey("2026-08-14");
  assert.equal(
    calendarCacheControl("2026-08-13", new Date(midnight.getTime() - 30_000)),
    "public, max-age=0, s-maxage=60, stale-while-revalidate=60",
  );
  assert.equal(
    calendarCacheControl("2026-08-13", new Date(midnight.getTime() - 120_000)),
    "public, max-age=0, s-maxage=120, stale-while-revalidate=60",
  );
  assert.equal(
    calendarCacheControl("not-a-date", now),
    "public, max-age=0, s-maxage=21600, stale-while-revalidate=86400",
  );
});
