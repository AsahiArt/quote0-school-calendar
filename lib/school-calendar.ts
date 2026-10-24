export type SchoolPeriod = {
  id: string;
  name: string;
  eyebrow: string;
  start: string;
  end: string;
  weeks?: number;
  type: "term" | "vacation";
  nextLabel?: string;
};

export type CalendarSnapshot = {
  date: string;
  range: "active" | "upcoming" | "ended";
  timezone: "Asia/Shanghai";
  schoolYear: string;
  phase: {
    id: string;
    name: string;
    type: "term" | "vacation";
    start: string;
    end: string;
    weeks: number | null;
  };
  display: {
    primaryLabel: string;
    primaryValue: number;
    primaryUnit: "天";
    secondaryLabel: string;
    secondaryValue: number;
    elapsedDays: number;
    remainingDays: number;
    progressPercent: number;
    teachingWeek: number | null;
  };
  nextEvent: {
    label: string;
    date: string;
    daysAway: number;
  } | null;
};

const DAY = 86_400_000;

export const periods: SchoolPeriod[] = [
  {
    id: "term-2025-1",
    name: "第一学期",
    eyebrow: "2025 学年",
    start: "2025-09-01",
    end: "2026-01-30",
    weeks: 22,
    type: "term",
  },
  {
    id: "winter-2026",
    name: "寒假",
    eyebrow: "2025 学年",
    start: "2026-01-31",
    end: "2026-03-01",
    type: "vacation",
    nextLabel: "春季开学",
  },
  {
    id: "term-2025-2",
    name: "第二学期",
    eyebrow: "2025 学年",
    start: "2026-03-02",
    end: "2026-06-30",
    weeks: 18,
    type: "term",
  },
  {
    id: "summer-2026",
    name: "暑假",
    eyebrow: "2025 学年",
    start: "2026-07-01",
    end: "2026-08-31",
    type: "vacation",
    nextLabel: "秋季开学",
  },
  {
    id: "term-2026-1",
    name: "第一学期",
    eyebrow: "2026 学年",
    start: "2026-09-01",
    end: "2027-01-22",
    weeks: 21,
    type: "term",
  },
  {
    id: "winter-2027",
    name: "寒假",
    eyebrow: "2026 学年",
    start: "2027-01-23",
    end: "2027-02-21",
    type: "vacation",
    nextLabel: "春季开学",
  },
  {
    id: "term-2026-2",
    name: "第二学期",
    eyebrow: "2026 学年",
    start: "2027-02-22",
    end: "2027-06-30",
    weeks: 19,
    type: "term",
  },
  {
    id: "summer-2027",
    name: "暑假",
    eyebrow: "2026 学年",
    start: "2027-07-01",
    end: "2027-08-31",
    type: "vacation",
  },
];

export function dateFromKey(key: string) {
  return new Date(`${key}T00:00:00+08:00`);
}

export function isDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = dateFromKey(value);
  return !Number.isNaN(parsed.getTime()) && shanghaiDateKey(parsed) === value;
}

export function shanghaiDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function diffDays(from: string, to: string) {
  return Math.round((dateFromKey(to).getTime() - dateFromKey(from).getTime()) / DAY);
}

export function inclusiveDays(from: string, to: string) {
  return diffDays(from, to) + 1;
}

export function formatShortDate(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return `${year}.${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")}`;
}

export function weekdayLabel(key: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    weekday: "long",
  }).format(dateFromKey(key));
}

const SHANGHAI_WEEKDAY_OFFSET: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

const ERROR_CACHE_CONTROL =
  "public, max-age=0, s-maxage=21600, stale-while-revalidate=86400";

function shanghaiWeekdayOffset(key: string) {
  // Midnight +08:00 is the previous UTC date, so Date#getUTCDay() is wrong here.
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    weekday: "short",
  })
    .formatToParts(dateFromKey(key))
    .find((part) => part.type === "weekday")?.value;
  const offset = weekday ? SHANGHAI_WEEKDAY_OFFSET[weekday] : undefined;
  if (offset === undefined) {
    throw new Error(`Unable to resolve Asia/Shanghai weekday for ${key}`);
  }
  return offset;
}

function mondayOnOrBefore(key: string) {
  return shanghaiDateKey(
    new Date(dateFromKey(key).getTime() - shanghaiWeekdayOffset(key) * DAY),
  );
}

function teachingWeekFor(period: SchoolPeriod, today: string) {
  if (period.type !== "term") return null;
  const week =
    Math.floor(diffDays(mondayOnOrBefore(period.start), today) / 7) + 1;
  return Math.min(period.weeks ?? week, week);
}

