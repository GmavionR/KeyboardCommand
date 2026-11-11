# 49：持久化最近文件夹并与复制历史面板联动

**要构建：** 用户成功加载过的文件夹路径在「最近文件夹」下拉中跨重启保留，最多 10 条；从下拉选择某个路径后，右侧复制历史面板联动只显示该文件夹的复制历史。

**阻塞于：** 无前置未决票据（[浏览真实目录并加载文件树](38-directory-tree-and-pagination.md) 已解决）。与复制历史的持久化（[issue 43](43-history-storage-and-workflows.md)）互不阻塞：本票的联动与筛选口径在当前内存历史上即可完整验收。

**状态：** resolved
**标签：** ready-for-agent

**设计来源：** [界面绘制说明](../../../docs/design/文件夹复制界面绘制说明.md) 顶部工具区的「最近文件夹下拉框」是当前基准；术语见 [`GLOSSARY.md`](../../../GLOSSARY.md) 的「最近文件夹」，范围与排序见 [issue 33](33-history-list-scope-and-order.md)。存储机制沿用 [issue 24](24-database-workflow-responsibility.md) 已打通的 SQLite 读写通路。

- [x] 每次**成功**加载文件夹时记录该路径：对话框选择、手动输入、下拉选择和刷新都经同一 `loadFolder` 流程，任一路径加载成功都要写入；加载失败的路径不写入。（原文的「外部激活」已更正：命令行只传 `--route`，从不携带文件夹路径，见 `parse_activation_args`，故不构成加载入口。）
- [x] 数据落在现有设置数据库 `settings.db` 的单表 `recent_folder(path_key TEXT PRIMARY KEY, path TEXT NOT NULL, last_used_at INTEGER NOT NULL)`。`path_key` 是归一化路径（小写、反斜杠转正斜杠、去尾部斜杠），`path` 保留用户原始写法仅用于显示。
- [x] 上限固定 **10 条，写死，不提供配置项**。启动时按 `last_used_at` 倒序读取前 10 条；重复加载同一文件夹只更新时间不新增条目；第 11 个不同路径进入时淘汰最久未使用的一条。
- [x] 从下拉选择的路径加载失败时，显示中文错误提示，并把该条从最近文件夹列表中移除，避免死路径占满 10 个槽位。
- [x] 首版不提供「清空最近文件夹」和单条删除入口。
- [x] 加载或切换文件夹后，复制历史面板**强制切回「当前目录」筛选**，即使用户此前手动切到「所有文件夹」。（补齐 issue 33 已规定但代码未实现的默认口径。）
- [x] 按目录筛选复制历史、最近文件夹去重和 `sourceFolder` 匹配统一使用同一归一化路径比较；显示与存储仍保留用户原始写法。当前 `item.sourceFolder === currentFolderPath` 的精确字符串比较会使 `E:\Proj` 与 `e:/proj/` 视为两个目录、导致历史记录查不出来，须修正。
- [x] 最近文件夹读写失败时显示中文错误，列表按空处理，不阻塞文件夹加载。
- [x] 在桌面应用中手动验收重启后保留、大小写与斜杠差异去重、10 条淘汰、死路径移除，以及选择下拉项后面板联动只显示该目录记录。（原步骤要求先用 ego-browser 对照 playground；playground 已随 issue 46 迁入应用后删除，`find` 确认仓库内已无该目录，浏览器原型对照无从执行。视觉与交互基准改为 `docs/design/文件夹复制界面绘制说明.md`，与 issue 39 记录的同一情况一致。）

## 桌面验收记录（2026-11-11，用户实际操作）

用户在桌面端连续选择并加载了多个真实目录，下拉出现多条记录。只读查询生产库 `%APPDATA%\com.keyboardcommand.app\settings.db` 得到 7 行，逐条比对界面行为：

- `path` 保留原始写法（`F:\tempFiles`、`D:\chromeDownload\实现codex的讨论`），`path_key` 为归一化形式（`f:/tempfiles`、`d:/chromedownload/实现codex的讨论`）——反斜杠转正斜杠、小写、去尾斜杠，CJK 段完整保留。归一化去重与「显示保留原样」同时成立，「统一使用同一归一化路径比较」一项勾掉。
- `typeof(last_used_at)` 全为 `integer`，毫秒值无损；`ORDER BY last_used_at DESC` 的结果顺序与下拉从上到下一致（最新为 `F:\workspace\jeecg-boot`）。
- 7 行 `path_key` 互不重复，其中 `D:\chromeDownload` 与其子目录 `D:\chromeDownload\ntfslinksview_schinese1` 作为不同目录各自占一条，未发生前缀误合并。
- 插件绑定层复核：`select` 与 `execute` 走 `wrapper.rs:223` 同一套按位置 `.bind()` 的代码；JS 数字按 f64/REAL 绑定，实测整数值 REAL 进 `LIMIT` 正常（`CAST(10 AS REAL)` 返回 10 行），仅非整数才 `datatype mismatch`，而 `RECENT_FOLDER_LIMIT=10` 与 `Date.now()` 恒为整数，故无需改代码。

**第 11 条淘汰（同日第三轮，用户继续加载）：** 用户又加载了 6 个不同目录，只读查询确认 `recent_folder` **恰好 10 行、`path_key` 全不重复**，且被移除的正是第二轮里时间最旧的三条（`F:\临时文件`、`D:\chromeDownload\ntfslinksview_schinese1`、`D:\chromeDownload`），新路径全部按时间倒序排在前部。10 条上限 + MRU 淘汰据此勾掉。

