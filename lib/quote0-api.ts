import {
  calendarCacheControl,
  calendarSnapshot,
  formatShortDate,
  isDateKey,
  shanghaiDateKey,
} from "./school-calendar";

export const DEFAULT_LANDING_URL =
  "https://asahiart.github.io/quote0-school-calendar/";

const SOURCE_URL =
  "https://edu.sh.gov.cn/xxgk2_zdgz_jcjy_05/20260605/19ca2cb2e10a47fe86047bcc0bfdd0e8.html";

const jsonHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=0, s-maxage=21600, stale-while-revalidate=86400",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};

const noStoreHeaders = {
  ...jsonHeaders,
  "Cache-Control": "no-store",
};

function requestedDate(request: Request) {
  const url = new URL(request.url);
  return url.searchParams.get("date") ?? shanghaiDateKey();
}

function invalidDateResponse(message: string) {
  return Response.json(
    { error: { code: "invalid_date", message } },
    { status: 400, headers: jsonHeaders },
  );
}

export function calendarApi(request: Request) {
  const date = requestedDate(request);

  if (!isDateKey(date)) {
    return invalidDateResponse(
      "date must use YYYY-MM-DD and be a valid calendar date",
    );
  }

  return Response.json(
    {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      region: { code: "CN-SH", name: "上海" },
      audience: "primary_and_secondary_schools",
      ...calendarSnapshot(date),
      source: {
        name: "上海市教育委员会",
        document: "上海市中小学2026学年校历",
        url: SOURCE_URL,
        note: "节假日与个别学校安排可能调整，请以学校最新通知为准。",
      },
    },
    { headers: calendarJsonHeaders(date) },
  );
}

function calendarJsonHeaders(date: string) {
  return {
    ...jsonHeaders,
    "Cache-Control": calendarCacheControl(date),
  };
}

