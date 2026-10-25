import { readFile } from "node:fs/promises";
import { calendarOptionsFromProcess, type CalendarLoadOptions } from "./load-calendar.ts";

export function nodeCalendarOptions(): CalendarLoadOptions {
  return {
    ...calendarOptionsFromProcess(),
    readFile: (filePath) => readFile(filePath, "utf8"),
  };
}
