# AGENTS.md — 项目导航文档（供 AI 助手快速理解本仓库）

> 本文档面向后续被调用的 AI 编码助手，目标是不经探索即可理解项目全貌。内容基于 2026-09-08 的代码状态（含当日第二轮修复后的更新）。
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

- Windows 用户可直接双击根目录 **`start-dev.bat`** 一键启动（环境检查→装依赖→起前后端→开浏览器，带端口占用防重复启动）。注意：该文件是 **GBK 编码 + CRLF**（cmd 中文必需），勿用编辑器另存为 UTF-8。
- `pnpm dev` 会并行跑所有包的 dev，一般不需要；日常用上面两条 dev 命令或 bat。
- **测试已接入**（vitest 2.1.9，根 `vitest.config.ts` 收集 `packages/*/src/**/*.test.ts` 与 `apps/*/src/**/*.test.{ts,tsx}`）。现有 3 个套件 26 例：`packages/core/src/domain/zdbk.test.ts`（mergeTimetableEntries）、`apps/web/src/__tests__/compressWeeks.test.ts`、`packages/server/src/auth/credentials.test.ts`（加密往返/v2 格式）。新增纯函数时应配套 `*.test.ts`。
- **ESLint 已接入**（eslint.config.js：typescript-eslint recommended + react-hooks + tailwindcss `no-custom-classname`，后者可拦截 v3 下不存在的类名如 `p-4.5`）。改完代码跑 `pnpm lint`。注意 `no-custom-classname` 白名单里有 `fa-fw`（FontAwesome）和 `input`（Settings.tsx 内联样式）两个非 Tailwind 类。
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
├── eslint.config.js           ← ESLint 9 flat config（根）
├── vitest.config.ts           ← vitest 配置（根，收集各包 *.test.ts）
├── tsconfig.base.json         ← 全仓共享 TS 配置（见 §11 约定）
├── pnpm-workspace.yaml / .npmrc / pnpm-lock.yaml
├── apps/
│   ├── web/                   ← React SPA（唯一前端）
│   └── desktop/               ← Electron 壳（main.ts / preload.ts，esbuild 打包脚本 + electron-builder.yml）
├── packages/
│   ├── core/                  ← 平台无关共享类型（仅依赖 zod）
│   ├── server/                ← Fastify 应用（路由/Agent 循环/存储/认证）
│   ├── llm/                   ← LLM 适配层（OpenAI/Anthropic）
│   ├── zju-services/          ← login-zju 封装 + 领域适配器
│   ├── storage/               ← 预留抽象缝（近空，未来 Electron/Capacitor 原生后端）
│   └── scheduler/             ← 预留抽象缝（近空）
└── docs/
    ├── celechron-schedule-reference.md   ← 校历课表格式参考
    └── code-review-2026-09-08.md         ← 代码审查报告（全部问题已修复，含各项修复说明）
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
| `settings.ts` | 设置项类型 |
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
| `/api/files` | `routes/files.ts` | 下载管理/预览 |
| `/api/agent` | `routes/agent.ts` | 聊天/确认/会话管理（SSE） |

`server.ts` 的 `onSend` 钩子通过字符串嗅探 `{"ok":false` 再反解 JSON 映射错误码→HTTP 状态码（脆弱模式，改错误处理时留意）。

### 9.2 Agent 系统（`src/agent/`）

- `tools.ts`（740 行）：`buildTools(deps)` 注册工具，每个带 `riskLevel`（`read` / `write` / `payment` / `external_download`）与 `requiresConfirmation`。`read` 直接执行；高风险工具进 `pending_confirmations`（**5 分钟 TTL**），用户经 `POST /api/agent/confirm` 批准后才执行。
- `loop.ts`（443 行）：`AgentLoop` 最多 **8 轮**迭代：流式调 LLM → 收集文本+tool_calls → 持久化 assistant 消息 → 执行工具（或停在确认点）→ 结果回喂。`resumeAfterConfirm`/`resumeAfterReject` 恢复暂停的循环。Provider 取加密设置 `model-providers` 中第一个 `enabled` 条目。
- 聊天走 **SSE**：`POST /api/agent/chat` 与 `/confirm` 以 `data: <json>\n\n` 流式推送事件；会话与消息持久化到 SQLite（`conversations`/`messages` 表），重连可恢复。

### 9.3 存储（`src/storage/`，SQLite 表）

`db.ts`（连接+WAL）、`conversations.ts`（会话+消息）、`downloads.ts`（下载记录）、`settings-repo.ts`、`audit.ts`（审计日志）、`confirmations.ts`（待确认工具调用）、`cache.ts`（ZJU 响应缓存）。`services.ts` 是服务容器（所有 repo + ZjuServices + CalendarService）。

### 9.4 其他

`config/env.ts`（端口/数据目录）、`config/logger.ts`、`middleware/auth.ts`、`auth/auth-session.ts`（AuthSessionManager）、`auth/credentials.ts`（加密凭据库）、`util/download.ts`、`util/rate-limit.ts`（Map 不过期清理，本地应用影响小）。

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
| `/downloads` | `pages/Downloads.tsx` | 下载记录 + 预览抽屉 |
| `/classroom` | `pages/Classroom.tsx` | 占位页（10 行） |
| `/settings` | `pages/Settings.tsx` | 设置（凭据/模型/下载目录） |

### 11.2 组件（`src/components/`）

