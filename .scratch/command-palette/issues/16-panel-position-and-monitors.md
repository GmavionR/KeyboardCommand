# 16：面板的位置、尺寸、多显示器与 DPI

Type: grilling
Status: open
Label: needs-triage
Blocked by: 10

## 问题

页内遮罩形态下，面板在窗口内居中即可（现有弹窗都是 `flex items-center justify-center`）。但独立窗口形态需要决定它在**屏幕**上的位置：

- **位置**：屏幕正中，还是水平居中、垂直偏上（Spotlight / Raycast 风格，约屏幕高度 20–25% 处）？
- **多显示器**：跟随**鼠标所在屏**、**当前焦点窗口所在屏**，还是固定在主屏？
- **尺寸**：固定宽度（如 640–720px）还是按屏宽比例？高度随结果数增长到上限后滚动，还是固定高度？
- **DPI 缩放**：Tauri 的逻辑像素与物理像素在混合 DPI 多屏下的定位坑。
- **结果列表最大高度**与滚动条样式（项目已有 `.fd-command-scroll` 自定义滚动条先例，见 [`index.css`](../../../src/index.css)）。
- 页内遮罩形态下，**窄窗口**（项目断点 1024px，见 [folder-content-copy issue 55](../../folder-content-copy/issues/55-narrow-viewport-auto-switch.md)）时面板宽度如何收缩。

## Comments

- 2026-11-13：grilling 第一轮时列为下游问题，未及提问。用户外出，留待下次讨论。
- 若 issue 10 选择「统一为页内遮罩」，多显示器与 DPI 部分作废，其余仍需定。