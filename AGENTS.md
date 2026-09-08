# AGENTS.md — 项目导航文档（供 AI 助手快速理解本仓库）

> 本文档面向后续被调用的 AI 编码助手，目标是不经探索即可理解项目全貌。内容基于 2026-09-08 的代码状态（含当日第四轮更新：校园常识知识库）。
> 同目录的 `CLAUDE.md` 是更早的约定文档，其核心内容仍然有效并已并入本文（wrap() 双层信封、fileId 陷阱等实战踩坑记录）。

## 1. 项目是什么

**zju-campus-agent** — 本地优先的浙江大学校园智能助手。pnpm workspace monorepo（8 个包，约 1.4 万行一方代码）。React SPA 只与本机 Fastify 服务通信，后者封装 ZJU 校园服务（npm 包 `login-zju`：学在浙大/教务网/智云课堂）与 LLM 供应商（OpenAI/Anthropic）。**无任何云部署，纯本地/桌面运行。**

核心安全约束（改动前必读）：

- 前端**绝不**直接访问 ZJU 域名、**绝不**持有浙大密码/cookie 或 LLM apiKey；一切 ZJU 调用走本地后端。
- `login-zju` 是**纯服务端**库，只允许在 `packages/zju-services` / `packages/server` 中 import，禁止进入 `apps/web`，禁止把上游 `login-ZJU/` 源码复制进本仓库。
- 服务只绑定 `127.0.0.1`（端口 7788，可用环境变量 `ZJU_AGENT_PORT` 覆盖）。

## 2. 常用命令

```bash
pnpm install            # 安装依赖（要求 Node >= 20，pnpm 11，packageManager 字段已锁定）
pnpm dev:server         # 后端：tsx watch，http://127.0.0.1:7788（仅环回）
pnpm dev:web            # 前端：Vite，http://localhost:5173，/api 代理到后端
pnpm typecheck          # 全仓 tsc --noEmit
pnpm test               # vitest run —— 单元测试（配置在根 vitest.config.ts）
pnpm lint               # eslint . —— ESLint 9 flat config（eslint.config.js）
pnpm build              # 全量构建
pnpm --filter @zju-agent/web build     # 单包构建（filter 用包名）
```

- Windows 用户可直接双击根目录 **`start-dev.bat`** 一键启动：环境检查 → 装依赖 → 由 `scripts/dev-launcher.mjs` 把前后端**后台隐藏托管**（日志写 `.run/server.log`、`.run/web.log`）+ 拉起系统托盘 + 桌面挂件 → 服务就绪后自动打开浏览器。**不再弹出两个终端窗口**；双击 **`stop-dev.bat`**（或托盘菜单「退出」）停止服务。托盘菜单：打开主界面 / 显示·隐藏挂件 / 打开日志目录 / 重启服务 / 退出。
- `start-dev.bat` / `stop-dev.bat` 都是 **GBK 编码 + CRLF**（cmd 中文必需），勿用编辑器另存为 UTF-8。
- `pnpm dev` 会并行跑所有包的 dev，一般不需要；日常用上面两条 dev 命令或 bat。
- **测试已接入**（vitest 2.1.9，根 `vitest.config.ts` 收集 `packages/*/src/**/*.test.ts` 与 `apps/*/src/**/*.test.{ts,tsx}`）。现有 8 个套件 74 例：`packages/core/src/domain/zdbk.test.ts`（mergeTimetableEntries）、`apps/web/src/__tests__/compressWeeks.test.ts`（从 `utils/timetable.ts` 导入）、`apps/web/src/__tests__/timetablePeriods.test.ts`（1-13 节作息时间/节次标签）、`packages/server/src/auth/credentials.test.ts`（加密往返/v2 格式）、`packages/zju-services/src/notices/index.test.ts`（通知解析/日期转换，样本来自抓包项目 fixtures）、`packages/server/src/agent/prompt.test.ts`（系统提示词拼装 + 只读工具过滤 + 知识库提示块）、`packages/llm/src/adapters/openai.test.ts`（joinUrl 版本段处理）、`packages/server/src/knowledge/search.test.ts`（知识库分块/分词/IDF 检索 + 真实数据冒烟）。新增纯函数时应配套 `*.test.ts`。
- **ESLint 已接入**（eslint.config.js：typescript-eslint recommended + react-hooks + tailwindcss `no-custom-classname`，后者可拦截 v3 下不存在的类名如 `p-4.5`）。改完代码跑 `pnpm lint`。注意 `no-custom-classname` 白名单里有 `fa-fw`（FontAwesome）和 `input`（Settings.tsx 内联样式）两个非 Tailwind 类；`.run/**` 已在 ignores 中（开发期运行时目录）。
- ZJU 认证 happy path 的 bug 仍需真实凭据手工端到端验证（见 §14）。