- `Layout.tsx`（235 行）：应用外壳——侧边栏、底部导航（移动端）、右面板、挂载 FloatingChat。
- `FloatingChat.tsx`：**全局悬浮 AI 聊天窗**（唯一在用的聊天实现）。拖拽移动、最小化、展开、工具步骤实时展示、风险操作确认。
- `TimetableGrid.tsx`：课表网格（**CSS Grid 显式定位**：`gridTemplateColumns: 48px + 7×1fr`，`gridTemplateRows: 32px + 13×minmax(48px, auto)`；格子按 `gridColumn`/`gridRow` 精确放置负责画线，课程块用 `gridRow: span N` 跨行随行高伸缩；同格多门课 flex 并排）。**勿改回绝对定位手算高度的方案**（已根除的漂移 bug）。导出 `compressWeeks`（周次压缩）。
- `ServerStatusBanner.tsx` / `ErrorBoundary.tsx` / `ErrorState.tsx` / `Loading.tsx`。

### 11.3 Dashboard 五大区块

工作区头部（欢迎语/学生信息）→「接下来」（Segmented 切换 日程/作业，未来 48 小时）→「学业快览」四张 KPI 卡（课程数/待办作业/考试/下载）→「校园百宝箱」工具矩阵 →「系统与连接状态」。

### 11.4 API 层（`src/api/`，TanStack Query hooks）

- `bootstrap.ts`：token 存取（zustand store + localStorage）、`useApiFetch()`、`useTokenUrl()`（二进制资源 `?token=`）。
- `zju.ts`：`useSemesters` / `useCourses` / `useMaterials` / `useCourseAssignments` / `useCourseQuizzes` / `useAllAssignments` / `useDownloadMaterial` / `useDownloads` / `useDeleteDownload` / `downloadPreviewUrl` / `useExams` / `useTimetable` / `useGrades` / `useUpcomingSchedule48h`。
- `agent.ts`：`useConversations` / `useConversation` / `useSendMessage`（SSE）/ `useConfirmTool` / `useDeleteConversation`，`AgentEvent` SSE 事件类型。
- `auth.ts`：`useAuthStatus` / `useValidateCredential` / `useLogout`。

### 11.5 状态与其他

`stores/useFloatingChat.ts`（zustand：开/关/最小化/展开/位置/预填 prompt/活跃会话）；`utils/format.ts`、`utils/sanitizeHtml.ts`；`styles/global.css`（仅 Tailwind 指令）；`main.tsx` 引入 `@crisp-ui-kit/crisp/styles.css` 并挂全局 ErrorBoundary；`vite.config.ts` 代理 `/api` → `ZJU_AGENT_BACKEND ?? http://127.0.0.1:7788`，`base: "./"`（便于 Electron 复用）。

## 12. 编码约定与已知陷阱（违反必出 bug）

1. **相对导入必须带 `.js` 后缀**：`tsconfig.base.json` 用 `moduleResolution: Bundler` + `verbatimModuleSyntax`，所以 `import ... from "./server.js"`（源码是 `.ts`）。全 strict：`noUncheckedIndexedAccess`（索引访问返回 `T|undefined`）、`noImplicitOverride`、`noUnusedLocals/Parameters`。
2. **`wrap()` 双层信封陷阱**（真实生产 bug）：路由统一返回 `{ok,data}/{ok,error}`。`wrap(async () => …)` 已包一层——**在 wrap 内 return 原始值，绝不 `return ok(x)`**；`ok()` 只用于纯同步 handler。写错会双层嵌套，前端解一层拿到 `{ok,data}` 而非数组，`.map` 抛错白屏。新路由判断：`await`+抛 `AppError` → `wrap()` 返回裸数据；纯同步 → 直接 `return ok(data)`。
3. **前端查询错误处理模式**：`useCourses`/`useExams`/`useTimetable`/`useAllAssignments` 等统一 `retry: false, throwOnError: false`，消费端 `data ?? []`。保持此模式，query 未捕获抛错会炸掉路由子树（全局 ErrorBoundary 在 main.tsx）。
4. **fileId 陷阱**：学在浙大文件同时有 `id`（上传 id）和 `reference_id`；下载端点 `/api/uploads/{id}/blob` 要**上传 id**，永远用 `f.id`（早期 `referenceId ?? id` 导致 404）。Office 文件（.docx/.pptx/.xlsx）传 `officePdf: true` 取 PDF 预览版。
5. **教务网学期映射**：zdbk 的 StuId = 浙大凭据用户名；学期经 `semesterToXnxq01id`/`activeXnxq01ids` 映射。正方课表端点双候选路径探测，真账号测试为空时对照原始响应调 `toTimetableEntry` 字段名。
6. **Tailwind 是 v3.4，不是 v4**：v4 专属类名会**静默失效**（无报错）。写样式时只用 v3 刻度：间距 4→5（无 4.5），阴影 `shadow-sm`~`shadow-2xl`（无 xs/2xs/3xl），圆角最小 `rounded-sm`（无 `*-xs`）。**防线已接入**：`eslint-plugin-tailwindcss` 的 `no-custom-classname` 规则会在 lint 时报错拦截；另外项目**未装** typography 插件，`prose`/`prose-xs` 等类同样是无效的。
7. **crisp-ui-kit 的 `<Card>` 自身零内边距**：padding 必须自己传（如 `className="p-4"`）；`.card-body` 类未使用。
8. **login-zju 的 console 泄密**：见 §8 `runQuiet`，勿绕过。
9. **`start-dev.bat` 是 GBK 编码**：中文 bat 在中文 Windows 上必须 GBK+CRLF，UTF-8 会导致 cmd 解析错乱。

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
