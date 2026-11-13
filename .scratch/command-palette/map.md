# 命令面板：产品规格地图

Type: map
Label: wayfinder:map
Status: open

## 目标

形成一份可交给实现阶段的产品规格，描述 KeyboardCommand 的**命令面板**：用户按一个可配置的系统级热键唤起面板，输入名称片段检索应用功能，用方向键选择、回车执行。所有必要决定明确后收敛为 `spec.md`，本地图即完成；本轮工作不包括软件实现。

## 备注

- 产品背景见 [`PROJECT_REQUIREMENTS.md`](../../PROJECT_REQUIREMENTS.md)。命令面板属于**应用外壳**，不属于文件夹复制功能，因此独立成一个 effort，票号从 01 重新开始。
- 使用 [`GLOSSARY.md`](../../GLOSSARY.md) 中的术语。「搜索」在本项目专指文件夹浏览中的文件名称实时搜索，命令面板**不叫「全局搜索」**。
- 遵循 [`docs/agents/issue-tracker.md`](../../docs/agents/issue-tracker.md) 与 [`docs/agents/domain.md`](../../docs/agents/domain.md)。
- 视觉参考是用户提供的 shadcn/ui 文档搜索框截图：`C:\Users\40294\.qoder\tmp\E--DevProjects-LocalProjects-tauriProjects-KeyboardCommand\images\d64f3679-5611-4a80-99c8-2a2d66e7f9c1\09ae906d-32d2-40ed-9b25-219543f53705.png`。
- 技术方向沿用 Tauri 2、React 19、TypeScript、TanStack Router 客户端路由、Tailwind v4。当前**没有任何 headless UI 依赖**，4 个弹窗全是手搓内联浮层。
- `Status: open` 表示待处理，`Status: claimed` 表示处理中，二者都属于尚未解决。`Blocked by` 表示等待前置票据。「尚未明确」只记录目前还无法表述成具体问题的雾区。**完成调研不代表已经选定方案。**
- 本地图当前只用于作出决定和调研，不启动实现。

## 已作决定

- [术语与首版范围](issues/01-terminology-and-v1-scope.md)：定名「命令面板 / 命令 / 命令分类 / 跳转命令 / 动作命令」，弃用「全局搜索」。首版只做两类命令——跳转到功能路径、触发应用内已有动作；文件内容、复制历史、最近文件夹的内容检索不进首版。
- [系统级可配置热键与两种唤起场景](issues/02-system-hotkey-and-invocation.md)：**系统级**全局热键，**默认 `Ctrl+Shift+K`**（放弃 `Ctrl+Shift+P`），**用户可配置**。无窗口显示（仅托盘）时唤起面板；有窗口显示（含在其他虚拟桌面、被其他应用遮挡）时先激活到前台再显示面板。**两种呈现形态是否成立由用户明确存疑，不在该票决议内**，转 issue 10。
- [命令分类只做分组标题，列表单层](issues/03-category-semantics.md)：分类只影响分段与排序，不可选中、不可展开、不可执行；一次输入跨所有分类匹配；列表永远单层，没有「进入下一层」。`→` 只是跳转命令的类型标记，不表示下钻。
- [首版只做执行型命令](issues/04-executable-items-only.md)：回车 = 执行一次然后关闭。不做单选/多选控件，不做右侧次要动作。需要表达当前值时用多条互斥的执行型命令加打勾（如主题的三条命令）。
- [命令匹配沿用名称包含，配英文别名](issues/05-matching-semantics.md)：大小写不敏感的纯文本包含匹配，无通配符、不做 fuzzy、不引入打分排序，按分类固定顺序排列；每条命令可带英文别名关键词。该组合是 VS Code 本地化构建的官方模式。
- [页内遮罩形态的打开关闭与叠加行为](issues/06-overlay-open-close-behavior.md)：Escape 关闭、点遮罩关闭、关闭后焦点回到打开前元素、已有弹窗打开时不响应唤起、层级高于现有 `z-50` 弹窗。这是项目里第一个有焦点陷阱的浮层，是有意的例外。**仅覆盖页内遮罩形态**，独立窗口形态转 issue 15。
- [讨论结论的落点与词汇表更新](issues/07-documentation-location.md)：新建 `.scratch/command-palette/` effort，票号从 01 起；已确认决定写成 resolved 的 grilling 票据，待决问题写成 open 票据并标 `Blocked by`；GLOSSARY 补术语；核心问题未定前不写 `spec.md`。

## 已完成调研（不代表最终选型）

- [命令面板主流实现调研](issues/08-prior-art-research.md)：cmdk 是采用度断层第一（13.1k stars、月下载 1.739 亿、官方支持 React 19），但 `@radix-ui/react-dialog` 是它**自身的硬依赖、无法 tree-shake**，总量约 16.7 kB gzip；可用 `shouldFilter={false}` 完全接管过滤与排序；**自带输入法组字守卫与完整 ARIA combobox 模式**。对比了 kbar / react-cmdk / Mantine Spotlight / ninja-keys。梳理了分类的三种主流模型（VS Code 前缀符号、显式页栈、扁平分组标题）与中文匹配做法（VS Code 本地化名 + 英文别名，uTools 叠加拼音首字母）。选型决策仍在 issue 18。

