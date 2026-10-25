"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  calendarSnapshot,
  calendarSource,
  canvasDisplay,
  formatShortDate,
  MAX_CALENDAR_BYTES,
  parseCalendarDocument,
  periods,
  weekdayLabel,
  type CalendarDocument,
  type CalendarSnapshot,
  type SchoolPeriod,
} from "../lib/school-calendar";
import { useShanghaiToday } from "./today";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

type SnapshotRange = CalendarSnapshot["range"];

function apiHref(path: string) {
  return `${API_BASE_URL}${path}`;
}

const STORED_CALENDAR_KEY = "quote0-school-calendar";

function schoolYears(calendarPeriods: SchoolPeriod[]) {
  const years: string[] = [];
  for (const period of calendarPeriods) {
    if (!years.includes(period.eyebrow)) years.push(period.eyebrow);
  }
  return years;
}

function inVisibleMonth(date: string, year: number, month: number) {
  const [dateYear, dateMonth] = date.split("-").map(Number);
  return dateYear === year && dateMonth === month;
}

function monthMarkers(year: number, month: number, calendarPeriods: SchoolPeriod[]) {
  const markers: Record<string, string> = {};
  const add = (date: string, label: string) => {
    if (inVisibleMonth(date, year, month) && !markers[date]) markers[date] = label;
  };

  for (const period of calendarPeriods) {
    if (period.type === "term") {
      add(period.start, "开学");
      add(period.end, "结课");
    } else {
      add(period.start, period.name);
    }
  }
  return markers;
}

function rangeStatus(range: SnapshotRange, phaseName: string) {
  if (range === "upcoming") return "尚未开学";
  if (range === "ended") return "校历未收录";
  return `${phaseName}进行中`;
}

function heroNote(
  range: SnapshotRange,
  phase: { name: string; type: "term" | "vacation"; start: string },
  display: { elapsedDays: number; remainingDays: number },
  progress: number,
) {
  if (range === "upcoming") {
    return `${phase.name}尚未开始，开始日期是 ${formatShortDate(phase.start)}。`;
  }
  if (range === "ended") {
    return "当前日期已超出已收录校历，后续安排尚未收录。";
  }
  if (phase.type === "term") {
    return `本学期已进行 ${display.elapsedDays} 天，距离学期结束还有 ${display.remainingDays} 天。`;
  }
  return `${phase.name}第 ${display.elapsedDays} 天，已经走过 ${progress}%。`;
}

function EndpointCard({
  href,
  kicker,
  title,
  code,
  detail,
}: {
  href?: string;
  kicker: string;
  title: string;
  code: string;
  detail: string;
}) {
  const body = (
    <>
      <span>{kicker}</span>
      <strong>{title}</strong>
      <code>{code}</code>
      <small>{detail}</small>
    </>
  );
  if (!href) return <div className="endpoint-card">{body}</div>;
  return (
    <a className="endpoint-card" href={href} target="_blank" rel="noreferrer">
      {body}
    </a>
  );
}

function QuoteScreen({ view }: { view: ReturnType<typeof canvasDisplay> }) {
  return (
    <div
      className="quote-screen"
      role="img"
      aria-label={`Quote/0 布局预览，${view.primaryLabel}${view.primaryValue}天`}
    >
      <div className="qs-head">
        <span>沪上校历 · {view.phase}</span>
        <span>{view.date}</span>
      </div>
      <div className="qs-rule" />
      <div className="qs-body">
        <div className="qs-primary">
          <span>{view.primaryLabel}</span>
          <strong>{view.primaryValue}<small>天</small></strong>
        </div>
        <div className="qs-vrule" />
        <div className="qs-side">
          <span>{view.secondaryLabel}</span>
          <strong>{view.secondaryValue} 天</strong>
          <span>{view.detail}</span>
          <div className="qs-progress">
            <i><span style={{ width: `${view.progress}%` }} /></i>
            <b>{view.progress}%</b>
          </div>
          <span>{view.nextEvent}</span>
        </div>
      </div>
    </div>
  );
}

function periodOn(date: string, calendarPeriods: SchoolPeriod[]) {
  return calendarPeriods.find((period) => date >= period.start && date <= period.end);
}

