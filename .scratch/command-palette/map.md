# 命令面板：产品规格地图

Type: map
Label: wayfinder:map
Status: resolved

## 目标

形成一份可交给实现阶段的产品规格，描述 KeyboardCommand 的**命令面板**：用户按一个可配置的系统级热键唤起面板，输入名称片段检索应用功能，用方向键选择、回车执行。所有必要决定已明确，收敛为 [`spec.md`](spec.md)；本地图已圆满完成。

## 备注

- 产品背景见 [`PROJECT_REQUIREMENTS.md`](../../PROJECT_REQUIREMENTS.md)。命令面板属于**应用外壳**，独立成一个 effort。
- 遵循 [`docs/agents/issue-tracker.md`](../../docs/agents/issue-tracker.md) 与 [`docs/agents/domain.md`](../../docs/agents/domain.md)。
- 技术栈：Tauri 2、Rust、React 19、TypeScript、TanStack Router、Tailwind v4、cmdk。

## 已作决定（全部 24 项 Issue 已决议闭环）

1. [术语与首版范围](issues/01-terminology-and-v1-scope.md)：定名「命令面板 / 命令 / 命令分类 / 跳转命令 / 动作命令」，弃用「全局搜索」。首版只做跳转与动作两类命令。
2. [系统级可配置热键与两种唤起场景](issues/02-system-hotkey-and-invocation.md)：系统级全局热键，默认 `Ctrl+Shift+K`，支持托盘常驻与无窗口呼出。
3. [命令分类只做分组标题，列表单层](issues/03-category-semantics.md)：分类只用于分组排序，单层列表，无下钻。
4. [首版只做执行型命令](issues/04-executable-items-only.md)：回车执行一次并关闭，主题互斥项加打勾标记。
5. [命令匹配沿用名称包含，配英文别名](issues/05-matching-semantics.md)：纯文本大小写不敏感包含匹配，配英文别名，无 fuzzy 评分。
6. [页内遮罩行为（历史讨论参考）](issues/06-overlay-open-close-behavior.md)：早前页内遮罩分析，已被 issue 10 统一独立窗口取代。
7. [讨论结论落点与词汇表](issues/07-documentation-location.md)：建立 `.scratch/command-palette/` 与 GLOSSARY 维护。
8. [主流命令面板调研](issues/08-prior-art-research.md)：cmdk 成为断层第一选型，分析 ARIA 与输入法守卫。
9. [Tauri 2 托盘、热键与独立窗口主流调研](issues/09-tauri-tray-hotkey-window-research.md)：Tauri 2 原生内置 TrayIconBuilder，官方 global-shortcut v2，独立窗口预创建复用。
10. [命令面板呈现形态](issues/10-presentation-form.md)：统一采用单套常驻后台的独立浮层窗口（Spotlight 风格），放弃双形态与页内遮罩。
11. [「有窗口正在显示」判定口径](issues/11-window-visible-definition.md)：统一独立窗口后状态判定自然消解；跳转命令统一恢复主窗口至前台。
12. [托盘语义与主窗口关闭行为](issues/12-tray-and-close-behavior.md)：点 × 隐藏到托盘；托盘左键激活主窗口，右键菜单彻底退出。
13. [唤起热键配置、存储与冲突反馈](issues/13-hotkey-configuration.md)：默认 `Ctrl+Shift+K`，SQLite 持久化，被占用时界面标红如实提示。
14. [与 issue 54 的边界及既有快捷键](issues/14-scope-boundary-with-issue-54.md)：热键与托盘基础设施归本 effort；现有 `Ctrl+Shift+C` 与 `Ctrl+F` 保持应用内生效。
15. [独立窗口形态关闭与焦点行为](issues/15-standalone-window-close-behavior.md)：失焦隐藏、Esc 隐藏、Toggle 切换、执行后隐藏、skipTaskbar。
16. [面板位置、尺寸与多显示器](issues/16-panel-position-and-monitors.md)：固定宽度 640px，居中偏上（20%~25%），跟随鼠标所在显示器，最大高度 420px 内部滚动。
17. [命令注册表与路由单一来源](issues/17-command-registry-and-route-source.md)：前端定义单一路由清单，模块导出动作契约，Rust 保持白名单一致。
18. [引入 cmdk](issues/18-cmdk-dependency-choice.md)：引入 cmdk 获得完整 ARIA、键盘导航与输入法守卫；`shouldFilter={false}`，禁用 vimBindings。
19. [主题作用域与跨窗口主题同步](issues/19-theme-scope-and-sync.md)：`ThemeProvider` 提升到根布局；跨窗口基于事件广播与共享存储秒级同步。
20. [首版命令清单与跨页面行为](issues/20-command-inventory-and-availability.md)：固定「页面/操作/外观/设置」四组，跨页面自动先跳转后执行，空输入展示全量，首版不收录动态最近文件夹。
21. [面板视觉细节与动效](issues/21-panel-visual-details.md)：沿用 slate/blue 配色、琥珀色高亮、`→` 跳转图标，清理 `animate-in` 死类，底部展示按键指引。
22. [拼音首字母匹配范围](issues/22-pinyin-initial-matching.md)：首版不做外部拼音库，纯文本包含 + 英文别名已足够。
23. [修复现有搜索框输入法组字缺陷](issues/23-fix-ime-composition-in-search.md)：顺带修复 SearchBar 等既有输入框的 IME 组字误触。
24. [同步系统设置的快捷键清单](issues/24-sync-system-settings-shortcut-list.md)：在系统设置中如实区分系统级与应用内快捷键，移除过期占位说明。

## 规格文档

所有已作决定的完整产品技术规范汇总见：
👉 **[`spec.md`](spec.md)**

## 实施阶段工单（从 25 号起）

规格确认后按「示踪弹垂直切片」拆解为 9 张实现工单，实时状态见 [`spec.md`](spec.md) 中的实施任务进度矩阵：

25. ✅ [系统托盘常驻与主窗口关闭拦截隐藏](issues/25-tray-and-close-to-hide.md)（Blocked by: 无）
26. ✅ [现有搜索框输入法组字守卫修复](issues/26-fix-ime-composition-guard.md)（Blocked by: 无）
27. ✅ [独立面板 Webview 窗口创建与失焦隐藏生命周期](issues/27-standalone-palette-window.md)（Blocked by: 25）
28. ✅ [系统级全局热键注册与系统设置呈现](issues/28-global-shortcut-and-settings.md)（Blocked by: 27）
29. ✅ [全局 ThemeProvider 提升与跨窗口实时双向主题同步](issues/29-global-theme-elevation-and-sync.md)（Blocked by: 27）
30. ✅ [可扩展命令注册表与路由单一来源架构](issues/30-extensible-command-registry.md)（Blocked by: 29）
31. ✅ [命令面板核心交互与 cmdk 界面呈现](issues/31-palette-cmdk-ui.md)（Blocked by: 30）
32. ✅ [「打开文件夹...」与跳转命令跨页面联动执行](issues/32-open-folder-cross-page-dispatch.md)（Blocked by: 31）
33. ✅ [端到端集成与桌面多场景验证](issues/33-e2e-integration-and-verification.md)（Blocked by: 26, 28, 32）

