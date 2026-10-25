import {
  calendarSource,
  MAX_CALENDAR_BYTES,
  parseCalendarDocument,
  periods,
  type CalendarDocument,
} from "./school-calendar.ts";

const URL_CACHE_MS = 60_000;

export type CalendarLoadOptions = {
  url?: string;
  path?: string;
  readFile?: (filePath: string) => Promise<string>;
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

function isTransientFetchError(error: unknown) {
  return error instanceof TypeError
    || (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError"));
}

async function documentFromResponse(response: Response) {
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
  try {
    const response = await fetch(url, {
      redirect: "error",
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      if (response.status >= 500 && urlCache?.key === url.href) return urlCache.document;
      throw new Error(`校历地址返回 HTTP ${response.status}`);
    }
    const document = await documentFromResponse(response);
    urlCache = { key: url.href, expires: now + URL_CACHE_MS, document };
    return document;
  } catch (error) {
    if (urlCache?.key === url.href && isTransientFetchError(error)) return urlCache.document;
    throw error;
  }
}

async function loadPath(filePath: string, readFile: (filePath: string) => Promise<string>) {
  const text = await readFile(filePath);
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
  if (path) {
    if (!options.readFile) throw new Error("当前环境不能读取校历文件");
    return loadPath(path, options.readFile);
  }
  return defaultDocument();
}

export function calendarIsOverridden(options: CalendarLoadOptions = {}) {
  return Boolean(configured(options.url) || configured(options.path));
}
