import { nodeCalendarOptions } from "../../../lib/read-calendar-file";
import { calendarDataApi, corsOptions } from "../../../lib/quote0-api";

export function GET() {
  return calendarDataApi(nodeCalendarOptions());
}

export const OPTIONS = corsOptions;
