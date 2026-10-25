import { nodeCalendarOptions } from "../../../lib/read-calendar-file";
import { calendarApi, corsOptions } from "../../../lib/quote0-api";

export function GET(request: Request) {
  return calendarApi(request, nodeCalendarOptions());
}

export const OPTIONS = corsOptions;
