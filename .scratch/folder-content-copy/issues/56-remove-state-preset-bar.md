# 56：删除交互状态验证条，收尾首版

Type: task
Status: resolved
Label: ready-for-agent

## 问题

页面顶部长期挂着一条开发/验收专用的「交互状态验证」条（`src/components/folder-copy/StatePresetBar.tsx`），包含：

- 三个布局按钮：「自动（按窗宽）」「强制标准左右分栏 (2/3 : 1/3)」「强制窄窗口单面板」。
- 11 个状态预设按钮：1.正常状态 … 11.右键复制单文件。
- 「布局决议」按钮，打开 `HelpModal`——一份把 issue 32 决议原文贴进界面的说明弹窗。
- 「收起」折叠开关。

它是 issue 46 从外部 playground 迁入应用时一并带过来的**验收脚手架**，不是产品功能：

- 真实用户不需要、也不应该能手动强制布局或伪造界面状态。
- 它占掉标题栏下方一整行垂直空间，把真实工作区往下挤。
- 「布局决议」弹窗的内容是设计决议文档，属于 `.scratch/` 与 `docs/design/`，不该出现在产品界面里。
- issue 44 已经把系统设置里的假状态全部诚实化，这条预设条是界面里最后一处「演示态」入口，留着与首版口径矛盾。

用户明确要求：「1. 这部分删除 2. 首版功能收尾」（附截图指向整条验证条）。

## 答案

**整条删除，不保留折叠态、不保留任何入口。** 具体：

- 删除 `src/components/folder-copy/StatePresetBar.tsx`。
- 删除 `src/components/folder-copy/HelpModal.tsx`。它唯一的入口是预设条上的「布局决议」按钮，删条后即成孤儿；内容是纯设计决议文档，已经在 issue 32 与 `docs/design/文件夹复制界面绘制说明.md` 里，无需在应用内再存一份。
- `src/components/folder-copy/index.ts` 去掉这两个 barrel 导出。
- `src/FolderCopyApp.tsx`：
  - 删 `handleSelectPreset`（约 90 行 switch）与 `currentPreset` / `presetEmptyHistory` / `presetSearchQuery` / `isHelpOpen` 四个状态。
  - 删 `visibleHistoryList` 派生值（它唯一的作用是让「无历史记录」预设假装历史为空），两处 `historyList={visibleHistoryList}` 改回 `historyList={historyList}`，历史面板从此只反映磁盘真实记录。
  - 删 `viewportOverride`，布局改为纯派生：`const viewportMode = isWideViewport ? 'standard' : 'narrow';`。issue 55 的 `matchMedia` 自动判定原样保留，只是不再能被手动锁死。
  - 删 `<StatePresetBar>` 与 `<HelpModal>` 两处 JSX，并把后续区块编号注释重排为连续的 1–8。
- `src/components/folder-copy/SearchBar.tsx`：删 `presetQuery` prop 及其 `useEffect`。搜索框现在只接受用户输入，500ms 防抖与真实 fd 调用不变。
- `src/App.tsx`：删掉那段已经不成立的注释（「playground UI … data and clipboard behavior are mock implementations that later Rust tickets replace」），并把 `PlaygroundFolderCopyApp` 这个别名改回 `FolderCopyApp`。全部数据与剪贴板早已由 Rust 实现，命名和注释不该再说是 mock。

**没有删除任何真实功能**：三态勾选、全选符合规则、清空、单项移除、复制路径、预览、复制上下文包、历史筛选、窄窗口三 Tab、吸底 CTA 全部保留。删掉的只是「绕过真实数据直接摆布界面」的能力。

删除后 `src/` 全树 grep `mock|Mock|模拟|演示|假数据|TODO|FIXME|占位` 与 `preset|Preset|HelpModal|状态预设|交互状态验证|布局决议` 均为 0 命中。

## 验收记录

机器证据（已完成）：

- `bun run build`（`tsc && vite build`）通过：2181 modules，`dist/assets/index-*.js` 458.87 kB。
- `cargo test --lib`：**27 passed; 0 failed**。
- 浏览器运行时回归（沿用 issue 55 的 CDP IPC 桩，未改动应用代码；桩返回演示数据，只证明渲染与交互）：
  - **预设条确实消失**：1280 / 1024 / 1023 / 900 / 480 五个宽度下，页面文本均不含「交互状态验证」「布局决议」「自动（按窗宽）」「强制窄窗口单面板」「右键复制单文件」。标题栏下一行直接是地址栏。
  - **自动降级未被破坏**：1280 → 双栏；1024 → 双栏；1023 → 单面板；900 → 单面板；480 → 单面板。断点仍精确落在 1024px。
  - 各宽度 `scrollWidth - clientWidth` 均为 **0**，底部「复制文件上下文包」按钮全部在视口内可见。
  - 窄窗口三 Tab 仍真的换面板：文件树 →「选择要浏览的文件夹」；当前选择 →「已选择文件 (0)」；复制历史 →「复制历史 (0 / 上限 20)」；再点文件树正确回位。
  - **主流程端到端**（1280 双栏）：加载目录 → 未勾选时 CTA `disabled === true`、提示「勾选文件后方可生成文件上下文包」；勾一个文件 → CTA 启用、底栏「当前选中：1 个文件」、选择清单出现「从当前选择中移除」；点「全选符合规则」→ 5 个文件、`共 5 个文件待打包 ~72.4 KB`、5 个移除按钮；点「清空」→ 回到 0 且 CTA 重新禁用。
  - 两轮 `console` 错误数均为 **0**。
- 截图仍不可得（同 issue 55 记录的 `Page.captureScreenshot` 导航未提交问题），视觉观感归用户桌面验收。

用户桌面验收（待执行）：

- 打开应用，标题栏下方直接是地址栏，不再有「交互状态验证」条。
- 拖窄窗口跨过 1024px 自动变单面板，拖回宽处自动恢复双栏。
- 勾选 / 全选 / 清空 / 单项移除后，底栏数量与复制按钮禁用态同步变化。

## Comments

- 2026-11-13：用户看截图后直接要求删除并收尾首版，同日完成删除、构建、测试与浏览器回归。
- 本票是首版最后一张实现票据。`map.md` 的「尚未决定的 Issue」现在只剩 [issue 54](54-autostart-notification-and-global-hotkey.md)（开机自启、桌面通知、系统级全局快捷键），已明确排在首版范围外。