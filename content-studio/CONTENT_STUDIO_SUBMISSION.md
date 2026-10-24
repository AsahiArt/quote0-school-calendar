# 沪上校历 · Quote/0 Content Studio 申报资料

> 状态：技术材料已就绪，Cloudflare Worker 域名待配置，之后提交 Quote/0 官方审核。本文档不是上架证明。

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 中文名称 | 沪上校历 |
| 英文名称 | Shanghai School Calendar |
| 中文简介 | 查看上海中小学开学、结课及寒暑假进度。 |
| 英文简介 | Shanghai school term progress and holiday countdowns for Quote/0. |
| 适用设备 | Quote/0，横向 296 × 152 |
| 地区与语言 | 中国上海；简体中文（zh-CN） |
| 内容类型 | 教育 / 日历 / 倒计时 |
| 数据来源 | 上海市教育委员会公布的上海市中小学校历 |
| 落地页 | https://asahiart.github.io/quote0-school-calendar/ |
| 开源代码 | https://github.com/AsahiArt/quote0-school-calendar |
| 卡片图标 | https://asahiart.github.io/quote0-school-calendar/content-studio-icon.png |
| 品牌色 | 墨色 `#171A17`、纸色 `#F4F1E9`、荧光绿 `#D5FF37` |

## 接口

### 校历 REST API

- URL：`https://quote0-school-calendar-api.<workers-subdomain>.workers.dev/api/calendar`
- 方法：`GET`
- 鉴权：无
- 可选参数：`date=YYYY-MM-DD`
- 响应：`application/json; charset=utf-8`
- CORS：允许跨域读取，托管站点已公开
- 建议刷新：每 6 小时；最短拉取间隔 1 小时
- 未指定日期的响应缓存至下一个上海午夜，最长 1 小时
- 错误响应：无效日期返回 HTTP 400 与稳定的 `error.code`
- 示例：[`calendar-response-example.json`](calendar-response-example.json)

### Quote/0 Canvas 布局

- URL：`https://quote0-school-calendar-api.<workers-subdomain>.workers.dev/api/quote0/canvas`
- 方法：`GET`
- 鉴权：无
- 可选参数：`date=YYYY-MM-DD`
- 返回字段：`data`、`windowData`、`layoutFull`、`link`、`border`
- 点击动作：打开项目落地页
- 示例：[`canvas-response-example.json`](canvas-response-example.json)

## 功能说明

卡片会依据上海时区自动判断当前处于上课学期、寒假或暑假，并显示：

1. 距离结课、开学或假期结束的天数；
2. 当前学期或假期已进行天数；
3. 教学周次与整体进度；
4. 下一个关键校历事件。

已收录 2025 学年和 2026 学年官方校历，后续学年将在上海市教委发布后更新。法定节假日、个别学校安排或临时调整，以学校最新通知为准。

## 隐私与安全

- 不收集用户账号、设备序列号、API Key 或位置；
- 不需要 OAuth，也没有用户登录；
- 所有接口均为只读 GET；
- 日期参数只用于生成对应日期的校历状态；
- 返回内容不含广告和付费跳转。

## 审核清单

- [x] 100 × 100 透明 PNG 图标；
- [x] GitHub Pages 落地页已公开访问；
- [ ] Cloudflare Worker API 已部署并替换本文占位域名；
- [x] 无鉴权 REST API 与完整响应示例；
- [x] Quote/0 Canvas 布局数据；
- [x] 数据来源、刷新频率和免责声明；
- [x] 中英文名称与简介；
- [x] 提交人联系邮箱：`chuxubank@qq.com`；
- [ ] 通过 Quote/0 官方 Content Studio 表单提交；
- [ ] 官方审核并确认上架。

## 官方来源

- Quote/0《加入 Content Studio》：https://dot.mindreset.tech/docs/service/studio/join-content-studio
- Quote/0《Canvas API》：https://dot.mindreset.tech/docs/service/open/canvas_api
- 上海市中小学 2026 学年校历：https://edu.sh.gov.cn/xxgk2_zdgz_jcjy_05/20260605/19ca2cb2e10a47fe86047bcc0bfdd0e8.html