## 3. 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 + TypeScript 5.9 (strict) + Vite 5 + React Router 6 + TanStack Query 5 + Zustand 4 + Tailwind **3.4** + `@crisp-ui-kit/crisp` 0.2 + FontAwesome 7 + react-markdown/remark-gfm |
| 后端 | Node 20+ + TypeScript (strict) + Fastify 5 + Zod 3 + better-sqlite3 + tsx（dev 热重载） |
| LLM | 自研 provider 无关层，OpenAI + Anthropic 适配器（注入式 fetch，工具调用 + SSE 流式） |
| 校园服务 | npm 包 `login-zju`（ZJUAM 统一认证 / COURSES 学在浙大 / ZDBK 教务网 / CLASSROOM 智云课堂） |
| 桌面 | Electron 33 + electron-builder + esbuild 打包（复用 web 构建产物 + server bundle） |
| Monorepo | pnpm 11 workspace，共享 `tsconfig.base.json` |

## 4. 仓库顶层布局

```
zju-agent-new/
├── AGENTS.md                  ← 本文档
├── CLAUDE.md                  ← 早期约定文档（核心约定已并入本文）
├── README.md                  ← 项目简介
├── ZJU_CAMPUS_AGENT_PROJECT.md  ← 44KB 完整项目规格书（需求/阶段规划）
├── start-dev.bat              ← Windows 一键启动（GBK 编码，勿转 UTF-8）
├── stop-dev.bat               ← 停止后台服务（GBK 编码）
├── scripts/
│   ├── dev-launcher.mjs       ← start-dev.bat 唯一入口：构建 → 端口探测 → 隐藏启动 Electron
│   └── stop-dev.mjs           ← 按 PID 文件 + 端口反查杀进程树
├── eslint.config.js           ← ESLint 9 flat config（根）
├── vitest.config.ts           ← vitest 配置（根，收集各包 *.test.ts）
├── tsconfig.base.json         ← 全仓共享 TS 配置（见 §11 约定）
├── pnpm-workspace.yaml / .npmrc / pnpm-lock.yaml
├── apps/
│   ├── web/                   ← React SPA（唯一前端）
│   └── desktop/               ← Electron 壳（main.ts 双模式：桌面应用 / --launcher 隐藏托管+托盘+挂件；preload.ts；esbuild 打包脚本 + electron-builder.yml）
├── packages/
│   ├── core/                  ← 平台无关共享类型（仅依赖 zod）
│   ├── server/                ← Fastify 应用（路由/Agent 循环/存储/认证）；`knowledge/` 是校园常识知识库数据（见 §9.5）
│   ├── llm/                   ← LLM 适配层（OpenAI/Anthropic）
│   ├── zju-services/          ← login-zju 封装 + 领域适配器
│   ├── storage/               ← 预留抽象缝（近空，未来 Electron/Capacitor 原生后端）
│   └── scheduler/             ← 预留抽象缝（近空）
└── docs/
    ├── celechron-schedule-reference.md   ← 校历课表格式参考
    ├── code-review-2026-09-08.md         ← 代码审查报告（全部问题已修复，含各项修复说明）
    └── widget-material-comparison.md     ← 桌面挂件两种材质实测对比（亚克力 vs CSS 半透明）
```

## 5. 架构与数据流

```
React Web UI (apps/web, Vite :5173)
   │  HTTP + Bearer 本地访问 token（经 /api 代理，token 永不出本机）
   ▼
本地 Fastify 服务 (packages/server, 127.0.0.1:7788)
   ├── packages/llm            OpenAI/Anthropic 适配、工具调用、SSE
   ├── packages/zju-services   封装 login-zju（学在浙大/教务网/智云课堂）
   ├── SQLite (WAL) + AES-256-GCM 加密凭据   ~/.zju-campus-agent/
   └── apps/desktop            Electron 壳复用 web 构建产物
```

Electron 桌面模式下：web 构建产物由 Electron 加载，token 由 Electron 注入（不走 bootstrap 接口）。

## 6. 启动与认证生命周期（动 auth 前必读）