function Calendar({ todayKey, calendarPeriods }: { todayKey: string; calendarPeriods: SchoolPeriod[] }) {
  const [todayYear, todayMonth, today] = todayKey.split("-").map(Number);
  const [view, setView] = useState<{ year: number; month: number } | null>(null);
  const year = view?.year ?? todayYear;
  const month = view?.month ?? todayMonth;
  const showingToday = year === todayYear && month === todayMonth;
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const leading = (firstWeekday + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cellCount = Math.ceil((leading + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: cellCount }, (_, index) => {
    const day = index - leading + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });
  const markers = monthMarkers(year, month, calendarPeriods);

  function showMonth(delta: number) {
    setView((current) => {
      const baseYear = current?.year ?? todayYear;
      const baseMonth = current?.month ?? todayMonth;
      const next = new Date(Date.UTC(baseYear, baseMonth - 1 + delta, 1));
      return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1 };
    });
  }

  return (
    <section className="calendar-card" aria-labelledby="calendar-title">
      <div className="card-heading">
        <div>
          <p className="section-kicker">MONTH VIEW</p>
          <h2 id="calendar-title">{year} 年 {month} 月</h2>
        </div>
        <button
          type="button"
          className="today-chip"
          onClick={() => setView(null)}
          disabled={showingToday}
        >
          今天 · {today} 日
        </button>
      </div>

      <div className="month-nav" role="group" aria-label="切换月份">
        <button type="button" onClick={() => showMonth(-1)}>上一月</button>
        <button type="button" onClick={() => showMonth(1)}>下一月</button>
      </div>

      <div className="calendar-grid weekday-row" aria-hidden="true">
        {["一", "二", "三", "四", "五", "六", "日"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="calendar-grid days-grid">
        {cells.map((day, index) => {
          const key = day
            ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
            : "";
          const marker = markers[key];
          const period = key ? periodOn(key, calendarPeriods) : undefined;
          return (
            <div
              className={`calendar-day${showingToday && day === today ? " is-today" : ""}${period ? ` is-${period.type}` : ""}${marker ? " has-marker" : ""}`}
              key={`${index}-${day ?? "blank"}`}
            >
              {day && <span>{day}</span>}
              {marker && <small>{marker}</small>}
            </div>
          );
        })}
      </div>
      <div className="calendar-legend">
        <span><i className="is-term" aria-hidden="true" />学期</span>
        <span><i className="is-vacation" aria-hidden="true" />假期</span>
      </div>
    </section>
  );
}

const calendarListeners = new Set<() => void>();
let storedCalendarRaw: string | null | undefined;

function emitStoredCalendar() {
  for (const listener of calendarListeners) listener();
}

function readStoredCalendar() {
  if (storedCalendarRaw === undefined) {
    try {
      storedCalendarRaw = window.localStorage.getItem(STORED_CALENDAR_KEY);
    } catch {
      storedCalendarRaw = null;
    }
  }
  return storedCalendarRaw;
}

function subscribeStoredCalendar(onChange: () => void) {
  calendarListeners.add(onChange);
  return () => {
    calendarListeners.delete(onChange);
  };
}

function writeStoredCalendar(value: string | null) {
  if (value === null) window.localStorage.removeItem(STORED_CALENDAR_KEY);
  else window.localStorage.setItem(STORED_CALENDAR_KEY, value);
  storedCalendarRaw = value;
  emitStoredCalendar();
}

function sameCalendar(
  current: { periods: SchoolPeriod[]; source: CalendarDocument["source"] },
  document: CalendarDocument,
) {
  return JSON.stringify(current.periods) === JSON.stringify(document.periods)
    && JSON.stringify(current.source) === JSON.stringify(document.source);
}

export default function Home() {
  const todayKey = useShanghaiToday();
  const [selectedEyebrow, setSelectedEyebrow] = useState<string | null>(null);
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [sessionDocument, setSessionDocument] = useState<CalendarDocument | null>(null);
  const [remoteDocument, setRemoteDocument] = useState<CalendarDocument | null>(null);
  const [calendarError, setCalendarError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const storedRaw = useSyncExternalStore(subscribeStoredCalendar, readStoredCalendar, () => null);
  const storedDocument = useMemo(() => {
    if (!storedRaw) return null;
    try {
      return parseCalendarDocument(JSON.parse(storedRaw));
    } catch {
      return null;
    }
  }, [storedRaw]);
  const activeDocument = sessionDocument ?? storedDocument ?? remoteDocument;
  const calendar = {
    periods: activeDocument?.periods ?? periods,
    source: activeDocument?.source ?? calendarSource,
    custom: Boolean(sessionDocument || storedDocument),
  };

  useEffect(() => {
    if (!storedRaw || storedDocument) return;
    try {
      writeStoredCalendar(null);
    } catch {
      storedCalendarRaw = null;
      emitStoredCalendar();
    }
  }, [storedRaw, storedDocument]);

  async function replaceCalendar(file: File) {
    if (file.size > MAX_CALENDAR_BYTES) {
      setCalendarError("校历文件过大");
      return;
    }
    try {
      const text = await file.text();
      if (text.length > MAX_CALENDAR_BYTES) {
        setCalendarError("校历文件过大");
        return;
      }
      const document = parseCalendarDocument(JSON.parse(text));
      setSelectedEyebrow(null);
      setSelectedTermId(null);
      try {
        writeStoredCalendar(JSON.stringify(document));
        setSessionDocument(null);
        setCalendarError("");
      } catch {
        setSessionDocument(document);
        setCalendarError("这台浏览器无法保存校历，刷新后会恢复默认。");
      }
    } catch (error) {
      setCalendarError(error instanceof Error ? error.message : "校历文件无效");
    }
  }

  function resetCalendar() {
    try {
      writeStoredCalendar(null);
    } catch {
      // The reload below returns to the built-in calendar either way.
    }
    window.location.reload();
  }

  useEffect(() => {
    if (storedRaw) return;
    const candidates = [
      API_BASE_URL ? `${API_BASE_URL}/api/calendar-data` : "",
      "api/calendar-data",
      "school-calendar.json",
    ].filter(Boolean);
    let cancelled = false;
    (async () => {
      for (const url of candidates) {
        try {
          const response = await fetch(url);
          if (!response.ok) continue;
          const document = parseCalendarDocument(await response.json());
          if (!cancelled) {
            setRemoteDocument((current) => {
              const baseline = current ?? { periods, source: calendarSource };
              return sameCalendar(baseline, document) ? current : document;
            });
          }
          return;
        } catch {
          // Try the next calendar source.
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storedRaw]);

  const snapshot = useMemo(
    () => calendarSnapshot(todayKey, calendar.periods),
    [todayKey, calendar.periods],
  );
  const { display, phase } = snapshot;
  const progress = display.progressPercent;
  const years = schoolYears(calendar.periods);
  const defaultEyebrow =
    calendar.periods.find((period) => period.eyebrow.replace(" ", "") === snapshot.schoolYear)?.eyebrow
    ?? years[0];
  const activeEyebrow = years.includes(selectedEyebrow ?? "") ? selectedEyebrow : defaultEyebrow;
  const yearPeriods = calendar.periods.filter((period) => period.eyebrow === activeEyebrow);
  const yearTerms = yearPeriods.filter((period) => period.type === "term");
  const activeTerm =
    yearTerms.find((term) => term.id === selectedTermId) ?? yearTerms[0];

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="沪上校历首页">
          <span className="brand-mark" aria-hidden="true">沪</span>
          <span>
            <strong>沪上校历</strong>
            <small>SHANGHAI SCHOOL DAYS</small>
          </span>
        </a>
        <div className="header-meta">
          <span className="live-dot" aria-hidden="true" />
          <a href="#install">Quote/0 插件</a>
          <span>·</span>
          上海时间 · 自动更新
        </div>
      </header>

      <div className="page-shell" id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="status-line">
              <span>{snapshot.schoolYear}</span>
              <span className="divider" />
              <span>{rangeStatus(snapshot.range, phase.name)}</span>
            </div>
            <p className="today-line">
              {formatShortDate(todayKey)} · {weekdayLabel(todayKey)}
            </p>
            <h1 id="hero-title">
              {display.primaryLabel}
              <span className="hero-number">{display.primaryValue}</span>
              天
            </h1>
            <p className="hero-note">
              {heroNote(snapshot.range, phase, display, progress)}
            </p>

            <div className="hero-actions">
              <a className="primary-action" href="#install">查看插件安装</a>
              <a
                className="secondary-action"
                href="#content-studio"
              >
                Content Studio 接入
              </a>
            </div>

            <div className="progress-block">
              <div className="progress-labels">
                <span>{formatShortDate(phase.start)}</span>
                <strong>{progress}%</strong>
                <span>{formatShortDate(phase.end)}</span>
              </div>
              <div
                className="progress-track"
                role="progressbar"
                aria-label={`${phase.name}进度`}
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>

          <aside className="ink-panel" aria-label="今日概览">
            <div className="ink-topline">
              <span>QUOTE / SCHOOL</span>
              <span>{todayKey.slice(2, 4)}</span>
            </div>
            <div className="ink-main">
              <span className="ink-label">{display.primaryLabel}</span>
              <strong>{display.primaryValue}</strong>
              <span className="ink-unit">DAYS</span>
            </div>
            <div className="ink-footer">
              <span>{phase.name}</span>
              <span>{progress}% · 上海</span>
            </div>
          </aside>
        </section>

        <section className="stat-strip" aria-label="校历关键数据">
          <div>
            <span>当前阶段</span>
            <strong>{phase.name}</strong>
          </div>
          <div>
            <span>
              {snapshot.range !== "active"
                ? "阶段状态"
                : phase.type === "term"
                  ? "当前教学周"
                  : "假期进度"}
            </span>
            <strong>
              {snapshot.range !== "active"
                ? rangeStatus(snapshot.range, phase.name)
                : phase.type === "term"
                  ? `第 ${display.teachingWeek} 周`
                  : `${progress}%`}
            </strong>
          </div>
          <div>
            <span>
              {snapshot.range === "ended"
                ? "收录截止"
                : snapshot.nextEvent
                  ? "下一节点"
                  : "本阶段结束"}
            </span>
            <strong>
              {formatShortDate(snapshot.nextEvent?.date ?? phase.end)}
            </strong>
          </div>
          <div>
            <span>数据范围</span>
            <strong>上海中小学</strong>
          </div>
        </section>

        <div className="content-grid">
          <Calendar todayKey={todayKey} calendarPeriods={calendar.periods} />

          <section className="term-card" aria-labelledby="term-title">
            <div className="card-heading">
              <div>
                <p className="section-kicker">TERM PLAN</p>
                <h2 id="term-title">{activeEyebrow}</h2>
              </div>
              <span className="official-chip">官方校历</span>
            </div>

            <div className="term-switch" role="tablist" aria-label="选择学年">
              {years.map((eyebrow) => (
                <button
                  key={eyebrow}
                  type="button"
                  role="tab"
                  aria-selected={activeEyebrow === eyebrow}
                  onClick={() => setSelectedEyebrow(eyebrow)}
                >
                  {eyebrow}
                </button>
              ))}
            </div>

            <div className="term-switch" role="tablist" aria-label="选择学期">
              {yearTerms.map((term) => (
                <button
                  key={term.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTerm?.id === term.id}
                  onClick={() => setSelectedTermId(term.id)}
                >
                  {term.name}
                </button>
              ))}
            </div>

            {activeTerm && (
              <div className="term-detail">
                <div className="term-number">
                  <strong>{activeTerm.weeks}</strong>
                  <span>教学周</span>
                </div>
                <div className="term-dates">
                  <div>
                    <span>开学</span>
                    <strong>{formatShortDate(activeTerm.start)}</strong>
                  </div>
                  <i aria-hidden="true" />
                  <div>
                    <span>结束</span>
                    <strong>{formatShortDate(activeTerm.end)}</strong>
                  </div>
                </div>
              </div>
            )}

            <div className="milestones">
              {yearPeriods.map((period) => {
                const label = period.type === "term" ? `${period.name}开学` : `${period.name}开始`;
                const filled = period.start <= todayKey;
                return (
                  <div key={period.id}>
                    <span className={filled ? "milestone-dot is-filled" : "milestone-dot"} />
                    <p><strong>{label}</strong><small>{formatShortDate(period.start)}</small></p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <section className="plugin-section" id="install" aria-labelledby="plugin-title">
          <figure className="quote-preview">
            <div className="quote-bezel">
              <QuoteScreen view={canvasDisplay(snapshot)} />
            </div>
            <figcaption>
              按 Canvas 布局等比预览，296 × 152。官网没有可复用的设备外框；设备字体是 Chill Duan Sans，这里用系统黑体近似。
            </figcaption>
          </figure>
          <div className="plugin-intro">
            <p className="section-kicker">QUOTE/0 PLUGIN</p>
            <h2 id="plugin-title">把开学倒计时，<br />放进 296 × 152。</h2>
            <p>
              沪上校历为 Quote/0 原生墨水屏设计。每天自动计算上海中小学当前所处阶段，以清晰的黑白版式显示开学天数、学期余额、教学周和寒暑假进度。
            </p>
            <div className="plugin-tags" aria-label="插件特性">
              <span>296 × 152</span>
              <span>官方 Canvas API</span>
              <span>结构化布局</span>
              <span>上海时间</span>
            </div>
          </div>

          <div className="install-card">
            <div className="install-heading">
              <span>Canvas 接入与推送</span>
              <small>3 STEPS</small>
            </div>
            <ol>
              <li>
                <span>01</span>
                <p><strong>添加 Canvas API</strong><small>在 Dot. App 的 Content Studio 中，将 Canvas API 加入设备内容。</small></p>
              </li>
              <li>
                <span>02</span>
                <p><strong>安装官方 Dot Skill</strong><small>使用 MindReset 官方设备 skill，并在本机配置 DOT_API_KEY。</small></p>
              </li>
              <li>
                <span>03</span>
                <p><strong>发送校历布局</strong><code>GET /api/quote0/canvas</code></p>
              </li>
            </ol>
            <div className="install-footer">
              <span>设备操作交由 MindReset 官方工具</span>
              <a href="https://github.com/MindReset/dot_skill" target="_blank" rel="noreferrer">查看 Dot Skill ↗</a>
            </div>
          </div>
        </section>

        <section
          className="integration-section"
          id="content-studio"
          aria-labelledby="integration-title"
        >
          <div className="integration-heading">
            <div>
              <p className="section-kicker">CONTENT STUDIO INTEGRATION</p>
              <h2 id="integration-title">官方接入所需接口，已经就绪。</h2>
            </div>
            <span className="review-chip">待官方审核</span>
          </div>
          <p className="integration-lead">
            沪上校历提供无需登录的结构化数据源与 Quote/0 Canvas 原生布局。接口按上海时间自动计算，带官方校历来源、缓存策略和版本字段，可直接用于 Content Studio 接入评审。
          </p>

          <div className="endpoint-grid">
            <EndpointCard
              href={API_BASE_URL ? apiHref("/api/calendar") : undefined}
              kicker="01 · REST DATA"
              title="校历数据 API"
              code="GET /api/calendar"
              detail="当前阶段、倒计时、教学周、进度与下一节点"
            />
            <EndpointCard
              href={API_BASE_URL ? apiHref("/api/quote0/canvas") : undefined}
              kicker="02 · CANVAS"
              title="Quote/0 布局"
              code="GET /api/quote0/canvas"
              detail="原生 windowData、展示数据与点击落地页"
            />
            <EndpointCard
              href="https://dot.mindreset.tech/docs/service/studio/join-content-studio"
              kicker="03 · REVIEW"
              title="Content Studio"
              code="材料包已准备"
              detail="图标、内容说明、接口示例与设备适配信息"
            />
          </div>

          <div className="integration-footer">
            <span><i aria-hidden="true" /> API 可独立部署 · 无需认证 · 缓存至上海零点</span>
            <span>适配 Quote/0 · 296 × 152</span>
          </div>
        </section>

        <section className="source-note">
          <div className="source-icon" aria-hidden="true">校</div>
          <div>
            <strong>校历说明</strong>
            <p>
              {calendar.custom
                ? `正在使用本机校历「${calendar.source.document}」。只影响这个浏览器，不会改变 Quote/0 上的数据。`
                : `日期依据${calendar.source.name}《${calendar.source.document}》。${calendar.source.note}`}
            </p>
            <div className="calendar-replace">
              <button type="button" onClick={() => fileRef.current?.click()}>替换校历</button>
              {calendar.custom && (
                <button type="button" onClick={resetCalendar}>恢复默认</button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void replaceCalendar(file);
                  event.target.value = "";
                }}
              />
              {calendarError && <small>{calendarError}</small>}
            </div>
          </div>
          {calendar.source.url ? (
            <a href={calendar.source.url} target="_blank" rel="noreferrer">
              查看来源 <span aria-hidden="true">↗</span>
            </a>
          ) : <span />}
        </section>
      </div>

      <footer>
        <span>沪上校历 · 简单看见每一天</span>
        <span>更新时间：{formatShortDate(todayKey)}</span>
      </footer>
    </main>
  );
}
