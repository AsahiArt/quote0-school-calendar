import { calendarOptionsFromProcess } from "../../../lib/load-calendar";
import { calendarApi, corsOptions } from "../../../lib/quote0-api";

export function GET(request: Request) {
  return calendarApi(request, calendarOptionsFromProcess());
}

export const OPTIONS = corsOptions;
