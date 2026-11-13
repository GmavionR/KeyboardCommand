# 55：窄窗口自动降级为单面板标签切换

Type: task
Status: resolved
Label: ready-for-agent

## 问题

设计基准（外部演示项目 `E:\DevProjects\LocalProjects\tauriProjects\KeyboardCommand_Folder_Copy\docs\design.md` 第 3.2 节「窄窗口自适应模型」）要求：**窗口尺寸收缩或嵌入狭窄分屏时，主工作区自动降级为单面板标签切换**，顶部保留地址栏与搜索行，工作区提供「文件树 / 当前选择 (N) / 复制历史 (N)」三个 Tab，底部复制操作栏始终吸底。

实现前**没有自动降级**：

- `src/FolderCopyApp.tsx` 的 `viewportMode` 初值恒为 `'standard'`。
- 全仓库唯一写它的地方是传给 `StatePresetBar` 的回调，即开发/验收用的状态预设条上那个「切换窄窗口」按钮。
- 没有任何 `resize` 监听、`matchMedia` 断点或 `ResizeObserver` 参与布局决策（`matchMedia` 只在 `ThemeContext` 里用于明暗跟随）。
- `src-tauri/tauri.conf.json` 只设了初始 `width: 1280 / height: 800`，没有 `minWidth`，窗口可以被拖到任意窄。

结果：真实用户把窗口拖窄后，仍是左右 2/3 : 1/3 分栏，两栏一起被压扁；单面板模式只有开发者点预设按钮才能看到。窄窗口下的 Tab 切换与吸底 CTA 早已实现，缺的只是**触发条件**。

## 答案

- **断点取 1024px**，即 Tailwind 的 `lg`。低于它时右侧 1/3 栏不足 330px（内容区宽 = 窗宽 − 36，右栏取其 1/3），选择清单的行内按钮与历史卡片开始挤压。用业界既有断点而不是自造魔数。
- **用 `matchMedia('(min-width: 1024px)')` 驱动**，沿用 `ThemeContext` 跟随系统明暗的同一写法（`addEventListener('change')` + 卸载时移除），不引入 `ResizeObserver`、不新增依赖、不逐像素 setState。
- **布局改为派生值**：`viewportMode = viewportOverride ?? (isWideViewport ? 'standard' : 'narrow')`。`isWideViewport` 由媒体查询维护，`viewportOverride` 默认 `null`。（`viewportOverride` 已随 [issue 56](56-remove-state-preset-bar.md) 删除，现在是纯派生 `isWideViewport ? 'standard' : 'narrow'`。）
- **手动覆盖仍可逆**：评测条从两个按钮改为三个——「自动（按窗宽）」「强制标准左右分栏」「强制窄窗口单面板」。点强制即写覆盖，点自动即清空；此外**窗口宽度跨越断点时也自动清除覆盖**，避免开发者点过一次就把自适应永久锁死。折叠态的提示文字同步显示「（按窗宽自动）」或「（手动覆盖）」。（整条评测条已随 issue 56 删除，本条只保留作历史记录。）
- 回调类型从 `(mode: 'standard' | 'narrow') => void` 改为 `(mode: 'standard' | 'narrow' | null) => void`， prop 更名 `onToggleViewportMode` → `onSelectViewportMode`（三个选项不再是 toggle）。
- **未加 `minWidth` / `minHeight`**：实测 480px 宽仍无横向溢出、CTA 可见，没有必须限制最小尺寸的证据，不顺手加约束。若后续在更窄尺寸下发现不可用，再单独提。

## 验收记录

机器证据（已完成）：

- `bun run build`（`tsc && vite build`）通过。
- **在真实浏览器里跑通了运行时验证**。此前 issue 44 记录「浏览器内检视不可行」（`src/main.tsx` 先 await 两个 Tauri IPC 才 render），本次用 CDP `Page.addScriptToEvaluateOnNewDocument` 注入一份 Tauri IPC 桩绕过该限制，**未改动任何应用代码**。桩返回的是演示数据，因此只证明渲染、布局与交互，不证明真实文件系统/数据库结果。
- 断点精确：1280 → 双栏；**1024 → 双栏；1023 → 单面板**；900 → 单面板；480 → 单面板。回宽同样正确恢复。
- 各宽度下 `document.documentElement.scrollWidth - innerWidth` 均为 **0**（无横向溢出），底部「复制文件上下文包」按钮在 480 / 900 / 1024 / 1280 全部可见且在视口内。
- 窄窗口三个 Tab 真的换面板：文件树 → 「选择要浏览的文件夹」；当前选择 → 「已选择文件 (0) / 当前无任何勾选文件」；复制历史 → 「复制历史 (0 / 上限 20) / 暂无复制历史记录」；再点文件树正确回到树。
- 手动覆盖：1280 下点「强制窄窗口单面板」→ 变单面板且「自动」按钮不再高亮；缩到 900 跨越断点后覆盖被清除、「自动」恢复高亮；900 下点「强制标准左右分栏」→ 变双栏，再点「自动（按窗宽）」→ 立刻回到单面板。
- 顺带复核 issue 44 的弹窗（同一桩环境，480px 宽）：显示 `v0.1.0`、`Tauri 2.9.5`、`已连接 (WAL)`、`3 / 20 条`；「检查更新（不可用）」`disabled === true`，该分组内成功色横幅数量为 **0**；无自启与通知开关；分组标题为「应用内快捷键与界面行为」；弹窗宽度不超过视口且内容区可滚动。

排查过程中的两个坑（都不是应用缺陷，记录以免重踩）：

- **IPC 桩只在注入它的那次 ego-browser 进程内有效**。跨进程复用同一标签页时，一旦重新 `goto` 桩就没了，页面又变空白。把桩抽成共享模块，每轮重新注入后正常。
- **`Emulation.setDeviceMetricsOverride` 后媒体查询 change 事件可能延迟到达**。固定等 500ms 会读到旧状态，误判「覆盖没被清除」；加挂 `matchMedia` 与 `resize` 日志后确认事件确实到达、只是晚于 500ms，再等 1200ms 状态即正确。最终验证改用 `waitForFunction` 等目标状态而不是固定延时。
- **截图始终失败**：`Page.captureScreenshot` 报「有主框架导航已发起未提交」，换新标签页、去掉尺寸模拟后仍然如此；应用源码内无任何导航触发点（只有 `SettingsModal` 里的 `#` 锚点，且启动时未打开）。因此本次没有截图证据，视觉观感仍归用户桌面验收。

用户桌面验收（待执行）：

- 拖动窗口边框由宽变窄，跨过 1024px 时自动变单面板；拖回宽处自动恢复双栏。
- 窄窗口下三个 Tab 切换正常，底部复制按钮始终可点。
- 评测条点「强制…」后布局立即改变，再点「自动（按窗宽）」立即回到按窗宽判定。（该条已随 issue 56 删除，此项不再需要验收。）

## Comments

- 2026-11-13：在分析 issue 44 时顺带核查发现的真实缺口，与系统设置无关，因此不并入 44，单独成票；同日实现并验证完成。
- 设计文档只给了 1280×800 标准基准，没写切换阈值，1024px 是实现时按右栏最小可用宽度选定并记入本票据的。
- 2026-11-13：[issue 56](56-remove-state-preset-bar.md) 删除整条评测条后，本票的手动覆盖设计随之作废，自动断点判定原样保留并已重新回归（1024 双栏 / 1023 单面板）。