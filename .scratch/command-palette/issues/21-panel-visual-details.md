# 21：面板视觉细节、无结果文案与动效

Type: grilling
Status: resolved
Label: ready-for-agent

## 决议

1. **容器与配色**：
   - 面板外壳：`bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden`；
   - 结果列表项高亮条：`bg-blue-50 dark:bg-blue-600/20 text-blue-900 dark:text-blue-100 border-l-2 border-blue-600 dark:border-blue-500`；
   - 分类标头：`text-[11px] font-semibold text-slate-400 dark:text-slate-500 px-3 py-1.5 uppercase tracking-wider`。
2. **输入框与占位符**：
   - 顶部搜索输入框：无边框设计、大号字号（`text-base`）、背景透明，聚焦时不带原生 outline；
   - 占位文案（Placeholder）：`输入命令或功能名称...`；
   - 搜索图标：左侧放置 `lucide-react` 的 `Search` 图标，尺寸适中（`w-4 h-4 text-slate-400`）。
3. **匹配高亮与图标**：
   - 匹配命中的字符片段：沿用项目既有规则 `<mark className="bg-amber-200 dark:bg-amber-500/40 text-inherit rounded-sm px-0.5">`；
   - 跳转命令：右侧显示 `lucide-react` 的 `ArrowRight`（`→`）图标；
   - 快捷键提示 chip：右侧展示紧凑 chip（如 `Ctrl+Shift+C`），样式为 `px-1.5 py-0.5 text-[10px] bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 font-mono text-slate-500`；
   - 主题互斥选中标记：当前生效项右侧显示 `lucide-react` 的 `Check`（`✓`）图标。
4. **无结果文案**：
   - 无匹配时展示：`没有搜索到匹配命令`，居中显示，字色 `text-slate-400 dark:text-slate-500 text-sm py-8`。
5. **动效规范与死类清理**：
   - 移除现有代码中未配置关键帧动画的 `animate-in fade-in zoom-in-95` 等死类；
   - 保证面板秒开与干脆的轻量质感，不引入庞大的第三方动画库。
6. **底部操作指引条**：
   - 底部固定一条轻量的按键指引：`↑↓ 选择 · ↵ 执行 · esc 隐藏`，使用小字号（`text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800/80 px-4 py-2 flex items-center justify-between`）。

## Comments

- 2026-11-18：用户在 Grilling 第三轮确认本决议。
