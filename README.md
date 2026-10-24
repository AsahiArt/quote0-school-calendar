# 沪上校历 · Quote/0

面向上海地区中小学的 Quote/0 墨水屏校历：显示开学多久、距离学期结束还有多久，以及寒暑假和教学周进度。

[GitHub Pages 落地页](https://asahiart.github.io/quote0-school-calendar/) · [开源仓库](https://github.com/AsahiArt/quote0-school-calendar)

项目只生成 Quote/0 Canvas 结构化布局，不再维护 Image API、Python CLI 或 ChatGPT Site 部署。设备发现、鉴权和推送交由 [MindReset 官方 Dot Skill](https://github.com/MindReset/dot_skill) 或官方 OpenAPI 工具处理，不在本仓库重复实现。

流程、部署路径和日期判断见 [docs/architecture.md](docs/architecture.md)。

## 架构

```text
data/school-calendar.json  校历区间和来源（唯一数据）
lib/school-calendar.ts      日期计算（唯一实现）
lib/quote0-api.ts       REST 响应和 Quote/0 Canvas 负载（唯一实现）
app/                    GitHub Pages 落地页；Docker 同时复用其中的 API 路由
worker/api.ts           Cloudflare Worker 的轻量部署适配器
content-studio/         Quote/0 Content Studio 申报材料
docs/architecture.md    流程与日期逻辑
```

页面、Docker 和 Worker 都调用 `lib/` 中的共享模块，不各自复制校历数据或 Canvas 模板。替换校历的方式见 [docs/architecture.md](docs/architecture.md#替换校历)。

## 本地开发

需要 Node.js 22.13 或更新版本：

```bash
npm install
npm run dev
```

验证站点、API 与部署产物：

```bash
npm test
npm run test:deploy
```

提供的只读路由：

```text
GET /api/health
GET /api/calendar?date=YYYY-MM-DD
GET /api/quote0/canvas?date=YYYY-MM-DD
```

## GitHub Pages + Cloudflare Worker

合并到 `main` 后，`deploy-pages.yml` 会发布静态落地页。页面中的倒计时在浏览器本地计算，不依赖后端。

要启用页面中的 REST 和 Canvas 链接，先部署 Worker，再设置 GitHub 仓库变量：

```text
QUOTE0_API_BASE_URL=https://quote0-school-calendar-api.<workers-subdomain>.workers.dev
```

没有这个变量时，页面仍展示接口路径，但不会把它们链到 GitHub Pages 上不存在的路由。

自动部署 Worker 需要以下 GitHub Actions secrets：

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

本机也可以验证或部署：

```bash
npm run build:worker
npx wrangler deploy --config wrangler.api.jsonc
```

## Docker

Docker 提供完整落地页和同源 API：

```bash
docker compose up --build
```

随后访问 <http://localhost:3000>。发布镜像为：

```text
ghcr.io/asahiart/quote0-school-calendar:latest
```

## Quote/0 使用方式

1. 在 Dot. App 的 Content Studio 中把 **Canvas API** 加入设备内容；
2. 从已部署的 `/api/quote0/canvas` 获取布局负载；
3. 使用全局安装的 MindReset 官方 Dot Skill 或官方 OpenAPI 将负载发送到设备。

本仓库不读取或保存 `DOT_API_KEY`、设备序列号等凭据。

## 校历数据

数据依据上海市教育委员会发布的上海市中小学校历。已收录 2025 学年与 2026 学年；法定节假日、个别学校安排或临时调整以学校最新通知为准。

- [上海市中小学 2026 学年校历](https://edu.sh.gov.cn/xxgk2_zdgz_jcjy_05/20260605/19ca2cb2e10a47fe86047bcc0bfdd0e8.html)
- [Quote/0 加入 Content Studio](https://dot.mindreset.tech/docs/service/studio/join-content-studio)
- [Quote/0 Canvas API](https://dot.mindreset.tech/docs/service/open/canvas_api)

## 状态

GitHub Pages 落地页和 Canvas/REST 实现已经就绪。Cloudflare Worker 域名配置完成后，即可更新申报材料并提交 Quote/0 Content Studio 审核。
