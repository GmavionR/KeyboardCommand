# 21：面板视觉细节、无结果文案与动效

Type: grilling
Status: open
Label: needs-triage
Blocked by: 10, 18

## 问题

视觉语言要在项目既有约定和参考截图之间取齐。已核实的既有约定：

- 弹窗面板：`bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-2xl`。
- 下拉容器：`rounded-lg shadow-2xl divide-y divide-slate-100 dark:divide-slate-800 text-xs`。
- 高亮行：`bg-blue-50 dark:bg-blue-600/20 border-l-2 border-blue-600 dark:border-blue-500`。
- 匹配命中高亮：`<mark className="bg-amber-200 dark:bg-amber-500/40 ...">`。
- 快捷键提示 chip：`px-1.5 py-0.5 text-[10px] bg-slate-100 dark:bg-slate-800 rounded border font-mono`。
- **`animate-in fade-in zoom-in-95` 是死类**：没装动画库，编译产物里一个都没有。想要真动效必须新增 keyframes 或依赖。

需要定：

- 面板**圆角、宽度、内边距、字号**：沿用现有弹窗，还是按参考截图做更紧凑的列表。
- **输入框样式**与 placeholder 文案。
- **分类标题样式**：参考截图是灰色小字分组标题，项目现有下拉的 header 是 `bg-slate-50 dark:bg-slate-950/70 text-[11px]`。
- **`→` 跳转标记**用哪个图标（项目已有 `lucide-react`）、放在行首还是行尾。
- **是否显示每条命令的快捷键**（如复制命令的 Ctrl+Shift+C）。
- **无结果文案**：现有搜索用「没有搜索到」，面板是否沿用同一句以保持一致。
- **是否高亮匹配到的字符片段**（沿用 `<mark>` 那套）。
- **动效**：要不要真的做淡入/缩放。若要做，是新增 keyframes 还是引入动画库；不做则应**删掉死类**而不是留着假装有效果。
- **滚动条**：是否复用 `.fd-command-scroll` 那套自定义滚动条样式。
- **底部提示条**：是否显示「↑↓ 选择 / ↵ 执行 / esc 关闭」这类提示。

## Comments

- 2026-11-13：grilling 第一轮时列为下游问题，未及提问。用户外出，留待下次讨论。
- 阻塞于 issue 10（形态决定是窗口还是遮罩）与 issue 18（cmdk 决定是否自带结构与 ARIA）。