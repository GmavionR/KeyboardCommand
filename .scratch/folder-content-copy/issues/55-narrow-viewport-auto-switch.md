# 55：窄窗口自动降级为单面板标签切换

Type: task
Status: open
Label: ready-for-agent

## 问题

设计基准（外部演示项目 `E:\DevProjects\LocalProjects\tauriProjects\KeyboardCommand_Folder_Copy\docs\design.md` 第 3.2 节「窄窗口自适应模型」）要求：**窗口尺寸收缩或嵌入狭窄分屏时，主工作区自动降级为单面板标签切换**，顶部保留地址栏与搜索行，工作区提供「文件树 / 当前选择 (N) / 复制历史 (N)」三个 Tab，底部复制操作栏始终吸底。

当前实现**没有自动降级**：

- `src/FolderCopyApp.tsx:137` 的 `viewportMode` 初值恒为 `'standard'`。
- 全仓库唯一写它的地方是 `src/FolderCopyApp.tsx:1037` 传给 `StatePresetBar` 的 `onToggleViewportMode`，即开发/验收用的状态预设条上那个「切换窄窗口」按钮（`src/components/folder-copy/StatePresetBar.tsx:139`）。
- 没有任何 `resize` 监听、`matchMedia` 断点或 `ResizeObserver` 参与布局决策（`matchMedia` 只在 `ThemeContext` 里用于明暗跟随）。
- `src-tauri/tauri.conf.json` 只设了初始 `width: 1280 / height: 800`，没有 `minWidth`，窗口可以被拖到任意窄。

结果：真实用户把窗口拖窄后，仍是左右 2/3 : 1/3 分栏，两栏一起被压扁；单面板模式只有开发者点预设按钮才能看到。窄窗口下的 Tab 切换与吸底 CTA 已经实现（`FolderCopyApp.tsx:1068` 分支、`narrowActiveTab` 状态），缺的只是**触发条件**。

## 待明确

- 断点取值：设计文档只给了 1280×800 标准基准，没写切换阈值，需要定一个具体像素值。
- 自动切换与手动预设按钮的关系：用户手动切过之后，窗口尺寸变化是否仍覆盖其选择。
- 是否同时给窗口设 `minWidth` / `minHeight`，避免拖到连单面板都放不下。

## Comments

- 2026-11-13：在分析 issue 44 时顺带核查发现的真实缺口，与系统设置无关，因此不并入 44，单独成票。