function canvasTemplate() {
  return {
    default: [
      {
        type: "div",
        props: {
          tw: "flex flex-col w-full h-full min-w-0 min-h-0 bg-white text-black gap-[5px]",
          children: [
            {
              type: "div",
              props: {
                tw: "flex flex-row items-center justify-between shrink-0 text-9-chillduansans",
                children: [
                  {
                    type: "span",
                    props: {
                      tw: "font-bold",
                      children:
                        "沪上校历 · {{get inputData \"phase\" default=\"校历\"}}",
                    },
                  },
                  {
                    type: "span",
                    props: {
                      children: "{{get inputData \"date\" default=\"--\"}}",
                    },
                  },
                ],
              },
            },
            {
              type: "div",
              props: { tw: "w-full h-px bg-black shrink-0", children: "" },
            },
            {
              type: "div",
              props: {
                tw: "flex flex-row flex-1 min-h-0 gap-[10px]",
                children: [
                  {
                    type: "div",
                    props: {
                      tw: "flex flex-col flex-[3] min-w-0 justify-center",
                      children: [
                        {
                          type: "span",
                          props: {
                            tw: "text-11-chillduansans font-bold",
                            children:
                              "{{get inputData \"primaryLabel\" default=\"今日\"}}",
                          },
                        },
                        {
                          type: "div",
                          props: {
                            tw: "flex flex-row items-end gap-[4px]",
                            children: [
                              {
                                type: "span",
                                props: {
                                  tw: "text-52-chillduansans font-bold leading-none",
                                  children:
                                    "{{get inputData \"primaryValue\" default=\"--\"}}",
                                },
                              },
                              {
                                type: "span",
                                props: {
                                  tw: "text-11-chillduansans font-bold pb-[4px]",
                                  children: "天",
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                  {
                    type: "div",
                    props: { tw: "w-px h-full bg-black shrink-0", children: "" },
                  },
                  {
                    type: "div",
                    props: {
                      tw: "flex flex-col flex-[2] min-w-0 justify-center gap-[5px]",
                      children: [
                        {
                          type: "span",
                          props: {
                            tw: "text-9-chillduansans",
                            children:
                              "{{get inputData \"secondaryLabel\" default=\"进度\"}}",
                          },
                        },
                        {
                          type: "span",
                          props: {
                            tw: "text-20-chillduansans font-bold leading-none",
                            children:
                              "{{get inputData \"secondaryValue\" default=\"--\"}} 天",
                          },
                        },
                        {
                          type: "span",
                          props: {
                            tw: "text-9-chillduansans",
                            children:
                              "{{get inputData \"detail\" default=\"上海中小学\"}}",
                          },
                        },
                        {
                          type: "div",
                          props: {
                            tw: "flex flex-row items-center gap-[4px]",
                            children: [
                              {
                                type: "div",
                                props: {
                                  tw: "w-[58px] h-[5px] border border-black",
                                  children: "",
                                },
                              },
                              {
                                type: "span",
                                props: {
                                  tw: "text-8-chillduansans font-bold",
                                  children:
                                    "{{get inputData \"progress\" default=\"0\"}}%",
                                },
                              },
                            ],
                          },
                        },
                        {
                          type: "span",
                          props: {
                            tw: "text-8-chillduansans",
                            children:
                              "{{get inputData \"nextEvent\" default=\"\"}}",
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
            {
              type: "div",
              props: {
                tw: "flex flex-row items-center justify-between shrink-0 text-8-chillduansans",
                children: [
                  { type: "span", props: { children: "上海市教委校历" } },
                  { type: "span", props: { children: "QUOTE / SCHOOL" } },
                ],
              },
            },
          ],
        },
      },
    ],
  };
}

type CanvasApiOptions = {
  landingUrl?: string;
  apiBaseUrl?: string;
};

export function canvasApi(request: Request, options: CanvasApiOptions = {}) {
  const date = requestedDate(request);

  if (!isDateKey(date)) {
    return invalidDateResponse("date must use YYYY-MM-DD");
  }

  const landingUrl = (options.landingUrl ?? DEFAULT_LANDING_URL).replace(/\/$/, "");
  const apiBaseUrl = (options.apiBaseUrl ?? landingUrl).replace(/\/$/, "");
  const snapshot = calendarSnapshot(date);
  const detail =
    snapshot.range === "upcoming"
      ? "尚未开学"
      : snapshot.range === "ended"
        ? "校历未收录"
        : snapshot.display.teachingWeek
          ? `第 ${snapshot.display.teachingWeek} 周 · 学期进度`
          : `${snapshot.phase.name}进度`;
  const nextEvent =
    snapshot.range === "ended"
      ? "请更新学年数据"
      : snapshot.nextEvent
        ? `${formatShortDate(snapshot.nextEvent.date).slice(5)} ${snapshot.nextEvent.label}`
        : `${formatShortDate(snapshot.phase.end).slice(5)} 结束`;

  return Response.json(
    {
      refreshNow: false,
      taskAlias: "沪上校历",
      data: {
        date: formatShortDate(snapshot.date),
        phase: snapshot.phase.name,
        primaryLabel: snapshot.display.primaryLabel,
        primaryValue: snapshot.display.primaryValue,
        secondaryLabel: snapshot.display.secondaryLabel,
        secondaryValue: snapshot.display.secondaryValue,
        progress: snapshot.display.progressPercent,
        detail,
        nextEvent,
      },
      windowData: canvasTemplate(),
      layoutFull: { tw: "p-[10px]" },
      link: landingUrl,
      border: 0,
      meta: {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        target: "quote_0_296x152",
        dataEndpoint: `${apiBaseUrl}/api/calendar`,
      },
    },
    { headers: calendarJsonHeaders(date) },
  );
}

export function healthApi() {
  return Response.json(
    {
      ok: true,
      service: "quote0-school-calendar",
      date: shanghaiDateKey(),
      timezone: "Asia/Shanghai",
    },
    { headers: noStoreHeaders },
  );
}

export function corsOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
