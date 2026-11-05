# 沪上校历 · Quote/0

面向上海地区中小学的 Quote/0 墨水屏校历：显示开学多久、距离学期结束还有多久，以及寒暑假和教学周进度。

[GitHub Pages 落地页](https://asahiart.github.io/quote0-school-calendar/) · [开源仓库](https://github.com/AsahiArt/quote0-school-calendar)

项目只生成 Quote/0 Canvas 结构化布局。设备发现、鉴权和推送使用 [MindReset 官方 Dot Skill](https://github.com/MindReset/dot_skill) 或官方 OpenAPI，不在本仓库保存 `DOT_API_KEY` 和设备序列号。

日期怎么判断见 [docs/architecture.md](docs/architecture.md)。

## 使用哪种方式

| 方式 | 适合 | 设备怎么更新 |
| --- | --- | --- |
| [GitHub Pages](#github-pages) | 看落地页，或每天自动推到自己的设备 | 配置 secrets 后，每天构建完推送一次 |
| [Cloudflare Worker](#cloudflare-worker) | 需要随时计算任意日期的接口 | 自己或官方工具拉取 `/api/quote0/canvas` 再推送 |
| [Docker](#docker) | 在自己的机器上同时跑页面和接口 | 同上，地址是本机的 `/api/quote0/canvas` |
| [手动推送](#手动推送到-quote0) | 只更新一次 | 用官方工具把一份 Canvas JSON 发给设备 |

Quote/0 不会自己打开这些网址。无论用哪种方式，设备上要先在 Dot. App 里添加一个 **Canvas API** 内容项。

## 本地开发

包管理用 Bun 1.4。页面和测试运行在 Node.js 22.13 或更新版本上。

```bash
bun install
bun run dev
```

打开 <http://localhost:3000>。验证：

```bash
bun run test
bun run test:deploy
```

本地接口：

```text
GET /api/health
GET /api/calendar?date=YYYY-MM-DD
GET /api/quote0/canvas?date=YYYY-MM-DD
```

## GitHub Pages

合并到 `main` 后，`deploy-pages.yml` 会发布落地页。页面上的倒计时在浏览器里计算。

每天 00:05（上海）会再构建一次。GitHub 的定时任务可能推迟。构建同时写出当天的两份文件：

```text
https://asahiart.github.io/quote0-school-calendar/canvas.json
https://asahiart.github.io/quote0-school-calendar/calendar.json
```

`canvas.json` 是可以推送到设备的 Canvas 负载。`calendar.json` 是同一天的计算明细，只给人核对，设备和页面都不会自动读取它。

### 每天推到自己的设备

在 Content Studio 添加 Canvas API 内容后，设置仓库 secrets：

```text
DOT_API_KEY
DOT_DEVICE_ID
```

每天的 Pages 构建成功后，会把 `canvas.json` POST 到 [官方 Canvas API](https://dot.mindreset.tech/docs/service/open/canvas_api)。没有这两个 secrets 时跳过，不影响页面发布。

可选设置：

| 名称 | 类型 | 作用 |
| --- | --- | --- |
| `DOT_TASK_KEY` | secret | 只更新这一项。不设置时更新所选列表里的全部 Canvas API 内容 |
| `DOT_TASK_TYPE` | 仓库变量 | `loop`（默认，在线时请求立即刷新）或 `fixed`（只保存，仍按 App 里的时间显示） |

## Cloudflare Worker

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/AsahiArt/quote0-school-calendar)

按钮会把仓库复制到你的 GitHub 账号，再用你的 Cloudflare 账号部署。部署页里把 Build command 留空，Deploy command 保持：

```text
wrangler deploy --config wrangler.api.jsonc
```

部署完成后，接口在：

```text
GET https://<worker-host>/api/health
GET https://<worker-host>/api/calendar?date=YYYY-MM-DD
GET https://<worker-host>/api/quote0/canvas?date=YYYY-MM-DD
```

不带 `date` 时按上海今天计算。设备或官方工具读取 `canvas` 接口，再把响应推送到设备。

本仓库的自动部署另外需要 Actions secrets：

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

本机部署：

```bash
bun run build:worker
bunx wrangler deploy --config wrangler.api.jsonc
```

要让落地页上的接口卡片指向这个 Worker，设置 GitHub 仓库变量：

```text
QUOTE0_API_BASE_URL=https://<worker-host>
```

没有这个变量时，页面只显示路径，不会链到 GitHub Pages 上不存在的接口。

## Docker

Docker 同时提供落地页和同源接口：

```bash
docker compose up --build
```

打开 <http://localhost:3000>。接口是：

```text
GET http://localhost:3000/api/health
GET http://localhost:3000/api/calendar?date=YYYY-MM-DD
GET http://localhost:3000/api/quote0/canvas?date=YYYY-MM-DD
```

已发布的镜像：

```text
ghcr.io/asahiart/quote0-school-calendar:latest
```

换成自己的校历文件：

```bash
CALENDAR_FILE=./my-calendar.json docker compose up
```

文件格式与 `data/school-calendar.json` 相同。

## 手动推送到 Quote/0

1. 在 Dot. App 的 Content Studio 里，给设备添加 **Canvas API** 内容。
2. 取得一份 Canvas JSON。可以用上面的 `canvas.json`，也可以请求 Worker 或 Docker 的 `/api/quote0/canvas`。
3. 用官方 Dot Skill 或 OpenAPI 把这份 JSON 发给设备。

固定列表不会因为这次推送立刻换画面，仍按 App 里设置的时间显示。循环列表可以在设备在线时立即刷新；设备休眠时，会在醒来后拿到已保存的内容。

## 校历数据

数据依据上海市教育委员会发布的上海市中小学校历。已收录 2025 学年与 2026 学年。法定节假日、个别学校安排或临时调整以学校最新通知为准。

- [上海市中小学 2026 学年校历](https://edu.sh.gov.cn/xxgk2_zdgz_jcjy_05/20260605/19ca2cb2e10a47fe86047bcc0bfdd0e8.html)
- [Quote/0 加入 Content Studio](https://dot.mindreset.tech/docs/service/studio/join-content-studio)
- [Quote/0 Canvas API](https://dot.mindreset.tech/docs/service/open/canvas_api)

替换校历的规则见 [docs/architecture.md](docs/architecture.md#替换校历)。

## 代码在哪里

```text
data/school-calendar.json  校历区间和来源
lib/school-calendar.ts      日期计算
lib/quote0-api.ts           REST 响应和 Canvas 负载
app/                        落地页；Docker 复用其中的 API 路由
worker/api.ts               Cloudflare Worker 适配器
content-studio/             Content Studio 申报材料
```

页面、Docker 和 Worker 都调用 `lib/`，不各自复制校历数据或 Canvas 模板。