function secondsUntilNextShanghaiMidnight(now: Date) {
  const nextMidnight = dateFromKey(shanghaiDateKey(new Date(now.getTime() + DAY)));
  return Math.max(0, Math.ceil((nextMidnight.getTime() - now.getTime()) / 1000));
}

export function calendarCacheControl(requestedDate: string, now = new Date()) {
  if (!isDateKey(requestedDate)) return ERROR_CACHE_CONTROL;
  if (requestedDate !== shanghaiDateKey(now)) {
    return "public, max-age=86400, s-maxage=604800";
  }

  const sMaxAge = Math.min(
    3600,
    Math.max(60, secondsUntilNextShanghaiMidnight(now)),
  );
  return `public, max-age=0, s-maxage=${sMaxAge}, stale-while-revalidate=60`;
}

export function findActivePeriod(today: string) {
  return (
    periods.find((period) => today >= period.start && today <= period.end) ??
    periods.find((period) => today < period.start) ??
    periods[periods.length - 1]
  );
}

function phaseOf(period: SchoolPeriod): CalendarSnapshot["phase"] {
  return {
    id: period.id,
    name: period.name,
    type: period.type,
    start: period.start,
    end: period.end,
    weeks: period.weeks ?? null,
  };
}

function periodDays(period: SchoolPeriod, today: string) {
  const totalDays = inclusiveDays(period.start, period.end);
  const elapsedDays = Math.min(
    totalDays,
    Math.max(0, inclusiveDays(period.start, today)),
  );
  const remainingDays = Math.max(0, diffDays(today, period.end));
  return { totalDays, elapsedDays, remainingDays };
}

export function calendarSnapshot(today: string): CalendarSnapshot {
  const current = findActivePeriod(today);
  const range: CalendarSnapshot["range"] =
    today >= current.start && today <= current.end
      ? "active"
      : today < current.start
        ? "upcoming"
        : "ended";
  const { totalDays, elapsedDays, remainingDays } = periodDays(current, today);
  const schoolYear = current.eyebrow.replace(" ", "");
  const phase = phaseOf(current);

  if (range === "upcoming") {
    const previous = periods[periods.indexOf(current) - 1];
    const daysUntilStart = Math.max(0, diffDays(today, current.start));
    return {
      date: today,
      range,
      timezone: "Asia/Shanghai",
      schoolYear,
      phase,
      display: {
        primaryLabel: current.type === "term" ? "距开学" : `距${current.name}`,
        primaryValue: daysUntilStart,
        primaryUnit: "天",
        secondaryLabel: "阶段共",
        secondaryValue: totalDays,
        elapsedDays,
        remainingDays,
        progressPercent: 0,
        teachingWeek: null,
      },
      nextEvent: {
        label: previous?.nextLabel ?? current.name,
        date: current.start,
        daysAway: daysUntilStart,
      },
    };
  }

  if (range === "ended") {
    const daysSinceEnd = Math.max(0, diffDays(current.end, today));
    return {
      date: today,
      range,
      timezone: "Asia/Shanghai",
      schoolYear,
      phase,
      display: {
        primaryLabel: "结束后",
        primaryValue: daysSinceEnd,
        primaryUnit: "天",
        secondaryLabel: "超出收录",
        secondaryValue: daysSinceEnd,
        elapsedDays,
        remainingDays,
        progressPercent: 100,
        teachingWeek: null,
      },
      nextEvent: null,
    };
  }

  const nextPeriod = periods[periods.indexOf(current) + 1] ?? null;
  const primaryValue =
    current.type === "term"
      ? elapsedDays
      : nextPeriod
        ? diffDays(today, nextPeriod.start)
        : remainingDays;
  const primaryLabel =
    current.type === "term"
      ? "开学第"
      : nextPeriod
        ? `距${current.nextLabel ?? "下一阶段"}`
        : "假期还剩";
  const secondaryLabel =
    current.type === "term" ? "距学期结束" : `${current.name}第`;
  const secondaryValue = current.type === "term" ? remainingDays : elapsedDays;

  return {
    date: today,
    range,
    timezone: "Asia/Shanghai",
    schoolYear,
    phase,
    display: {
      primaryLabel,
      primaryValue,
      primaryUnit: "天",
      secondaryLabel,
      secondaryValue,
      elapsedDays,
      remainingDays,
      progressPercent: Math.min(
        100,
        Math.max(0, Math.round((elapsedDays / totalDays) * 100)),
      ),
      teachingWeek: teachingWeekFor(current, today),
    },
    nextEvent: nextPeriod
      ? {
          label: current.nextLabel ?? nextPeriod.name,
          date: nextPeriod.start,
          daysAway: Math.max(0, diffDays(today, nextPeriod.start)),
        }
      : null,
  };
}
