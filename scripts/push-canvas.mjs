import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const CANVAS_ENDPOINT = "https://dot.mindreset.tech/api/authV2/open/device";

export function canvasPushBody(canvas, { taskType = "loop", taskKey = "" } = {}) {
  if (taskType !== "loop" && taskType !== "fixed") {
    throw new Error("DOT_TASK_TYPE must be loop or fixed");
  }
  const body = {
    refreshNow: taskType === "loop",
    taskType,
    taskAlias: canvas.taskAlias,
    data: canvas.data,
    windowData: canvas.windowData,
    layoutFull: canvas.layoutFull,
    link: canvas.link,
    border: canvas.border ?? 0,
  };
  if (taskKey) body.taskKey = taskKey;
  return body;
}

async function main() {
  const apiKey = process.env.DOT_API_KEY?.trim();
  const deviceId = process.env.DOT_DEVICE_ID?.trim();
  if (!apiKey || !deviceId) {
    console.log("DOT_API_KEY or DOT_DEVICE_ID is unset; skipping device push.");
    return;
  }

  const canvas = JSON.parse(await readFile(process.argv[2], "utf8"));
  const body = canvasPushBody(canvas, {
    taskType: process.env.DOT_TASK_TYPE?.trim() || "loop",
    taskKey: process.env.DOT_TASK_KEY?.trim() || "",
  });
  const response = await fetch(
    `${CANVAS_ENDPOINT}/${encodeURIComponent(deviceId)}/canvas`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`Canvas push failed: HTTP ${response.status} ${detail}`);
  }
  console.log(`Canvas pushed to Quote/0: HTTP ${response.status}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
