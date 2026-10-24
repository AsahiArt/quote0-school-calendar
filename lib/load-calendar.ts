import {
  calendarSource,
  parseCalendarDocument,
  periods,
  type CalendarDocument,
} from "./school-calendar";

const MAX_CALENDAR_BYTES = 256_000;
const URL_CACHE_MS = 60_000;

export type CalendarLoadOptions = {
  url?: string;
  path?: string;
};

type UrlCache = {
  key: string;
  expires: number;
  document: CalendarDocument;
};

let urlCache: UrlCache | null = null;

function configured(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function defaultDocument(): CalendarDocument {
  return {
    timezone: "Asia/Shanghai",
    source: calendarSource,
    periods,
  };
}

function calendarUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("CALENDAR_URL 不是合法地址");
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol === "https:" || (url.protocol === "http:" && local)) return url;
  throw new Error("CALENDAR_URL 只接受 https，或本机 http");
}

async function documentFromResponse(response: Response) {
  if (!response.ok) throw new Error(`校历地址返回 HTTP ${response.status}`);
  const bytes = Number(response.headers.get("content-length") ?? 0);
  if (bytes > MAX_CALENDAR_BYTES) throw new Error("校历文件过大");
  const text = await response.text();
  if (text.length > MAX_CALENDAR_BYTES) throw new Error("校历文件过大");
  return parseCalendarDocument(JSON.parse(text));
}

async function loadUrl(value: string) {
  const url = calendarUrl(value);
  const now = Date.now();
  if (urlCache?.key === url.href && urlCache.expires > now) return urlCache.document;
  const response = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(5_000),
  });
  const document = await documentFromResponse(response);
  urlCache = { key: url.href, expires: now + URL_CACHE_MS, document };
  return document;
}

async function loadPath(filePath: string) {
  const { readFile } = await import("node:fs/promises");
  const text = await readFile(filePath, "utf8");
  if (text.length > MAX_CALENDAR_BYTES) throw new Error("校历文件过大");
  return parseCalendarDocument(JSON.parse(text));
}

export function calendarOptionsFromProcess(): CalendarLoadOptions {
  return {
    url: configured(process.env.CALENDAR_URL),
    path: configured(process.env.CALENDAR_PATH),
  };
}

export async function loadCalendarDocument(options: CalendarLoadOptions = {}) {
  const url = configured(options.url);
  const path = configured(options.path);
  if (url) return loadUrl(url);
  if (path) return loadPath(path);
  return defaultDocument();
}

export function calendarIsOverridden(options: CalendarLoadOptions = {}) {
  return Boolean(configured(options.url) || configured(options.path));
}
