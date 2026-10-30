# 文件夹浏览与复制：产品规格地图

Type: map
Label: wayfinder:map
Status: open

## 目标

形成一份可交给实现阶段的产品规格，描述 KeyboardCommand 的文件夹浏览与文件上下文包复制功能，以及该功能所需的应用外壳约束。所有必要决定明确后，本地图即完成；本轮工作不包括软件实现。

## 备注

- 产品背景和初始需求见 [`PROJECT_REQUIREMENTS.md`](../../PROJECT_REQUIREMENTS.md)。
- 使用 [`GLOSSARY.md`](../../GLOSSARY.md) 中的术语；复制结果称为“文件上下文包”。
- 遵循 [`docs/agents/domain.md`](../../docs/agents/domain.md) 和本地 Markdown 问题跟踪约定。
- 当前技术方向为 Tauri 2、React、TypeScript 和 TanStack Router 客户端路由，不使用 SSR。功能路径需支持冷启动与重载，优先简洁路径；若打包验证不可靠则回退到哈希路径。设置弹窗打开时从 SQLite 读取配置，保存时写回 SQLite 并重新加载当前文件夹；完整复制正文保存为文件快照。
- 首个交付版本包含文件夹树、实时搜索、可配置文本扩展名筛选、忽略目录、递归选择、复制、最多 20 条历史记录及选择恢复。
- 当前仓库尚未初始化应用源码；项目初始化方案已由 [issue 30](issues/30-project-initialization-tooling.md) 决定。主页面与设置弹窗的 UI 控件、交互和布局见 [界面绘制说明](../../docs/design/文件夹复制界面绘制说明.md) 与 [issue 32](issues/32-folder-copy-ui-layout.md)。
- 大目录默认阈值为单个文件夹的直接子项超过 50 个；阈值可在本功能设置弹窗修改。保存后重新加载当前文件夹。
- 实时搜索使用用户自行安装的 `fd`，应用不打包 fd。搜索时包含 fd 默认隐藏或忽略的项目；目录忽略规则和文件夹排除规则交给 fd，文件排除规则由应用筛选搜索结果，再按文件白名单筛选。fd 不可用时禁用搜索并提示安装。搜索异常行为见 issue 26。
- 当前仍待决定的明确问题记录在 `issues/` 的各自票据中；`Status: open` 表示待处理，`Status: claimed` 表示处理中，二者都属于尚未解决。`Blocked by` 表示等待前置票据。“尚未明确”只记录目前还无法表述成具体问题的雾区。完成调研不代表已经选定方案。
- 本地图只用于作出决定和调研，不启动实现。

## 已作决定