1. **服务启动**（`packages/server/src/index.ts`）：`loadConfig` 解析数据目录（Windows 实测为 `C:\Users\<用户>\AppData\Roaming\.zju-campus-agent\`），打开/创建 `agent.db`（SQLite, WAL），构建 `EncryptedFileCredentialStore`，读取/创建 `.token`（本地访问 token，文件权限 0o600）。启动时还会清理历史遗留的明文 apiKey。
2. **认证中间件**（`packages/server/src/middleware/auth.ts`）：除 `/api/health` 和 `/api/bootstrap` 外所有路由要求 `Authorization: Bearer <token>`（时序安全比较）。无法带请求头的二进制资源（`<img>`/`<iframe>` 预览）回退 `?token=` 查询参数。
3. **token 分发**：开发模式 `GET /api/bootstrap` 直接把 token 返给前端；生产模式必须由 Electron 注入/读文件，不走该接口。前端 `apps/web/src/api/bootstrap.ts` 把 token 存 localStorage，401 时自动恢复。CORS 仅允许本地来源，bootstrap 路由还有第二道 origin 校验。
4. **凭据存储**（`packages/server/src/auth/credentials.ts`）：浙大密码 + LLM apiKey 以 AES-256-GCM 存于 `~/.zju-campus-agent/credentials.enc`，密钥由 `username@hostname:appDir` 派生（PBKDF2 200k 迭代，机器绑定，不落盘）。前端只能看到脱敏的 `CredentialStatus`。
5. **ZJU 访问**：路由调用 `deps.auth.getServiceAdapters()`（懒登录，无凭据抛 `ZJU_CREDENTIAL_MISSING`）。不要在路由里直接调 `login-zju` 的类——一律走 `AuthSessionManager`/`ZjuServices`。

## 7. packages/core — 共享类型（无逻辑重灾区）

入口 `src/index.ts` 全量 re-export。各文件：

| 文件 | 内容 |
|---|---|
| `api.ts` | `ApiResponse` 信封（`{ok:true,data}` / `{ok:false,error}`） |
| `errors.ts` | `AppError`、`ErrorCode` 枚举 |
| `tools.ts` | Agent 工具定义类型 |
| `agent.ts` | Agent 消息/会话类型 |
| `settings.ts` | 设置项类型（含个性化：`nickname` / `avatarDataUrl` / `personaPrompt`） |
| `auth.ts` | 凭据状态类型 |
| `domain/courses.ts` | 学在浙大：课程/课件/作业/测验 |
| `domain/zdbk.ts` | 教务网：`TimetableEntry`（课表条目）、`mergeTimetableEntries`（合并连续节次）、考试、成绩 |
| `domain/schedule.ts` | **723 行**：校历 + 时空流解析/映射（最核心的纯函数逻辑） |
| `domain/classroom.ts` / `network.ts` | Phase 7 预留（当前为 stub） |

约束：core 被浏览器共用，保持依赖极轻（仅 zod），禁止 Node-only API、禁止 React。

## 8. packages/zju-services — 校园服务适配层

`createZjuServices()` 返回懒加载的 `ZjuServices`：`loginZjuam()` / `getInstances()` / `getAdapters()` / `reset()`，所有子服务共享一个 ZJUAM 登录态。

| 文件 | 适配器 | 说明 |
|---|---|---|
| `courses/index.ts` | `CoursesService` | 学在浙大课程/课件/作业/测验（含两处裸 `catch {}` 静默吞错，见审查报告） |
| `zdbk/index.ts` | `ZdbkService` | 教务网考试/课表/成绩（567 行，正方课表端点双候选路径探测） |
| `calendar/index.ts` | `CalendarService` | 校历 |
| `notices/index.ts` | `NoticeService` | 学校通知公告抓取（素质拓展 getTzggList + 教务 xwck_cxMoreLoginNews）。**两个都是免登录公开 JSON 接口**，与浙大凭据无关，直接挂容器不进 `ZjuServiceAdapters`。解析纯函数 `parseSztzResponse`/`parseZdbkResponse`/`toBeijingDate` 有单测 |
| `classroom/index.ts` | `ClassroomService` | **stub，返回 `[]`**（Phase 7 故意延后） |
| `network/index.ts` | `NetworkService` | **stub，抛 `ZJU_SERVICE_UNAVAILABLE`** |

关键工具函数（教务网↔学在浙大学期映射）：`semesterToXnxq01id`（"2024-2025春夏" → "2024-2025-2"）、`activeXnxq01ids`、`currentXnxq01id`、`getAcademicPeriod`。

注意 `runQuiet`：login-zju 会在 stdout 打印含 CAS ticket/oauth code 的重定向 URL（泄密面），登录期间临时静音 console.log 并用串行队列防并发污染。

## 9. packages/server — Fastify 后端

### 9.1 路由（`src/server.ts` 统一注册）

| 前缀 | 文件 | 内容 |
|---|---|---|
| `/api` | `routes/health.ts` | `GET /api/health` 健康检查（免认证） |
| `/api` | `routes/bootstrap.ts` | `GET /api/bootstrap`（dev 发 token） |
| `/api/settings` | `routes/settings.ts` | 设置读写（含加密的 model-providers） |
| `/api/auth` | `routes/auth.ts` | 浙大凭据保存/校验/登出 |
| `/api/zju` | `routes/zju-courses.ts` | 学在浙大：学期/课程/课件/作业/测验/下载 |
| `/api/zju` | `routes/zdbk.ts` | 教务网：考试/课表/成绩（注意与 zju-courses 同挂 `/api/zju`） |
| `/api/zju` | `routes/notices.ts` | 学校通知公告 `GET /api/zju/notices`（缓存 30 分钟，`refresh=1` 强刷；免凭据） |
| `/api/files` | `routes/files.ts` | 下载管理/预览 |
| `/api/agent` | `routes/agent.ts` | 聊天/确认/会话管理（SSE） |

`server.ts` 的 `onSend` 钩子通过字符串嗅探 `{"ok":false` 再反解 JSON 映射错误码→HTTP 状态码（脆弱模式，改错误处理时留意）。

### 9.2 Agent 系统（`src/agent/`）

- `tools.ts`（870 行）：`buildTools(deps)` 注册工具，每个带 `riskLevel`（`read` / `write` / `payment` / `external_download`）与 `requiresConfirmation`。`read` 直接执行；高风险工具进 `pending_confirmations`（**5 分钟 TTL**），用户经 `POST /api/agent/confirm` 批准后才执行。其中 `zju_search_guide` / `zju_read_guide` 是校园常识知识库工具（见 §9.5），只读、无需登录。
- `prompt.ts`：**纯函数** `buildSystemPrompt({datetime, period, brief, profile, guideOutline})` 拼装系统提示（基础人设 + 知识库使用规则与章节目录 + 昵称/自述个性化 + 挂件极简模式）与 `filterToolsForMode(tools, readOnly)`；单测见 `prompt.test.ts`。`guideOutline` 为空（知识库不可用）时整段省略，不报错。
- `loop.ts`：`AgentLoop(deps, { readOnly?, brief? })` 最多 **8 轮**迭代：流式调 LLM → 收集文本+tool_calls → 持久化 assistant 消息 → 执行工具（或停在确认点）→ 结果回喂。`resumeAfterConfirm`/`resumeAfterReject` 恢复暂停的循环。Provider 取加密设置 `model-providers` 中第一个 `enabled` 条目；昵称/人设从明文设置 `app-settings` 读取。
- 聊天走 **SSE**：`POST /api/agent/chat` 与 `/confirm` 以 `data: <json>\n\n` 流式推送事件；会话与消息持久化到 SQLite（`conversations`/`messages` 表），重连可恢复。
- **挂件一次性问答**：`POST /api/agent/chat` 带 `mode: "widget"` 时，不建会话、不落库（`persist: false`）、只用只读工具（`readOnly`）、系统提示追加极简约束（`brief`）；`done` 事件里的 conversationId 是虚拟值 `widget-ephemeral`。

### 9.3 存储（`src/storage/`，SQLite 表）

`db.ts`（连接+WAL）、`conversations.ts`（会话+消息）、`downloads.ts`（下载记录）、`settings-repo.ts`、`audit.ts`（审计日志）、`confirmations.ts`（待确认工具调用）、`cache.ts`（ZJU 响应缓存）。`services.ts` 是服务容器（所有 repo + ZjuServices + CalendarService）。

### 9.4 其他

`config/env.ts`（端口/数据目录）、`config/logger.ts`、`middleware/auth.ts`、`auth/auth-session.ts`（AuthSessionManager）、`auth/credentials.ts`（加密凭据库）、`util/download.ts`、`util/rate-limit.ts`（Map 不过期清理，本地应用影响小）。

### 9.5 校园常识知识库（`src/knowledge/` + `knowledge/`）

把 CC98《浙江大学本科新生指引》（2026 版，93 篇 md / 830 个段落 / 约 740 KB）变成 AI 可按需检索的背景知识。**全文不常驻提示词**（约 20-30 万 token，塞不下），只把自动生成的章节目录（约 400 token）注入系统提示。

| 文件 | 职责 |
|---|---|
| `knowledge/*.md` | 知识库数据（随仓库提交、随桌面版打包）。`ATTRIBUTION.md` 记录来源/许可/更新方式，不参与检索 |
| `src/knowledge/search.ts` | **纯函数**：markdown 按标题分块（保留标题链）、中文 2-gram + 英文词分词、IDF 加权打分；单测 `search.test.ts` |
| `src/knowledge/index.ts` | 目录定位、懒加载 + 内存缓存、`searchGuide` / `readGuideDoc` / `getGuideOutline` |

- **目录解析顺序**：`ZJU_AGENT_KNOWLEDGE_DIR` 环境变量 → 同级 `knowledge/`（esbuild 打包后 `resources/server/knowledge`，由 `apps/desktop/electron-builder.yml` 的 extraResources 拷贝）→ 上两级 `knowledge/`（tsx 源码 / tsc 产物）。全部落空时降级为空知识库（工具返回"没找到"，提示词省略知识库段），不影响其它功能。
- **检索策略**：段落 = 一个标题到下一个标题之间的正文；得分 = 标题命中×6 + 正文命中（各 token 上限 6 次），再按 IDF 加权；出现在 30% 以上段落里的 token（"什么""怎么"）直接丢弃。实测「绩点怎么算」「选课抽签规则」「医保报销」等口语化提问能命中对应段落。
- **工具**：`zju_search_guide(query, limit)` 返回 top-N 原文片段（单条约 1500 字）；`zju_read_guide(doc)` 按路径读全文（约 8000 字上限）。两者都是 `read` 级，挂件只读模式自动可用。
- **回答约束**（写在 `prompt.ts` 的 `GUIDE_RULES`）：先检索再回答、不得用通用大学常识替代浙大规定、检索不到要如实说明、个人实时数据仍走 `zju_get_*`、引用时标注「参考《浙江大学本科新生指引》」、政策类补「以学校官方最新通知为准」。
- **更新知识库**：用上游新版 md 覆盖 `knowledge/` 同名文件即可，无需改代码；`index.md`/`preface.md`/`postscript.md`/`stylesheets/` 等站点元信息不要放进来（`SKIP_DOCS` 里也列了，但保持目录干净更好）。
- **附件（地图/截图/PDF）有意不收录**：检索是纯文本的，图片对 AI 无价值，收录只会让仓库和安装包各多约 27 MB；引用图片的约 60 处段落正文自洽，纯图片文件（校历图、校园地图）会被索引自动跳过。若日后要补 PDF 正文，先 `pdftotext` 抽成 md 再放进 `knowledge/`（详见 `knowledge/ATTRIBUTION.md`）。

## 10. packages/llm — LLM 适配层

`types.ts`（统一消息/事件类型）、`provider.ts`、`adapters/openai.ts`、`adapters/anthropic.ts`、`agent-loop.ts`。无 Node-only API（fetch 注入），故需要 `lib: ["ES2022","DOM"]`。

## 11. apps/web — 前端结构

### 11.1 路由（`src/routes/index.tsx`，全部懒加载）

| 路径 | 页面 | 备注 |
|---|---|---|
| `/` | `pages/Dashboard.tsx` | 主仪表盘 |
| `/chat` | → 重定向 `/` 并打开悬浮聊天 | 无独立聊天页；聊天功能全在 FloatingChat |
| `/dashboard`, `/toolbox` | → 重定向 `/` | 历史路由兼容 |
| `/setup` | `pages/Setup.tsx` | 首次配置向导 |
| `/courses` | `pages/Courses.tsx` | 课表 + 课程列表 + 详情抽屉 |
| `/assignments` | `pages/Assignments.tsx` | 作业四态标签页 |
| `/exams` | `pages/Exams.tsx` | 考试安排 |
| `/school-info` | `pages/SchoolInfo.tsx` | 学校信息（素拓+教务通知列表，点击浏览器打开原文） |
| `/downloads` | `pages/Downloads.tsx` | 下载记录 + 预览抽屉 |
| `/classroom` | `pages/Classroom.tsx` | 占位页（10 行） |
| `/settings` | `pages/Settings.tsx` | 设置（凭据/模型/下载目录） |

### 11.2 组件（`src/components/`）

- `Layout.tsx`（235 行）：应用外壳——侧边栏、底部导航（移动端）、右面板、挂载 FloatingChat。
- `FloatingChat.tsx`：**全局悬浮 AI 聊天窗**（唯一在用的聊天实现）。拖拽移动、最小化、展开、工具步骤实时展示、风险操作确认。
- `TimetableGrid.tsx`：课表网格（**CSS Grid 显式定位**：`gridTemplateColumns: 64px + 7×1fr`，`gridTemplateRows: 32px + 13×minmax(48px, auto)`；格子按 `gridColumn`/`gridRow` 精确放置负责画线，课程块用 `gridRow: span N` 跨行随行高伸缩；同格多门课 flex 并排）。**勿改回绝对定位手算高度的方案**（已根除的漂移 bug）。首列显示「节次 + 上课时间」（时间取自 core 的 `ZJU_STANDARD_SESSION_TIMES`，经 `utils/timetable.ts` 的 `periodTimeRange` 取用）。导出 `compressWeeks`（周次压缩）。
- `ServerStatusBanner.tsx` / `ErrorBoundary.tsx` / `ErrorState.tsx` / `Loading.tsx`。

### 11.3 Dashboard 五大区块

工作区头部（欢迎语/学生信息）→「接下来」（Segmented 切换 日程/作业，未来 48 小时）→「学业快览」四张 KPI 卡（课程数/待办作业/考试/下载）→「校园百宝箱」工具矩阵 →「系统与连接状态」。

### 11.4 API 层（`src/api/`，TanStack Query hooks）

- `bootstrap.ts`：token 存取（zustand store + localStorage）、`useApiFetch()`、`useTokenUrl()`（二进制资源 `?token=`）。
- `zju.ts`：`useSemesters` / `useCourses` / `useMaterials` / `useCourseAssignments` / `useCourseQuizzes` / `useAllAssignments` / `useDownloadMaterial` / `useDownloads` / `useDeleteDownload` / `downloadPreviewUrl` / `useExams` / `useTimetable` / `useGrades` / `useUpcomingSchedule48h` / `useNotices`。
- `agent.ts`：`useConversations` / `useConversation` / `useSendMessage`（SSE）/ `useQuickAsk`（挂件一次性问答，`mode: "widget"`）/ `useConfirmTool` / `useDeleteConversation`，`AgentEvent` SSE 事件类型。
- `settings.ts`：`useAppSettings` / `useSaveAppSettings`（`app-settings` 是整体覆盖式 PUT，保存时必须带上已有字段）/ `fileToAvatarDataUrl`（前端压成 256×256 JPEG data URL）。
- `auth.ts`：`useAuthStatus` / `useValidateCredential` / `useLogout`。

### 11.5 状态与其他

`stores/useFloatingChat.ts`（zustand：开/关/最小化/展开/位置/预填 prompt/活跃会话）；`utils/format.ts`、`utils/sanitizeHtml.ts`；`styles/global.css`（仅 Tailwind 指令）；`main.tsx` 引入 `@crisp-ui-kit/crisp/styles.css` 并挂全局 ErrorBoundary；`vite.config.ts` 代理 `/api` → `ZJU_AGENT_BACKEND ?? http://127.0.0.1:7788`，`base: "./"`（便于 Electron 复用），`build.rollupOptions.input` 双入口（`index.html` + `widget.html`）。

### 11.6 桌面挂件入口（widget.html）

**独立 Vite 入口**，不套 `Layout`/Router/`ServerStatusBanner`：`widget.html` → `src/widget/main.tsx`（QueryClient + ErrorBoundary）→ `src/widget/WidgetApp.tsx`（+ `WidgetChat.tsx`）。要点：

- 数据只用一个 hook `useUpcomingSchedule48h()`（48h 日程 + 待办作业 + 周次信息，60s 自动刷新）；秒级倒计时在页面内 `setInterval` 本地算，不发额外请求。课程行显示「第X-Y节 + 起止时间 + 地点」（`utils/timetable.ts` 的 `sectionRangeLabel`，考试等无节次信息则不显示节次）。
- **背景是纯 CSS 半透明**（`bg-slate-900/60`），窗口不调用任何系统材质——Electron 的 acrylic 在「无边框 + 透明 + 置顶」窗口上只会渲染成灰板，实测见 `docs/widget-material-comparison.md`。窗口 380×560 DIP，贴主屏右边缘垂直居中。
- **底部对话条**（`WidgetChat.tsx`）走 `useQuickAsk()` → `mode: "widget"`：一次性问答、只读工具、服务端强制简短回答；答案只留在挂件内，换问题即覆盖，不写数据库。
- 未连上后端时每 3 秒重试 `bootstrap()`（后端可能比挂件晚就绪）；`src/widget/widget.css` 强制 `html/body/#root` 透明，否则 `global.css` 的 `body` 浅色底会挡住窗口透明。
- 托盘/窗口 IPC 只有两个通道：`widget:hide`、`widget:open-app`（preload 暴露为 `window.electronAPI.widget.*`，浏览器中为 `undefined`，页面内有回退）。

## 12. 编码约定与已知陷阱（违反必出 bug）

1. **相对导入必须带 `.js` 后缀**：`tsconfig.base.json` 用 `moduleResolution: Bundler` + `verbatimModuleSyntax`，所以 `import ... from "./server.js"`（源码是 `.ts`）。全 strict：`noUncheckedIndexedAccess`（索引访问返回 `T|undefined`）、`noImplicitOverride`、`noUnusedLocals/Parameters`。
2. **`wrap()` 双层信封陷阱**（真实生产 bug）：路由统一返回 `{ok,data}/{ok,error}`。`wrap(async () => …)` 已包一层——**在 wrap 内 return 原始值，绝不 `return ok(x)`**；`ok()` 只用于纯同步 handler。写错会双层嵌套，前端解一层拿到 `{ok,data}` 而非数组，`.map` 抛错白屏。新路由判断：`await`+抛 `AppError` → `wrap()` 返回裸数据；纯同步 → 直接 `return ok(data)`。
3. **前端查询错误处理模式**：`useCourses`/`useExams`/`useTimetable`/`useAllAssignments` 等统一 `retry: false, throwOnError: false`，消费端 `data ?? []`。保持此模式，query 未捕获抛错会炸掉路由子树（全局 ErrorBoundary 在 main.tsx）。
4. **fileId 陷阱**：学在浙大文件同时有 `id`（上传 id）和 `reference_id`；下载端点 `/api/uploads/{id}/blob` 要**上传 id**，永远用 `f.id`（早期 `referenceId ?? id` 导致 404）。Office 文件（.docx/.pptx/.xlsx）传 `officePdf: true` 取 PDF 预览版。
5. **教务网学期映射**：zdbk 的 StuId = 浙大凭据用户名；学期经 `semesterToXnxq01id`/`activeXnxq01ids` 映射。正方课表端点双候选路径探测，真账号测试为空时对照原始响应调 `toTimetableEntry` 字段名。
6. **Tailwind 是 v3.4，不是 v4**：v4 专属类名会**静默失效**（无报错）。写样式时只用 v3 刻度：间距 4→5（无 4.5），阴影 `shadow-sm`~`shadow-2xl`（无 xs/2xs/3xl），圆角最小 `rounded-sm`（无 `*-xs`）。**防线已接入**：`eslint-plugin-tailwindcss` 的 `no-custom-classname` 规则会在 lint 时报错拦截；另外项目**未装** typography 插件，`prose`/`prose-xs` 等类同样是无效的。
7. **crisp-ui-kit 的 `<Card>` 自身零内边距**：padding 必须自己传（如 `className="p-4"`）；`.card-body` 类未使用。
8. **login-zju 的 console 泄密**：见 §8 `runQuiet`，勿绕过。
9. **`start-dev.bat` / `stop-dev.bat` 是 GBK 编码**：中文 bat 在中文 Windows 上必须 GBK+CRLF，UTF-8 会导致 cmd 解析错乱。改这两个文件要 `iconv -f UTF-8 -t GBK` 后写回，并保持 CRLF。
10. **隐藏托管进程的停止必须杀进程树**：`pnpm dev:server` → pnpm → node → tsx 是多层子进程，`child.kill()` 只杀最外层，端口会被孤儿进程占着。统一用 `taskkill /PID <pid> /T /F`（见 `scripts/stop-dev.mjs` 与 `apps/desktop/src/launcher.ts` 的 `killTree`）。Electron launcher 自身被强杀时，靠 `stop-dev.mjs` 的端口反查兜底。
11. **挂件窗口创建要等前端就绪**：Vite 未起来时 `loadURL` 会失败并在日志里留 `ERR_CONNECTION_REFUSED`；`main.ts` 的 launcher 流程是 `start()` → `waitUntilReady()` → `recreateWidget()`，`widget-window.ts` 里还有 `did-fail-load` 重试 + `did-finish-load` 才 `showInactive()` 的双保险。
12. **Electron 亚克力在置顶窗口上不可用**：`transparent:true` + `setBackgroundMaterial('acrylic')` + `alwaysOnTop` 只会得到纯灰 `#545454`（Electron 33/38 一致，激活窗口也一样）；不置顶时材质干脆不生效。挂件因此只用 CSS 半透明，别再改回去——详见 `docs/widget-material-comparison.md`。另：`desktopCapturer` 在本机返回冻结画面，不能用来做实时模糊。
13. **LLM baseUrl 的版本段**：`joinUrl()`（`packages/llm/src/adapters/openai.ts`）只在 baseUrl 没有版本段时补 `/v1`。智谱 GLM 的 baseUrl 是 `https://open.bigmodel.cn/api/paas/v4`，必须直接拼 `/chat/completions`；早期实现无条件补 `/v1` 会打到 `/v4/v1/chat/completions` 返回 404。改这里要跑 `openai.test.ts`。
14. **个性化设置存在 `app-settings` 明文 JSON 里**：`PUT /api/settings/app` 是**整体覆盖**，前端保存前必须把 `useAppSettings()` 拿到的对象展开再改字段，否则会清掉其他设置（如下载目录）。
15. **上课时间只有一处定义**：`packages/core/src/domain/schedule.ts` 的 `ZJU_STANDARD_SESSION_TIMES`（1-13 节 08:00 起，14/15 节为夜间加课；index 0 是占位项）。后端日程流/挂件用它算 `startTimeStr`，前端课表网格/Excel 导出经 `apps/web/src/utils/timetable.ts` 的 `periodTimeRange`/`sectionRangeLabel` 取同一张表——**不要在页面里另抄一份时间**，作息调整只改 core 一处（`timetablePeriods.test.ts` 会守住这张表）。
16. **知识库缺失是静默降级，容易漏测**：`src/knowledge/index.ts` 依次探测 `ZJU_AGENT_KNOWLEDGE_DIR` → 同级 `knowledge/` → 上两级 `knowledge/`，全落空时只是"知识库不可用"（工具返回空 + 提示词省略该段），**不报错**。改了打包/目录结构后必须确认 `resources/server/knowledge` 真被拷进去（`electron-builder.yml` 的 extraResources）；dev（tsx 源码）与 esbuild 打包后 `import.meta.url` 位置不同，两种布局都要能命中。`knowledge/` 下新增文件后跑 `search.test.ts`（真实数据冒烟会校验加载数量）。

## 13. 数据目录（运行时产生，不入库）

```
~/.zju-campus-agent/            # Windows 实测: C:\Users\<用户>\AppData\Roaming\.zju-campus-agent\
├── data/agent.db               # SQLite (WAL)：conversations/messages/downloads/settings/audit_logs/pending_confirmations/cache
├── .token                      # 本地访问 token (0o600)
├── credentials.enc             # AES-256-GCM 加密的浙大密码 + LLM apiKey
└── (下载目录可在设置中配置)
```

## 14. 测试现实与验证清单

单元测试（vitest）覆盖纯函数（mergeTimetableEntries/compressWeeks/credentials 加密往返），但 Mock 抓不住 ZJU 认证 happy path 上的 bug（wrap 双层信封、fileId 反转、天气锁登录等都只在真凭据下暴露）。**声明一个改动完成前**：

1. `pnpm typecheck` + `pnpm lint` + `pnpm test` 全部通过；
2. `pnpm dev:server` + `pnpm dev:web`（或 `start-dev.bat`）；
3. Settings 里配置真实浙大账号 + 真实 LLM provider，浏览器里实际走一遍受影响功能；
4. 检查 `agent.db` 的 `audit_logs`，确认日志不含密码/cookie/apiKey。

## 15. 项目状态（2026-09-08 快照）

- Phase 1–6 已完成并端到端验证（配置+加密凭据、学在浙大课程/课件/作业/测验、教务网考试/课表、LLM Agent 循环+工具确认、下载可视化页）。
- **Phase 7（智云课堂/校网充值）故意延后**：`ClassroomService`/`NetworkService` 是 stub，未经重新决策勿实现。
- 可能的下一步：作业提交（学在浙大唯一缺的 must-have）、下载目录配置 UI。
- 2026-09-08 完成两轮修复：第一轮修「学业快览」统计卡对齐 bug（`p-4.5` 失效）；第二轮修复审查报告全部 P1–P3 遗留问题（v4 残留类名、删除死代码 Chat.tsx/Toolbox.tsx、TimetableGrid 重构为 CSS Grid、吞错日志、凭据 v2 格式+密钥缓存、preSerialization、vitest+ESLint 接入等）。各项修复细节见 **`docs/code-review-2026-09-08.md`**（已全部标注 ✅）。
- 2026-09-08 新增两个功能：①**课表导出**——课程页工具栏「导出图片/导出 Excel」（`utils/exportTimetable.ts`：html-to-image 截离屏节点出 PNG；ExcelJS 生成网格样式 xlsx，ExcelJS 仅类型引用 + 运行时 `await import` 懒加载，避免拖累课程页首屏）；网格分组/配色提取到 `utils/timetable.ts` 供网页渲染与导出共用。②**学校信息页**——抓取素质拓展平台+教务系统通知（均免登录公开接口，协议参照 `D:\Agent Program\浙大网页抓包` 项目：教务须用登录页新闻接口 `xwck_cxMoreLoginNews`，登录后的 `xwgl_*` 一律 901；素拓 `fbsj` 是 UTC ISO 转 +8；教务发布人是 `xwfbr` 不是 `fbr`），并注册 Agent 工具 `zju_get_notices`（read 级）。Electron 外链已有 `setWindowOpenHandler` → `shell.openExternal`，无需改动。
- 2026-09-08 新增**后台隐藏托管 + 系统托盘 + 桌面挂件**：`start-dev.bat` 不再弹两个终端窗口，改由 `scripts/dev-launcher.mjs` 启动 `apps/desktop` 的 **launcher 模式**（`--launcher`）：隐藏托管 `pnpm dev:server`/`dev:web`（日志 `.run/*.log`）、系统托盘（打开主界面/显示隐藏挂件/打开日志/重启服务/退出）、桌面挂件（`apps/web/widget.html` 独立入口，显示 48h 日程+待办作业）。
- 2026-09-08 晚（第三轮）：①**修挂件背景**——实测 Electron 原生亚克力在「无边框+透明+置顶」窗口上只会渲染成灰板（Electron 33/38 一致），改为**纯 CSS 半透明**并删掉材质切换；挂件尺寸 320×440 → **380×560**；实测与结论见 `docs/widget-material-comparison.md`。②**挂件 AI 对话条**——`WidgetChat.tsx` + `POST /api/agent/chat` 的 `mode: "widget"`：一次性问答、不落库、只读工具、服务端强制简短回答。③**个性化**——设置页新增「个性化」（昵称 / 头像 / 默认提示词），主页问候语与聊天头像用它，昵称与人设注入所有 AI 对话的系统提示。④修 `joinUrl` 无条件补 `/v1` 导致智谱 GLM（baseUrl `.../paas/v4`）404 的 bug。
- 2026-09-08 晚（第四轮）：**校园常识知识库**——CC98《浙江大学本科新生指引》（2026 版，93 篇 md / 830 段 / 740 KB）收进 `packages/server/knowledge/`，新增只读工具 `zju_search_guide` / `zju_read_guide`（中文 2-gram + IDF 检索）与系统提示词里的自动生成章节目录（约 400 token）；AI 回答选课/绩点/奖助/转专业/宿舍/网络/医保等浙大常识时按需检索原文，回答标注「参考《浙江大学本科新生指引》」、政策类附「以官方最新通知为准」；数据随桌面版打包（extraResources）。设计与陷阱见 §9.5、§12.16。
