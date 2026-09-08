## 目标

1. 双击 `start-dev.bat` 后，前后端在后台隐藏运行，任务栏无常驻终端窗口；改由系统托盘图标控制（状态/挂件/日志/停止）。
2. Windows 11 桌面右侧显示一块 320px 宽半透明挂件，展示 48h 日程 + 待办作业，并提供**亚克力**与**CSS 半透明**两版 demo 供选择。

## 架构

给 `apps/desktop` 增加 `--launcher` 模式：**一个 Electron 进程**同时承担隐藏托管前后端 + 托盘 + 挂件窗口（不额外多开 Electron）。挂件页面作为 `apps/web` 的独立 Vite 入口 `widget.html`，绕开 Layout/Router，复用 `useUpcomingSchedule48h`、Tailwind、crisp 组件。

```
start-dev.bat → node scripts/dev-launcher.mjs（构建+端口探测+detached 启动 Electron 后退出）
                 └─ Electron：spawn 后端/前端(windowsHide, 日志→.run/*.log)
                              + Tray + 挂件窗口 + 打开浏览器
```

## 两版 Demo 的前置条件与资源

| 维度 | A 亚克力 | B CSS 半透明 |
|---|---|---|
| 系统要求 | Win11 22H2+ | 无 |
| 系统设置 | 需开启「透明效果」 | 无 |
| 视觉 | 真正模糊桌面背景 | 半透明不模糊 |
| 额外依赖 | 无（Electron 33 内置） | 无 |
| 磁盘 | 不新增下载（Electron 已存在 ~180–250MB） | 同左 |
| 内存 | 估算 150–300MB RSS，托盘与挂件同进程 | 基本相同 |

内存数字会在 P2 用 `app.getAppMetrics()` 实测并写入对比报告（仅托盘 / 托盘+挂件 / 挂件隐藏 三态）。

## 改动清单

**新增**：`scripts/dev-launcher.mjs`、`scripts/stop-dev.mjs` + `stop-dev.bat`、`apps/desktop/src/{launcher.ts,tray.ts,widget-window.ts}`、`apps/desktop/scripts/make-icon.mjs`、`apps/web/widget.html`、`apps/web/src/widget/{main.tsx,WidgetApp.tsx}`

**修改**：`start-dev.bat`（两条 `start cmd /k` → `node scripts/dev-launcher.mjs`，去 pause，保持 GBK+CRLF）、`apps/desktop/src/main.ts`（拆 runDesktopApp / runLauncher）、`preload.ts`（暴露 widgetApi）、`apps/web/vite.config.ts`（多入口）、`vite-env.d.ts`、`AGENTS.md`、`README.md`

## 关键实现

- 隐藏：`spawn(..., { windowsHide: true, stdio: ['ignore', logFd, logFd] })`；若仍有控制台一闪，回退 `WScript.Shell.Run(cmd, 0, false)`
- 端口复用：7788/5173 已 LISTENING 则跳过（沿用 bat 语义）
- 挂件窗口：`frame:false, transparent:true, resizable:false, alwaysOnTop:true, skipTaskbar:true, hasShadow:false`，`show:false`→`ready-to-show`→`showInactive()` 防黑闪、不抢焦点；开发时不自动开 DevTools（透明会失效）
- 定位：`screen.getPrimaryDisplay().workArea` 贴右边缘垂直居中，16px 边距
- 数据：单个 `useUpcomingSchedule48h`（60s 自动刷新）+ 页面内 1s 本地倒计时
- 托盘菜单：打开主界面 / 显示·隐藏挂件 / 切换材质 / 打开日志目录 / 重启服务 / 停止并退出

## 阶段

| P1 | 隐藏托管 + 托盘 + 停止脚本（不含挂件） | 零终端，托盘可控 |
| P2 | 挂件页面 + 两种材质 + 托盘热切换 + 内存实测 | 两版 Demo + 对比报告，你选材质 |
| P3 | 可选：位置记忆 / 多显示器 / 点击穿透开关 / 打包版 token 注入 | 待定 |

每阶段跑 `pnpm typecheck && pnpm lint && pnpm test` + 手工端到端验证。

## 不做

不改 Router 为 HashRouter、不动 ZJU 服务层/凭据/Agent、不做 electron-builder 打包（缺口记录在 P3）。

## 回滚

改动 = 新增文件 + main.ts 分支 + bat 两行替换；还原 bat 并删新增文件即可完全回退。