import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const CANVAS_ENDPOINT = "https://dot.mindreset.tech/api/authV2/open/device";

export function canvasTargets(lists, { taskType = "", taskKey = "" } = {}) {
  const types = taskType ? [taskType] : ["loop", "fixed"];
  for (const type of types) {
    if (type !== "loop" && type !== "fixed") {
      throw new Error("DOT_TASK_TYPE must be loop or fixed");
    }
  }
  if (taskKey) return [{ taskType: types[0], taskKey }];

  return types.flatMap((type) =>
    (lists[type] ?? [])
      .filter((item) => item?.type === "CANVAS_API" && item.key)
      .map((item) => ({ taskType: type, taskKey: item.key })),
  );
}

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
  const taskType = process.env.DOT_TASK_TYPE?.trim() || "";
  const taskKey = process.env.DOT_TASK_KEY?.trim() || "";
  const headers = { Authorization: `Bearer ${apiKey}` };
  const lists = {};
  if (!taskKey) {
    for (const type of taskType ? [taskType] : ["loop", "fixed"]) {
      const response = await fetch(
        `${CANVAS_ENDPOINT}/${encodeURIComponent(deviceId)}/${type}/list`,
        { headers },
      );
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 500);
        throw new Error(`Unable to list ${type} content: HTTP ${response.status} ${detail}`);
      }
      lists[type] = await response.json();
    }
  }
  const targets = canvasTargets(lists, { taskType, taskKey });
  if (targets.length === 0) {
    throw new Error("No Canvas API content found to update");
  }

  for (const target of targets) {
    const response = await fetch(
      `${CANVAS_ENDPOINT}/${encodeURIComponent(deviceId)}/canvas`,
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(canvasPushBody(canvas, target)),
      },
    );
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      throw new Error(
        `Canvas push failed for ${target.taskType}: HTTP ${response.status} ${detail}`,
      );
    }
    console.log(`Canvas pushed to ${target.taskType}: HTTP ${response.status}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
