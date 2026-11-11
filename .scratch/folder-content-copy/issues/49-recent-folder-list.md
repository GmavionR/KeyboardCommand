# 49：持久化最近文件夹并与复制历史面板联动

**要构建：** 用户成功加载过的文件夹路径在「最近文件夹」下拉中跨重启保留，最多 10 条；从下拉选择某个路径后，右侧复制历史面板联动只显示该文件夹的复制历史。

**阻塞于：** 无前置未决票据（[浏览真实目录并加载文件树](38-directory-tree-and-pagination.md) 已解决）。与复制历史的持久化（[issue 43](43-history-storage-and-workflows.md)）互不阻塞：本票的联动与筛选口径在当前内存历史上即可完整验收。

**状态：** claimed
**标签：** ready-for-agent

**设计来源：** [界面绘制说明](../../../docs/design/文件夹复制界面绘制说明.md) 顶部工具区的「最近文件夹下拉框」是当前基准；术语见 [`GLOSSARY.md`](../../../GLOSSARY.md) 的「最近文件夹」，范围与排序见 [issue 33](33-history-list-scope-and-order.md)。存储机制沿用 [issue 24](24-database-workflow-responsibility.md) 已打通的 SQLite 读写通路。

- [ ] 每次**成功**加载文件夹时记录该路径：对话框选择、手动输入、下拉选择和刷新都经同一 `loadFolder` 流程，任一路径加载成功都要写入；加载失败的路径不写入。（原文的「外部激活」已更正：命令行只传 `--route`，从不携带文件夹路径，见 `parse_activation_args`，故不构成加载入口。）
- [x] 数据落在现有设置数据库 `settings.db` 的单表 `recent_folder(path_key TEXT PRIMARY KEY, path TEXT NOT NULL, last_used_at INTEGER NOT NULL)`。`path_key` 是归一化路径（小写、反斜杠转正斜杠、去尾部斜杠），`path` 保留用户原始写法仅用于显示。
- [ ] 上限固定 **10 条，写死，不提供配置项**。启动时按 `last_used_at` 倒序读取前 10 条；重复加载同一文件夹只更新时间不新增条目；第 11 个不同路径进入时淘汰最久未使用的一条。
- [ ] 从下拉选择的路径加载失败时，显示中文错误提示，并把该条从最近文件夹列表中移除，避免死路径占满 10 个槽位。
- [ ] 首版不提供「清空最近文件夹」和单条删除入口。
- [ ] 加载或切换文件夹后，复制历史面板**强制切回「当前目录」筛选**，即使用户此前手动切到「所有文件夹」。（补齐 issue 33 已规定但代码未实现的默认口径。）
- [ ] 按目录筛选复制历史、最近文件夹去重和 `sourceFolder` 匹配统一使用同一归一化路径比较；显示与存储仍保留用户原始写法。当前 `item.sourceFolder === currentFolderPath` 的精确字符串比较会使 `E:\Proj` 与 `e:/proj/` 视为两个目录、导致历史记录查不出来，须修正。
- [ ] 最近文件夹读写失败时显示中文错误，列表按空处理，不阻塞文件夹加载。
- [ ] 在桌面应用中手动验收重启后保留、大小写与斜杠差异去重、10 条淘汰、死路径移除，以及选择下拉项后面板联动只显示该目录记录。（原步骤要求先用 ego-browser 对照 playground；playground 已随 issue 46 迁入应用后删除，`find` 确认仓库内已无该目录，浏览器原型对照无从执行。视觉与交互基准改为 `docs/design/文件夹复制界面绘制说明.md`，与 issue 39 记录的同一情况一致。）

## Comments

- 2026-11-11：本轮 grilling 决定。用户明确该需求为「只要文件夹被 load 就记录、只存路径字符串、最多 10 条写死、下拉选中联动切换历史面板」，并确认设计原则是简单化处理，不引入复杂业务逻辑。
- 2026-11-11：与既有票据无冲突。代码已在内存中实现「成功加载后插入、归一化去重、截取 10 条」（`loadFolder` 内的 `setRecentFolders`），本票只补持久化、联动与匹配口径；`%APPDATA%\com.keyboardcommand.app\settings.db` 与 SQL 写权限已随 issue 39 落地。
- 2026-11-11：注意与[界面绘制说明](../../../docs/design/文件夹复制界面绘制说明.md) 中「搜索结果下拉最多展示 10 项」是两个互不相关的上限，不要混用同一常量名。

## 验收记录（2026-11-11）

**已机验：**

- `bun run build` 通过、`cargo check` 通过（Finished dev profile in 17.03s）。
- 迁移 v2 真实生效：终止 2026-11-10 17:41 遗留的旧 debug 实例（PID 37716，它锁住了 `target\debug\kbcapp.exe` 导致 `tauri dev` 一直 exit 101）后重启，只读查询 `%APPDATA%\com.keyboardcommand.app\settings.db` 确认 `_sqlx_migrations` 有 `version 2 / create_recent_folder / success=1`，且 `sqlite_master` 中 `recent_folder` 的建表 SQL 与票据一致。
- SQL 语义按**真实迁移后的表**（复制 db 副本，不触碰运行中的应用）用 node:sqlite 验证，15 项断言全部通过：空表启动、MRU 排序、大小写/正反斜杠/尾斜杠变体收敛为一条且显示保留最后一次的原始写法、重复加载只更新时间不新增行、第 11 条进入时淘汰最久未用且总数恒为 10、按归一化 key 删除死路径、删除不存在项不报错。
- 写入漏斗唯一：`src` 内只有 `loadFolder`（`FolderCopyApp.tsx:174`）经 `load_directory_tree` 加载新路径；另一处 `FolderCopyApp.tsx:821` 是保存设置后重载**同一个** `currentPath`，不构成未记录的加载入口。四个 UI 入口（对话框 588、输入/刷新 595、下拉 599、手动改路径 609）都走 `loadFolder`。
- 权限：`capabilities/default.json` 的 `sql:default` + `sql:allow-execute` 覆盖 `select`/`execute`；`$1` 位置绑定已由 `saveFolderCopySettings` 在生产路径证明。（node:sqlite 把 `$1` 当命名参数，只是本地 harness 的驱动差异，不影响应用。）

**待桌面验收（应用窗口现已运行新代码，vite 直接吃 src）：** 加载一个文件夹后确认 `recent_folder` 出现该行且下拉置顶；重启应用确认仍在；用 `E:\X` 与 `e:/x/` 两种写法加载同一目录确认只占一条；从下拉选一个已删除的路径确认中文报错且该条消失；切换文件夹后确认历史面板强制回到「当前目录」筛选。