**死路径移除与重启存活（同日第四轮）：** 用户从下拉点击已删除的 `C:\Users\40294\AppData\Local\Temp\kbc-dead-probe`（该探针目录由我创建并已删除）后，只读查询确认 `recent_folder` 由 10 行降为 **9 行、该行的 `path_key` 已消失**，其余 8 条的 `last_used_at` 与顺序一字未动——失败路径既不写入也不更新时间。随后停掉 `tauri dev`（旧进程 43292 一并退出、端口 1420 无监听）并重启，新实例 36920 起来后再查仍是同样 9 行、探针路径依旧不在，即删除是真落盘而非只清内存状态。死路径移除项据此勾掉，探针目录已清理。

**仍未完成的桌面项（需用户在窗口里观察）：** 重启后下拉是否仍列这 9 条（对应「启动时按 `last_used_at` 倒序读取前 10 条」子句——上限项已勾，但此子句以本轮重启后的目视为最终凭据，以及最后一条手动验收清单）；「先点『全部』再切换文件夹，应自动弹回『当前目录』」这一明确序列——用户第三轮回报「切换文件夹后历史面板功能正常」，但该句未单独覆盖强制重置口径；以及「读写失败时显示中文错误、列表按空处理、不阻塞加载」，本轮所有落库均成功，失败分支只有代码走查依据，不记作验收。

**第五轮：用户回报「全过」，剩余三项据此勾掉，票据转 `resolved`。** 逐项凭据分清楚：

- 重启后下拉仍列同样 9 条、顺序一致——用户目视确认。这同时补上了第四轮缺的那块：库里的数据本来就完好，缺的只是「启动时那次带绑定参数的 `SELECT ... LIMIT $1` 真的在插件里跑回来了」，目视把它证实了。
- 强制切回「当前目录」——用户按明确序列（先点『全部』、再切换文件夹）确认自动弹回。
- 读写失败分支——用户口头确认，但我这边没有独立证据：本轮所有落库均成功，我没能找到不锁库、不改代码就能注入 SQLite 读失败的可复现手段，故此项凭用户目视而非我的复核。若后续要留硬证据，可用的路子是 issue 39 试过的 `BEGIN EXCLUSIVE` 写锁窗口，但那条路径会连带卡住设置保存，不属于本票范围。

范围说明：本票只做「最近文件夹」，与文件上下文复制记录（历史快照落盘）无关；后者的落盘位置、读写归属与失败语义已由 [issue 48](48-history-snapshot-storage.md) 定案，实现随 [issue 43](43-history-storage-and-workflows.md)。

## Comments

- 2026-11-11：本轮 grilling 决定。用户明确该需求为「只要文件夹被 load 就记录、只存路径字符串、最多 10 条写死、下拉选中联动切换历史面板」，并确认设计原则是简单化处理，不引入复杂业务逻辑。
- 2026-11-11：与既有票据无冲突。代码已在内存中实现「成功加载后插入、归一化去重、截取 10 条」（`loadFolder` 内的 `setRecentFolders`），本票只补持久化、联动与匹配口径；`%APPDATA%\com.keyboardcommand.app\settings.db` 与 SQL 写权限已随 issue 39 落地。
- 2026-11-11：注意与[界面绘制说明](../../../docs/design/文件夹复制界面绘制说明.md) 中「搜索结果下拉最多展示 10 项」是两个互不相关的上限，不要混用同一常量名。

## 验收记录（2026-11-11 第一轮，机验）

**已机验：**

- `bun run build` 通过、`cargo check` 通过（Finished dev profile in 17.03s）。
- 迁移 v2 真实生效：终止 2026-11-10 17:41 遗留的旧 debug 实例（PID 37716，它锁住了 `target\debug\kbcapp.exe` 导致 `tauri dev` 一直 exit 101）后重启，只读查询 `%APPDATA%\com.keyboardcommand.app\settings.db` 确认 `_sqlx_migrations` 有 `version 2 / create_recent_folder / success=1`，且 `sqlite_master` 中 `recent_folder` 的建表 SQL 与票据一致。
- SQL 语义按**真实迁移后的表**（复制 db 副本，不触碰运行中的应用）用 node:sqlite 验证，15 项断言全部通过：空表启动、MRU 排序、大小写/正反斜杠/尾斜杠变体收敛为一条且显示保留最后一次的原始写法、重复加载只更新时间不新增行、第 11 条进入时淘汰最久未用且总数恒为 10、按归一化 key 删除死路径、删除不存在项不报错。
- 写入漏斗唯一：`src` 内只有 `loadFolder`（`FolderCopyApp.tsx:174`）经 `load_directory_tree` 加载新路径；另一处 `FolderCopyApp.tsx:821` 是保存设置后重载**同一个** `currentPath`，不构成未记录的加载入口。四个 UI 入口（对话框 588、输入/刷新 595、下拉 599、手动改路径 609）都走 `loadFolder`。
- 权限：`capabilities/default.json` 的 `sql:default` + `sql:allow-execute` 覆盖 `select`/`execute`；`$1` 位置绑定已由 `saveFolderCopySettings` 在生产路径证明。（node:sqlite 把 `$1` 当命名参数，只是本地 harness 的驱动差异，不影响应用。）

**待桌面验收（本清单已被上面两轮桌面记录逐项取代，保留作为原始计划）：** 加载一个文件夹后确认 `recent_folder` 出现该行且下拉置顶；重启应用确认仍在；用 `E:\X` 与 `e:/x/` 两种写法加载同一目录确认只占一条；从下拉选一个已删除的路径确认中文报错且该条消失；切换文件夹后确认历史面板强制回到「当前目录」筛选。