- [首版包含完整的文件夹复制流程和实时搜索](issues/01-v1-scope.md)：首版包括浏览、实时搜索、筛选、忽略目录、复制、最多 20 条历史记录和选择恢复。
- [使用可配置的文本扩展名白名单](issues/02-file-eligibility.md)：通过扩展名配置可处理的文件；默认面向常见文本文件。
- [采用全局可编辑的文件扩展名白名单](issues/09-default-extension-policy.md)：默认包含常见源码、配置、文档和脚本文本；敏感文本文件可按普通白名单文件纳入，用户可另设文件名/路径排除规则；二进制文件不纳入默认白名单。
- [恢复选择仅包含当前规则下可选的文件](issues/10-filter-changes-and-saved-selection.md)：当前规则过滤掉的文件不显示，也不进入当前选择集。
- [忽略目录显示为带标记且不可展开的节点](issues/03-ignored-directory-presentation.md)：目录节点仍可见，其后代不展开。
- [大目录按需分批加载](issues/04-large-directory-loading.md)：默认超过 50 个直接子项即为大目录；阈值可配置，超过后按需加载并提供“加载更多”操作。首批和后续批次各为 30 项。
- [大目录采用树内追加，并显示已载入与剩余数量](issues/11-large-directory-threshold-prototype.md)：新批次追加到当前目录列表末尾；深层目录按每个文件夹的直接子项分别判断是否分批。
- [大目录首批及每次追加均为 30 项](issues/28-large-directory-batch-size.md)：剩余不足 30 项时显示全部剩余项。
- [递归选择符合条件的后代，文件夹使用三态](issues/05-selection-semantics.md)：递归选择可处理且未被忽略的文件；文件夹显示全选、部分选中或未选中。
- [复制结果命名为“文件上下文包”](issues/06-copy-format-and-term.md)：使用绝对路径标题和 Markdown 文本代码块；必要时延长围栏以避免内容冲突。
- [确定文件上下文包的精确文本格式](issues/31-copy-package-exact-format.md)：使用二级标题和行内代码展示绝对路径；代码围栏依文件类型标记并按内容动态延长；统一换行为 LF，保留文件内容空行，整个包以一个 LF 结尾。
- [确定文件夹复制页面的控件布局](issues/32-folder-copy-ui-layout.md)：页面标题为“文件夹内容复制”，默认绘图画布 1280×800；主区左侧文件树、右侧选择/历史辅助面板，窄窗口切换为单面板；固定“复制文件上下文包”操作栏，设置弹窗纵向分组并逐组恢复默认。
- [确定历史记录列表的范围和排序](issues/33-history-list-scope-and-order.md)：选择文件夹时默认显示该文件夹记录，可切换查看全部记录；无当前文件夹时显示全部，始终按创建时间从新到旧排列，并区分当前文件夹无记录和全局无记录的空状态。
- [定义设置数据库读写失败时的反馈](issues/34-settings-persistence-failure-feedback.md)：读取失败时不伪装成默认值，提供重试且禁用编辑；保存采用单事务，失败回滚并保留草稿与页面状态；以中文摘要及可展开技术详情反馈。
- [同一文件夹可保留多条历史，全局上限为 20 条](issues/07-history-cardinality.md)：打开文件夹时恢复其最新历史记录中的选择。
- [将单实例和外部激活纳入应用外壳范围](issues/08-app-shell-scope.md)：将其纳入首版应用外壳；CLI/AHK 激活方式见 issue 19。
- [将复制历史快照保存为文件](issues/17-choose-history-storage.md)：复制正文保存为文件快照；本功能配置使用 SQLite 查询和保存。
- [通过设置弹窗读写 SQLite 配置](issues/24-database-workflow-responsibility.md)：打开弹窗查询本功能配置；白名单、文件名/路径排除规则、忽略目录和大目录阈值保存到数据库，并重新加载当前文件夹。
- [确认默认白名单与生成文件排除清单](issues/21-default-extension-list.md)：默认纳入常见文本扩展名、项目特殊文件名及敏感文本文件；锁文件和明显生成文件默认排除，不进行内容密钥扫描。
- [历史上限淘汰创建时间最早的记录](issues/15-history-eviction-policy.md)：新增记录使全局历史超过 20 条时淘汰创建时间最早者；复制历史快照不刷新创建时间，成功重读源文件并替换记录时使用新创建时间。
- [定义历史恢复及文件变化或读取失败时的行为](issues/16-stale-files-and-copy-failures.md)：历史选择仅作参考并静默跳过无法恢复项；普通复制遇错全量取消，历史快照重读则尽可能复制成功文件并替换当前记录。
- [采用 TanStack Router 客户端路由并支持冷启动与重载](issues/18-choose-spa-router.md)：优先使用简洁路径；若 Windows 打包后的深层路径无法可靠恢复，则采用哈希路径。外部激活协议另行决定。
- [首版通过单实例插件和命令行参数激活功能](issues/19-choose-external-activation-protocol.md)：使用 `kbcapp --route <功能路径>`，AHK 采用相同参数；不注册 URI Scheme。请求可冷启动或转交到现有实例，并在校验后导航。
- [每条历史记录使用两个配对文件](issues/20-history-file-layout.md)：`.meta.json` 保存元数据，`.md` 只保存原样文件上下文包正文；元数据文件作为记录发布标记。
- [定义文件和文件夹的实时搜索体验](issues/22-live-search-experience.md)：按相对路径进行大小写不敏感的纯文本包含匹配，停止输入 500 毫秒后查询；最多显示 10 个通过规则筛选的结果；Enter 对文件切换选择、对文件夹仅定位，并在树中展开和加载到目标节点。
- [定义 fd 搜索不可用及遍历异常时的行为](issues/26-fd-search-availability-and-errors.md)：使用用户自行安装的 fd；不可用时禁用搜索并提示安装，遍历部分失败时展示已有结果并提示搜索不完整。
- [确定忽略目录的默认规则](issues/27-ignored-directory-defaults.md)：设置全局共用，按目录名应用于任意层级；预置版本控制、依赖、构建输出、测试和缓存目录，允许逐项编辑并恢复默认值。
- [定义文件与文件夹名称排除规则](issues/29-file-exclusion-rules.md)：规则按任意层级的名称匹配，`/` 后缀表示文件夹，文件与文件夹按统一的过滤语义影响树、搜索、递归选择和历史恢复；设置支持编辑及恢复默认。
- [确定项目初始化工具配置](issues/30-project-initialization-tooling.md)：使用官方 Tauri React/TypeScript/pnpm 脚手架与 Vite；Node.js 和 pnpm 沿用当前环境，Rust 稳定版精确固定并手动更新；不额外配置质量检查、测试或提交钩子。

