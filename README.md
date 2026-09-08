# zju-agent — 浙大校园智能助手

本地优先的浙江大学校园智能 Agent。用户配置「大模型来源 + API Key + ZJU 统一身份认证账号密码」，通过 Web 界面 + 智能体完成校园事务查询与操作。

> 项目规范见 [`ZJU_CAMPUS_AGENT_PROJECT.md`](./ZJU_CAMPUS_AGENT_PROJECT.md)

## 架构

```text
User
  │
  ▼
React Web UI (apps/web)
  │  (HTTP + 本地访问 token，绝不直连校园服务)
  ▼
Local API Server (packages/server, Fastify, 127.0.0.1)
  ├── LLM Adapter (packages/llm) — 兼容 OpenAI / Anthropic，支持 tool calling + 流式
  ├── Agent Tool Registry — 查询类直接执行，高风险工具需用户确认
  ├── ZJU Service Modules (packages/zju-services)
  │     └── npm 包 login-zju → 统一身份认证 + 学在浙大/教务网/智云课堂
  └── Local Storage
        ├── SQLite (conversations / cache / downloads / reminders / audit_logs)
        └── 加密凭据文件 (ZJU 密码 / LLM API Key)
```

关键原则：
- 前端只与本机 API 通信，不直连校园服务域名。
- 前端不保存 ZJU 密码、cookie、LLM API Key。
- 本地后端通过 npm 包 `login-zju` 接入浙江大学统一认证。
- 所有可被大模型调用的功能都注册为工具；工具标注风险等级；高风险工具必须经用户确认。
- 本地 API 只绑 `127.0.0.1`，启动生成访问 token。

## 技术栈

- **前端**：React 18 + Vite + TypeScript + React Router + TanStack Query + Zustand + Tailwind
- **后端**：Node.js 20+ + TypeScript + Fastify + Zod + better-sqlite3 + `login-zju`
- **LLM**：自研轻量适配层（OpenAI Chat Completions / Anthropic Messages，tool calling + 流式）
- **Monorepo**：pnpm workspace

## 目录结构

```text
apps/
  web/                  React + Vite 前端
packages/
  core/                 平台无关核心类型（领域模型 / API envelope / 错误码 / 工具定义）
  server/               Fastify 本地 API 服务
  llm/                  大模型适配层（OpenAI / Anthropic adapter）
  zju-services/         校园服务适配层（封装 login-zju）
  storage/              存储与平台能力桥抽象（为 Electron/Capacitor 预留）
  scheduler/            提醒与定时任务抽象
```

## 开发

### 环境要求

- Node.js 20+
- pnpm 9+（`npm i -g pnpm`）

### 安装与启动

**Windows 一键启动（推荐）**：双击根目录 `start-dev.bat`。

它会自动完成环境检查、依赖安装，然后把前后端**在后台隐藏托管**（不弹出终端窗口），
并拉起系统托盘与桌面挂件，服务就绪后自动打开浏览器。

- 托盘图标右键：打开主界面 / 显示·隐藏挂件 / 打开日志目录 / 重启服务 / 退出
- 桌面挂件：贴在屏幕右侧的半透明面板（380×560），显示未来 48 小时日程与待办作业（每分钟自动刷新），
  底部可以直接问 AI——只走只读查询、服务端强制简短回答，且不写入聊天历史
- 停止服务：双击 `stop-dev.bat`，或托盘菜单「退出」
- 运行日志：`.run/server.log`、`.run/web.log`、`.run/launcher.log`

**手动启动（跨平台 / 调试用）**：

```bash
pnpm install

# 终端 1：启动本地后端（默认 127.0.0.1:7788）
pnpm dev:server

# 终端 2：启动前端（默认 5173，已代理 /api 到后端）
pnpm dev:web
```

打开浏览器访问 http://localhost:5173，前端会自动连接本地后端。

> 开发期后端会经 `/api/bootstrap` 下发访问 token 给前端；生产期需由 Electron 注入或文件读取。

### 个性化

设置页 →「个性化」可以配置昵称、头像与默认提示词：主页问候语与聊天头像会使用它们，
昵称和提示词会注入所有 AI 对话（网页聊天与桌面挂件），让回答更贴合你的年级/专业/兴趣。
头像在前端压缩到 256×256 后仅存本机 SQLite，不上传。

### 校园常识知识库

内置 CC98《浙江大学本科新生指引》（2026 版）作为 AI 的背景知识：选课规则与抽签机制、
课程考核与绩点、奖助学金、专业确认与转专业、培养方案、宿舍园区、校园网、图书馆、就医医保、
军训、社团等。AI 只在需要时检索原文片段（不会把全文塞进上下文），回答会标注
「参考《浙江大学本科新生指引》」，涉及政策时提醒以学校官方最新通知为准。

- 数据在 [`packages/server/knowledge/`](packages/server/knowledge/)，来源与许可见其中的 `ATTRIBUTION.md`
- 更新：用上游新版 markdown 覆盖同名文件即可，无需改代码
- 自定义目录：设置环境变量 `ZJU_AGENT_KNOWLEDGE_DIR` 指向自己的知识库目录

### 桌面挂件背景

挂件用**纯 CSS 半透明**（桌面内容透出、不模糊）。Windows 11 + Electron 的原生亚克力材质在
「无边框 + 透明 + 置顶」窗口上只会渲染成灰板，实测过程与替代方案（壁纸模糊 / 实时截屏模糊）
见 [`docs/widget-material-comparison.md`](docs/widget-material-comparison.md)。

### 构建

```bash
pnpm build
```

## 跨平台规划（第二阶段）

- **Windows 桌面**：Electron 主进程启动 `packages/server`，renderer 复用 `apps/web` 构建产物，`electron-builder` 打包。当前 `apps/desktop` 的 `--launcher` 模式已用于开发期隐藏托管前后端 + 托盘 + 桌面挂件。
- **Android**：Capacitor 复用 `apps/web`，Node 本地服务以插件或自托管后端形式接入。
- 平台相关能力（打开文件夹、系统通知、文件选择）通过 `PlatformBridge` 抽象，不写死在业务层。
