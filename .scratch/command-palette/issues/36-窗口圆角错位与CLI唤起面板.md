# 36 - 面板窗口圆角错位与 CLI 唤起/收起命令面板

Type: task
Label: ready-for-human
Status: resolved
Blocked by: 无

## 问题

第三轮桌面验收提出两项：

1. 命令面板内部 UI 的圆角（20px）与窗口边角的圆角半径不一致，两者没对齐。
2. 希望命令行执行 `kbcapp.exe <参数>` 能显示/关闭命令面板；命令行设计规则参考既有 `--route`（启动指定功能页）。

## 根因与业界做法

1. **圆角错位**：面板窗口尺寸与内容完全贴合（640×内容高），而内容投影 `0 30px 80px -20px` 向外延伸约侧向 60px / 顶部 30px / 底部 90px，被窗口矩形边界直切；同时 Win11 DWM 对无装饰透明窗口施加默认约 8px 圆角（tao 仅用 DWM 设置暗色模式，未设 corner preference），被切出的投影光晕边角呈 8px 圆角，与内容 20px 圆角错位可见。业界做法（WPF 无边界启动器窗口，如 Flow Launcher / PowerToys Run 一类）：透明窗口内为投影预留透明外扩边距，使窗口自身边界与圆角落在完全透明区域（参见 StackOverflow「DropShadow for WPF Borderless Window」等）。
2. **CLI**：沿用 Tauri 单实例插件转发第二实例 argv 的官方模式（本仓库 `--route` 已采用），新增同风格 `--palette` 旗标，而非引入 clap 等新依赖。

## 决定与实现

1. **透明外扩边距**（`CommandPalette.tsx` / `tauri.conf.json`）：
   - 常量 `GUTTER_X=64 / GUTTER_TOP=32 / GUTTER_BOTTOM=96`（覆盖投影延伸），wrapper 加 `px-16 pt-8 pb-24`；窗口宽 `640+128=768`，高 `内容高+128`；conf 初始尺寸 768×608。
   - layout effect 与 ResizeObserver 的 `setSize` 统一加外扩量；卡片仍 640 宽、20px 圆角，视觉不变。
   - 窗口边角落在全透明区 → DWM 圆角不可见、投影不再被切 → 只剩内容 20px 圆角，对齐问题消除。
   - 点击外扩透明区沿用「面板外点击即隐藏」（wrapper `onMouseDown` target 判定天然覆盖）。
   - Rust 居中逻辑不变（按 `outer_size` 居中，卡片水平仍居中；垂直因顶边距下移 32px，处于 20% 屏高定位容差内）。
2. **CLI `--palette`**（`src-tauri/src/lib.rs`，解析风格与 `--route` 一致）：
   - 形式：`--palette`（缺省 toggle）、`--palette show|hide|toggle`、`--palette=show|hide|toggle`；重复指定或非法模式返回与 `--route` 同风格的中文错误（经 `activation-request` 提示）。
   - `ActivationRequest` 增加 `palette: Option<String>` 与 `#[serde(skip)] route_explicit: bool`（IPC payload 不变）。
   - 单实例回调：仅 `--palette` 时**不置前/聚焦主窗口**（主窗口抢焦点会触发面板 `Focused(false)` 自动隐藏），直接 `apply_palette_action`；与 `--route` 组合时先置前主窗口并 emit 路由请求，再执行面板动作。
   - 首启动携带 `--palette` 且无 `--route`：隐藏主窗口（launcher 语义，托盘仍可唤出），再执行面板动作；setup 末尾应用。
   - 前端挂载时若 `document.hasFocus()` 补一次输入框聚焦，覆盖「窗口先于 React 挂载获焦」的首启动竞态。
   - 新增 5 个解析单测（缺省 toggle、等号/空格模式、不吞后续旗标、非法模式、重复指定）。

## 验证

- `cargo test --lib`：33 通过 0 失败（含 5 个新 CLI 测试）；`bun run build` 零错误。
- ego-browser + Tauri 桩（round-06）：满清单窗口 768×608、卡片 640×480、四边外扩 64/32/64/96；过滤态 768×399；失焦 150ms 内收敛 608；获焦零新增 `set_size`、零重挂载、输入框聚焦；点击外扩透明区隐藏面板。
- 本轮 CDP 截图通道超时不可用；且圆角错位属 DWM 层现象，浏览器截图本就无法呈现——真机观感与 CLI 行为（含单实例转发、首启动 launcher 语义）由用户桌面验收。

## Comments

- 2026-11-20：实现与机器验证完成，Status 置 resolved；待桌面验收确认圆角观感与 CLI 全链路。
- 2026-11-20：用户桌面验收通过（含 issue 37 修订后的一体感与可读性），本 issue 关闭。