## 已完成调研（不代表最终选型）

- [历史快照存储方案比较](issues/12-history-storage-research.md)：调研曾建议使用 SQLite 单库；用户已决定复制正文保存为文件快照，同时要求本次界面流程也真实读写 SQLite。[查看研究报告](https://github.com/GmavionR/KeyboardCommand/blob/research/history-storage/research/history-storage.md)
- [Tauri 2 单页应用路由比较](issues/13-router-research.md)：调研建议使用 TanStack Router 客户端模式，用户已在 issue 18 确认采用；不引入服务端渲染。[查看研究报告](https://github.com/GmavionR/KeyboardCommand/blob/research/spa-router/research/spa-router.md)
- [Tauri 2 Windows 单实例和外部激活方式](issues/14-tauri-external-activation-research.md)：调研了参数转发和链接激活机制；用户已在 issue 19 决定首版使用单实例插件转交 CLI/AHK 参数。[查看研究报告](https://github.com/GmavionR/KeyboardCommand/blob/research/tauri-activation/research/tauri-activation.md)
- [成熟文件浏览与实时搜索方案调研](issues/23-live-search-research.md)：原调研建议将 `fd`、`fzf`、`rg` 作为开发参考；用户后来明确选用自行安装的 `fd` 作为本功能运行时搜索工具。[查看研究报告](https://github.com/GmavionR/KeyboardCommand/blob/research/live-search/research/live-search-patterns.md)
- [评估 Everything 的 es.exe 是否适合作为搜索加速器](issues/25-everything-es-search-research.md)：历史调研确认 ES 依赖 Everything 索引，但用户后来决定改用 fd；本项目不再采用 ES。[查看研究报告](https://github.com/GmavionR/KeyboardCommand/blob/research/everything-es/research/everything-es.md)

## 尚未明确

- 随着票据逐步解决，详细规格阶段可能显现新的文件系统边界情形和界面反馈需求；目前还无法将它们准确表述为独立问题。

## 尚未决定的 Issue

以下票据均尚未解决（`Status: open` 或 `Status: claimed`），标题链接可打开详细问题。每次解决或新增票据时同步更新本列表；票据正文是具体问题的唯一事实来源。

（当前没有未决 Issue。）

## 范围外

- 提示词列表/待办功能及未来其他独立快捷工具不属于本次文件夹复制规格。
- 本次不实施功能、不制作安装包，也不完善与该功能交付无关的整个产品。
