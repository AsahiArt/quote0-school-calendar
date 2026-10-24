import {
  calendarApi,
  calendarDataApi,
  canvasApi,
  corsOptions,
  healthApi,
} from "../lib/quote0-api";

interface Env {
  LANDING_URL?: string;
  CALENDAR_URL?: string;
}

const notFoundHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};

export default {
  fetch(request: Request, env: Env): Response | Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return corsOptions();
    if (request.method !== "GET") {
      return Response.json(
        { error: { code: "method_not_allowed", message: "GET only" } },
        { status: 405, headers: notFoundHeaders },
      );
    }

    if (url.pathname === "/" || url.pathname === "/api/health") {
      return healthApi();
    }
    const calendar = { url: env.CALENDAR_URL };
    if (url.pathname === "/api/calendar-data") {
      return calendarDataApi(calendar);
    }
    if (url.pathname === "/api/calendar") {
      return calendarApi(request, calendar);
    }
    if (url.pathname === "/api/quote0/canvas") {
      return canvasApi(request, {
        ...calendar,
        landingUrl:
          env.LANDING_URL ??
          "https://asahiart.github.io/quote0-school-calendar/",
        apiBaseUrl: url.origin,
      });
    }

    return Response.json(
      { error: { code: "not_found", message: "Route not found" } },
      { status: 404, headers: notFoundHeaders },
    );
  },
};
