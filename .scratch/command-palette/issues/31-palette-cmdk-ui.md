# 31：命令面板核心交互与 cmdk 界面呈现

Type: task
Status: ready-for-agent
Label: ready-for-agent

## 要构建什么

引入 `cmdk` 原语组件，构建悬浮半透明的命令面板 UI，实现大小写不敏感纯文本包含检索与英文别名命中、关键字琥珀色高亮、单层四段固定分类、禁用 vimBindings、底部操作提示条与死类清理。

## 详细交付要求

1. **安装依赖**：
   - 引入 `cmdk`（官方支持 React 19）；
2. **面板容器与视觉语言**：
   - 外壳：`bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden`，固定宽度 640px，自适应紧凑高度（最大 420px，超出使用 `.fd-command-scroll` 滚动）；
   - 顶部搜索栏：无边框设计、大号字号（`text-base`）、背景透明、无 focus ring，左侧带 `Search` 图标，占位符为 `输入命令或功能名称...`；
   - 底部提示条：常驻提示条 `↑↓ 选择 · ↵ 执行 · esc 隐藏`；
   - 清理既有代码中未装动画库的 `animate-in fade-in zoom-in-95` 等死类；
3. **检索、排序与高亮**：
   - 传入 `shouldFilter={false}`，由前端自己执行纯文本大小写不敏感包含匹配（中文标题或英文别名包含即命中）；
   - 命中字符片段使用 `<mark className="bg-amber-200 dark:bg-amber-500/40 text-inherit rounded-sm px-0.5">` 高亮；
   - 分类顺序固定为：「页面」→「操作」→「外观」→「设置」；
   - 主题生效项右侧显示 `lucide-react` 的 `Check`（`✓`）图标；跳转命令右侧显示 `ArrowRight`（`→`）图标；
   - 无匹配条目时居中显示：`没有搜索到匹配命令`；
4. **键盘交互控制**：
   - 禁用 cmdk 默认的 `vimBindings`，仅保留上下方向键循环切换与 Enter 执行；
   - 依赖 cmdk 内置的 `isComposing` 守卫，确保中文输入法拼音组字打字时不触发执行与高亮乱跳。

## 验收条件

- [ ] 打开命令面板，输入框自动获得焦点，空输入状态下清晰展示预置四组分类命令。
- [ ] 输入 `fc`、`folder` 或 `文件夹`，能同时通过中文名或英文别名命中对应条目，命中文本以琥珀色高亮显示。
- [ ] 使用拼音输入法打字选词时，Enter 不触发执行，上下键不打乱列表高亮。
- [ ] 键盘上下键支持在所有结果项之间流畅循环导航。
- [ ] 无匹配结果时，居中显示友好提示「没有搜索到匹配命令」。
- [ ] `bun run build` 编译通过。

## Blocked by

- [30：可扩展命令注册表与路由单一来源架构](30-extensible-command-registry.md)
