import { calendarOptionsFromProcess } from "../../../../lib/load-calendar";
import {
  canvasApi,
  corsOptions,
  DEFAULT_LANDING_URL,
} from "../../../../lib/quote0-api";

const landingUrl = process.env.NEXT_PUBLIC_LANDING_URL ?? DEFAULT_LANDING_URL;

export function GET(request: Request) {
  return canvasApi(request, {
    ...calendarOptionsFromProcess(),
    landingUrl,
    apiBaseUrl: new URL(request.url).origin,
  });
}

export const OPTIONS = corsOptions;
