import { calendarOptionsFromProcess } from "../../../lib/load-calendar";
import { calendarDataApi, corsOptions } from "../../../lib/quote0-api";

export function GET() {
  return calendarDataApi(calendarOptionsFromProcess());
}

export const OPTIONS = corsOptions;
