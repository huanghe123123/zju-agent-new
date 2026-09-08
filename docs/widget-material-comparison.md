# 桌面挂件背景：实测结论与最终选型

> 结论（2026-09-08 实测）：Windows 11 25H2（build 26200）上，Electron 的
> `backgroundMaterial('acrylic')` 在**无边框 + 透明 + 置顶**窗口上只会渲染成纯灰 `#545454`，
> 做不出桌面模糊。挂件最终采用**纯 CSS 半透明**：桌面内容透出，但不模糊。

## 一、为什么原生亚克力不可用（像素探针实测）

方法：在被测窗口正上方铺一个「左红右蓝」的置顶底图窗口，截屏后统计被测窗口区域左右两半的
红色通道均值（`redDelta`）。能透出背景 → redDelta 很大；不透明/灰板 → redDelta ≈ 0。

| 窗口参数 | 截到的主色 | redDelta | 说明 |
|---|---|---|---|
| 对照（只有红蓝底图） | 左 223 / 右 242 | 181 | 截屏链路正常 |
| `transparent:true` + acrylic + **置顶** | 84,84,84 | 0 | 纯灰 `#545454`，即用户看到的灰板 |
| `transparent:true` + acrylic + 不置顶 | 左红 / 右蓝 | 181 | 材质完全未生效，只是透明 |
| `transparent:false` + acrylic + 带边框 | 只有标题栏有色 | — | 客户区依旧不透明 |
| `transparent:true` + 不调用材质 | 左红 / 右蓝 | 181 | 透明窗口本身正常透出 |

- Electron **33.4.11 与 38.8.6 结果一致**；窗口被激活（focused=true）也不改变结论。
- 系统「透明效果」已开启（`HKCU\...\Themes\Personalize\EnableTransparency = 1`），
  不是系统设置问题；参考上游 issue
  [#49443](https://github.com/electron/electron/issues/49443)（acrylic 只在 transparent 时生效）
  与 [#48031](https://github.com/electron/electron/issues/48031)（Win11 24H2 上材质不稳定）。

## 二、另外两条路也试过

1. **实时截屏模糊（真·亚克力）**：Electron 自带的 `desktopCapturer` 在本机返回的是**冻结画面**
   ——把窗口内容从洋红改成绿色，两次截到的像素完全相同；PowerShell 的 `CopyFromScreen`
   正常但每次约 300–500ms，常驻截屏开销大，还要处理挂件被自己截进去的反馈问题。
2. **壁纸模糊（Mica 风格）**：读取 `%APPDATA%\Microsoft\Windows\Themes\TranscodedWallpaper`，
   按屏幕位置裁剪后高斯模糊，零运行时开销；缺点只能反映壁纸，不反映面板后面的窗口。

## 三、最终方案：纯 CSS 半透明

- 窗口：`frame:false, transparent:true, backgroundColor:'#00000000'`，**不调用任何材质 API**。
- 页面：`bg-slate-900/60` + `ring-1 ring-white/10`，桌面内容直接透出（清晰、不模糊）。
- 尺寸：**380×560 DIP**，贴主屏右边缘垂直居中，边距 16 DIP；创建时把计算出的位置写进
  `.run/launcher.log`（`[widget] 位置 (x, y)…`），方便排查摆放问题。
- 实测资源占用（2026-09-08，2 次采样）：托盘 + 挂件稳态约 **420MB**（4 个 Electron 进程），
  与材质无关；挂件前端产物约 10KB。

## 四、如果以后还想要模糊

- 换 Electron 版本前，先重跑本文的像素探针（`.run/acrylic-probe/`，不入库）确认材质是否恢复。
- 或改走「壁纸模糊」路线，需要额外处理壁纸适配模式（Fill/Fit/Center/Tile）与多显示器。
