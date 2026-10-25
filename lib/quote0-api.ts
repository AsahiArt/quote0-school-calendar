import {
  calendarIsOverridden,
  loadCalendarDocument,
  type CalendarLoadOptions,
} from "./load-calendar";
import {
  calendarCacheControl,
  calendarSnapshot,
  canvasDisplay,
  isDateKey,
  shanghaiDateKey,
} from "./school-calendar";

export const DEFAULT_LANDING_URL =
  "https://asahiart.github.io/quote0-school-calendar/";

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

const calendarDataHeaders = {
  ...jsonHeaders,
  "Cache-Control": "public, max-age=3600, s-maxage=86400",
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

function calendarError(error: unknown) {
  const message = error instanceof Error ? error.message : "校历文件无效";
  return Response.json(
    { error: { code: "invalid_calendar", message } },
    { status: 500, headers: noStoreHeaders },
  );
}

async function calendarFor(options: CalendarLoadOptions) {
  return loadCalendarDocument(options);
}

export async function calendarDataApi(options: CalendarLoadOptions = {}) {
  try {
    return Response.json(await calendarFor(options), {
      headers: calendarIsOverridden(options) ? noStoreHeaders : calendarDataHeaders,
    });
  } catch (error) {
    return calendarError(error);
  }
}

export async function calendarApi(request: Request, options: CalendarLoadOptions = {}) {
  const date = requestedDate(request);

  if (!isDateKey(date)) {
    return invalidDateResponse(
      "date must use YYYY-MM-DD and be a valid calendar date",
    );
  }

  try {
    const calendar = await calendarFor(options);
    return Response.json(
      {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        region: { code: "CN-SH", name: "上海" },
        audience: "primary_and_secondary_schools",
        ...calendarSnapshot(date, calendar.periods),
        source: calendar.source,
      },
      {
        headers: calendarIsOverridden(options) ? noStoreHeaders : calendarJsonHeaders(date),
      },
    );
  } catch (error) {
    return calendarError(error);
  }
}

function calendarJsonHeaders(date: string) {
  return {
    ...jsonHeaders,
    "Cache-Control": calendarCacheControl(date),
  };
}

function progressFillWidth(progress: number) {
  const innerWidth = 70;
  return Math.max(0, Math.min(innerWidth, Math.round((innerWidth * progress) / 100)));
}

function canvasTemplate(progress: number) {
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
                tw: "flex flex-row items-center justify-between shrink-0 text-12-chillduansans font-bold",
                children: [
                  {
                    type: "span",
                    props: {
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
                            tw: "text-14-chillduansans font-bold",
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
                                  tw: "text-14-chillduansans font-bold pb-[6px]",
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
                      tw: "flex flex-col flex-[2] min-w-0 justify-center gap-[4px]",
                      children: [
                        {
                          type: "span",
                          props: {
                            tw: "text-12-chillduansans font-bold",
                            children:
                              "{{get inputData \"secondaryLabel\" default=\"进度\"}}",
                          },
                        },
                        {
                          type: "span",
                          props: {
                            tw: "text-24-chillduansans font-bold leading-none",
                            children:
                              "{{get inputData \"secondaryValue\" default=\"--\"}} 天",
                          },
                        },
                        {
                          type: "span",
                          props: {
                            tw: "text-12-chillduansans font-bold",
                            children:
                              "{{get inputData \"detail\" default=\"上海中小学\"}}",
                          },
                        },
                        {
                          type: "div",
                          props: {
                            tw: "flex flex-row items-center gap-[6px]",
                            children: [
                              {
                                type: "div",
                                props: {
                                  tw: "w-[72px] h-[8px] border border-black box-border overflow-hidden",
                                  children: {
                                    type: "div",
                                    props: {
                                      tw: `h-full bg-black w-[${progressFillWidth(progress)}px]`,
                                      children: "",
                                    },
                                  },
                                },
                              },
                              {
                                type: "span",
                                props: {
                                  tw: "text-12-chillduansans font-bold",
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
                            tw: "text-12-chillduansans font-bold",
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
          ],
        },
      },
    ],
  };
}

type CanvasApiOptions = CalendarLoadOptions & {
  landingUrl?: string;
  apiBaseUrl?: string;
};

export async function canvasApi(request: Request, options: CanvasApiOptions = {}) {
  const date = requestedDate(request);

  if (!isDateKey(date)) {
    return invalidDateResponse("date must use YYYY-MM-DD");
  }

  const landingUrl = (options.landingUrl ?? DEFAULT_LANDING_URL).replace(/\/$/, "");
  const apiBaseUrl = (options.apiBaseUrl ?? landingUrl).replace(/\/$/, "");
  let snapshot;
  try {
    const calendar = await calendarFor(options);
    snapshot = calendarSnapshot(date, calendar.periods);
  } catch (error) {
    return calendarError(error);
  }
  const view = canvasDisplay(snapshot);

  return Response.json(
    {
      refreshNow: false,
      taskAlias: "沪上校历",
      data: view,
      windowData: canvasTemplate(view.progress),
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
    {
      headers: calendarIsOverridden(options) ? noStoreHeaders : calendarJsonHeaders(date),
    },
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