## 尚未明确

- 系统级热键 + 托盘 + 可能的第二个窗口引入后，应用的生命周期（启动、隐藏、退出、单实例激活）会怎样变化，目前还无法准确表述为独立问题；待 issue 09–12 收敛后可能显现新的边界情形。
- 命令面板与未来其他功能（提示词列表等）的命令如何共存与命名，属于后续 effort 的范围，目前无法具体提问。

## 尚未决定的 Issue

以下票据均尚未解决（`Status: open` 或 `Status: claimed`），标题链接可打开详细问题。每次解决或新增票据时同步更新本列表；票据正文是具体问题的唯一事实来源。

**当前前沿（无前置阻塞，可直接讨论）**：

- [Tauri 2 托盘、全局热键与独立面板窗口的主流做法调研](issues/09-tauri-tray-hotkey-window-research.md)：issue 10–13 的共同前置，需先拿到平台能力事实。
- [与 issue 54 的边界，以及现有两个快捷键是否升级为系统级](issues/14-scope-boundary-with-issue-54.md)：热键与托盘基础设施归谁，避免两个 effort 各做一半。
- [命令注册表与功能路径的单一事实来源](issues/17-command-registry-and-route-source.md)：功能路径白名单现散在三处，加面板会变四处。
- [是否引入 cmdk](issues/18-cmdk-dependency-choice.md)：第一轮已提出但用户未答（原 Q8），事实前提已备齐。
- [是否叠加拼音首字母匹配](issues/22-pinyin-initial-matching.md)：英文别名已覆盖部分需求，拼音是可选叠加。
- [现有实时搜索缺少输入法组字守卫](issues/23-fix-ime-composition-in-search.md)：独立于命令面板的既有缺陷，待用户决定是否现在修。

**已阻塞（等前置解决后再讨论）**：

- [命令面板的呈现形态——一套独立窗口还是两套形态](issues/10-presentation-form.md)（Blocked by 09）：**当前最核心的未决问题，也是用户明确存疑的一点。**
- [「有窗口正在显示」的判定口径](issues/11-window-visible-definition.md)（Blocked by 09）：最小化、被遮挡、跨虚拟桌面分别算什么。
- [托盘语义与主窗口关闭行为](issues/12-tray-and-close-behavior.md)（Blocked by 09）：点 X 是隐藏还是退出，托盘菜单与左键行为。
- [唤起热键的配置、存储、冲突与失败反馈](issues/13-hotkey-configuration.md)（Blocked by 09）：含 `Ctrl+Shift+K` 是否与常见应用冲突尚未核实。
- [独立窗口形态的关闭与焦点行为](issues/15-standalone-window-close-behavior.md)（Blocked by 10）。
- [面板的位置、尺寸、多显示器与 DPI](issues/16-panel-position-and-monitors.md)（Blocked by 10）。
- [主题作用域与跨窗口主题同步](issues/19-theme-scope-and-sync.md)（Blocked by 10）：`ThemeProvider` 目前只包住 `/folder-copy`，根布局调 `useTheme()` 会抛错。
- [首版命令清单、跨页面可用性与禁用态](issues/20-command-inventory-and-availability.md)（Blocked by 17）。
- [面板视觉细节、无结果文案与动效](issues/21-panel-visual-details.md)（Blocked by 10, 18）：含「现有 `animate-in` 类是死类」要不要一并处理。
- [同步系统设置的快捷键清单与分组说明](issues/24-sync-system-settings-shortcut-list.md)（Blocked by 13）：issue 44 要求清单与实际生效范围一致。

## 范围外

- 文件内容、复制历史正文的检索（异步 provider、防抖、结果上限、加载态），首版不做。
- 提示词列表等未来功能自身的实现；本 effort 只负责它们如何接入命令面板。
- 开机自启与桌面通知的接入，留在 [folder-content-copy issue 54](../folder-content-copy/issues/54-autostart-notification-and-global-hotkey.md)（边界见 issue 14）。
- 本轮不实施功能、不制作安装包。

## Comments

- 2026-11-13：grilling 第一轮完成 Q1–Q7，Q8（cmdk 选型）因用户外出未答。用户要求先把决议落地到文档、剩余问题留待下次讨论，本地图与 01–24 号票据即按此建立。
- 第一轮提问时推荐的是「应用内热键 + `Ctrl+Shift+P`」，用户在 Q2 否决并改为系统级 + 可配置 + `Ctrl+Shift+K`，同时补充了托盘态与窗口态两种唤起场景。这一改动把托盘、全局热键、多窗口拉进范围，是本 effort 后续大部分未决问题的来源。