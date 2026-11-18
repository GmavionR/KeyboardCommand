# 16：面板的位置、尺寸、多显示器与 DPI

Type: grilling
Status: resolved
Label: ready-for-agent

## 决议

1. **屏幕定位与偏上布局**：
   - 窗口位置采用**水平居中、垂直居中偏上**（位于所在屏幕垂直高度的 20%~25% 黄金视线区，Spotlight / Raycast 标准视觉定位）。
2. **多显示器跟随策略**：
   - 唤起命令面板时，通过 Tauri 原生接口检测当前**鼠标光标所在的显示器**（Cursor Position Monitor）；
   - 在该显示器的有效工作区（排除任务栏）内计算居中偏上坐标并展示，确保在用户正在视线注视与操作的屏幕上就近呼出。
3. **尺寸与自适应高度**：
   - **宽度**：固定为 640px（逻辑像素）；
   - **高度**：根据列表结果数量自适应收缩；空状态或仅少量结果时紧凑包裹；
   - **最大高度**：上限设为 420px，超出时在结果列表容器内部滚动；
   - **滚动条**：复用项目既有的 `.fd-command-scroll` 自定义紧凑滚动条样式。
4. **DPI 与透明度**：
   - 窗口配置 `transparent: true` 与 `decorations: false`；
   - 由 Tauri Webview 处理系统 DPI 缩放，配合外层 CSS 圆角 `rounded-xl` 与投影 `shadow-2xl`，在各缩放比例下保持边缘平滑。

## Comments

- 2026-11-18：用户在 Grilling 第三轮确认本决议。
