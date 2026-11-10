# 39：持久化文件规则设置

**要构建：** 用户能在页面规则设置中查看、修改并保存白名单、排除规则、忽略目录及大目录阈值；设置经 SQLite 持久化并在保存后应用到当前目录。

**阻塞于：** [初始化桌面应用并接入现有页面](37-application-shell-and-ui.md)、[浏览真实目录并加载文件树](38-directory-tree-and-pagination.md)

**状态：** completed
**标签：** ready-for-agent

**设计来源：** `E:\DevProjects\LocalProjects\tauriProjects\KeyboardCommand_Folder_Copy\docs\design.md` 是设置弹窗 UI 与交互的当前基准；该独立演示项目的 `src/components/folder-copy/SettingsModal.tsx` 仅作 UI/交互参考。规则语义、默认值和失败行为见 `.scratch/folder-content-copy/spec.md`。

- [x] 打开设置时从 SQLite 查询配置；查询成功但无记录时展示默认值，查询失败时禁用编辑表单并提供重试和关闭。
- [x] 白名单、名称排除规则、忽略目录及大目录阈值均可按设计增删，并支持各自独立恢复默认；阈值只接受正整数，无效值禁用保存。
- [x] 保存将全部配置置于同一 SQLite 事务；成功后关闭弹窗并以新配置重新加载当前目录。
- [x] 保存失败时回滚数据、保留未保存草稿和当前页面状态，不关闭弹窗或重载；提供中文错误摘要和可展开的技术详情，并可重试或取消。
- [x] 树、搜索、递归选择和历史选择恢复使用同一套当前规则；此票据至少验收树重载后规则立即生效。
- [x] 逐条完成前运行 `ego-browser skill`，并用 ego-browser 检视外部演示设置弹窗及交互；在桌面应用中手动验收 SQLite 读写、无记录默认值、验证、保存失败保留和成功重载流程。
- [x] 在隔离 SQLite 数据库中令设置查询失败，并在桌面应用中确认编辑表单禁用、技术详情可展开、重试和关闭可用。

**实现进度（2026-11-10）：** 接入 Tauri 官方 SQL 插件与 SQLite 迁移；前端设置弹窗改为从 SQLite 读取并以单条参数化 upsert 保存完整配置，保存后应用规则并重载当前目录。`bun run build` 与 `cargo check` 通过，桌面应用启动成功。尚未完成设置弹窗的桌面交互验收：当前 computer-use 截图与目标窗口内容不匹配，无法可靠操作控件；本票据保持处理中，待完成手动验收后再勾选验收项并关闭。

**问题修复（2026-11-10）：** 用户反馈添加 `.txt` 白名单后重启再打开规则页面看不到。检查应用 SQLite 数据库发现 `folder_copy_settings` 尚无设置记录；Tauri SQL 插件的 `sql:default` 不包含写权限，导致 `database.execute(...)` 无法保存。已在 `src-tauri/capabilities/default.json` 添加 `sql:allow-execute`。`bun run build`、`cargo check` 和 `git diff --check` 通过。尚未完成桌面界面中的保存与重启复验，因此票据仍保持处理中。

**继续处理（2026-11-10）：** 系统设置中的数据库路径原为硬编码的 `%APPDATA%/kbc-app/settings.db`，与 SQL 插件实际使用的应用配置目录不一致。现改为从 Tauri `appConfigDir()` 获取目录，并与设置数据库共用 `settings.db` 文件名。`bun run build` 与 `git diff --check` 通过。桌面端尚未能启动：本机通过 mise shim 解析工具链时尝试联网安装，离线失败；直接启动 Tauri 开发模式也未出现应用窗口。保存、重启及规则生效仍待桌面端验收，票据保持处理中。

**桌面验收记录（2026-11-10）：** 已在 Tauri 桌面端确认系统设置显示真实 SQLite 路径；规则弹窗加载 SQLite 中 17 条白名单（含 `.txt`）、8 条排除规则、28 个忽略目录及阈值 50。应用重启后 `.txt` 仍存在。通过临时目录验证规则保存后树立即按新增/移除的规则更新；最终恢复原始设置（白名单 17 条，`.txt` 存在，临时 `.bin` 不存在，阈值 50）。阈值设为 0 时显示错误并禁用保存。保存失败保留草稿的代码路径具备中文摘要和技术详情，但本次 SQLite 写锁窗口未能捕获失败提示，不能记作完成该项手动验收。查询失败交互与 playground 的 ego-browser 对照也尚未完成（仓库/已知技能目录中未找到该技能）。

本轮 `git diff --check` 通过；重新运行 `bun run build` 时 mise 因离线解析工具链并遇到工具目录权限错误而未能启动构建，先前记录的 build 成功仍有效。故验收清单尚未全部完成，票据继续保持 `claimed`。

**ego-browser 恢复后复验（2026-11-10）：** 技能与 CLI 已恢复，`ego-browser skill` 输出 v2.2.0 使用指南。但 `ego-browser nodejs` 无法连接正在运行的 ego lite 服务并持续等待，检查桌面应用列表也未发现 ego lite 窗口；已尝试启动 CLI 所在程序，服务仍未上线。当前检出目录仍不包含规格引用的 playground 目录/`design.md`。已请求用户启动 ego lite 并完成引导后继续。浏览器对照项暂未完成，票据状态维持 `claimed`。

**ego-browser 恢复后的继续验收（2026-11-10）：** 用户确认 ego lite 已完成引导并运行。通过提升的本地执行环境后，`ego-browser nodejs` 已连接成功；在同一个 TaskSpace 打开 `http://localhost:1420/folder-copy`，确认这是当前应用页面。当前仓库及项目父目录未发现 playground 或其 `design.md`，因此无法进行原型对照。桌面端窗口本轮已退出，启动现有 `kbcapp.exe` 未能出现窗口；短暂 SQLite 写锁随后中止并回滚。只读复核确认 `folder_copy_settings` 记录仍在，临时 `.failtest` 和 `.bin` 均未写入。保存失败界面验收仍待应用窗口可用时完成，票据保持 `claimed`。

**保存失败手动验收补充（2026-11-10）：** 复用现有 Vite 服务直接运行 Tauri 桌面端后，建立 SQLite `BEGIN EXCLUSIVE` 写锁并在规则弹窗中保存临时 `.failtest`。界面显示“设置保存或应用失败，草稿和当前页面状态已保留”，展开技术详情显示 `error returned from database: (code: 5) database is locked`；弹窗仍开且 `.failtest` 草稿仍在。点击取消后弹窗关闭。写锁事务回滚后只读查询确认白名单仍为 17 条、`.txt` 存在、`.failtest`/`.bin` 不存在，阈值仍为 50。保存失败验收现已完成。仍未完成 SQLite 空记录/查询失败场景和独立恢复默认验收；ego-browser 已恢复，但引用的 playground/`design.md` 不在当前工作区或项目父目录，故票据继续保持 `claimed`。

**规则控件验收补充（2026-11-10）：** 已在未保存草稿中逐项检查白名单、排除规则、忽略目录和大目录阈值的独立恢复默认操作；各区恢复后分别回到默认列表/阈值（白名单 16、排除规则 8、忽略目录 28、阈值 50），并通过取消关闭弹窗，未更改数据库。源码中搜索、递归选择、树节点选择和历史恢复使用 `isFileAllowed`/同一设置对象；此前已手动验证树重载后过滤立即生效，故上述规则验收项完成。仍有 SQLite 无记录默认值/查询失败交互和 playground 对照未验收；当时定位错误的 playground 目录，后由用户提供的独立项目路径见下方本轮记录。

**继续验收（2026-11-10）：** 按项目要求先执行 `ego-browser skill`，确认 CLI 使用指南 v2.2.0。现已在用户提供的独立演示项目 `E:\DevProjects\LocalProjects\tauriProjects\KeyboardCommand_Folder_Copy` 中找到 `docs/design.md` 和规则设置弹窗源码；其中设置页 UI 分区及默认值恢复交互可与本仓库 `SettingsModal` 对照，演示代码仍为 mock data。代码检查确认 `loadFolderCopySettings()` 在 SQLite 查询成功但无记录时复制并返回默认设置；加载 Promise/查询失败会被 `FolderCopyApp.handleLoadSettings()` 捕获并传给弹窗，弹窗显示读取错误、禁用编辑表单并提供重试和关闭。此次仍未能通过 ego-browser 渲染演示项目：外部项目没有 `node_modules`/运行中的 Vite 服务；也未启动外部项目以避免在只读目录产生依赖和构建写入。桌面应用启动后显示 `localhost` 的 `ERR_CONNECTION_REFUSED`；虽然仓库内 Vite 已启动，Tauri 窗口未连上开发服务，故不能声称已完成读取失败及空记录的 UI 手动验收。已有 SQLite 中用户规则数据未被修改。本票据继续 `claimed`，待浏览器和桌面 UI 可连接时完成最后一项手动验收。

**纠正并补充验收（2026-11-10）：** 用户确认外部演示项目已有 `node_modules`，故启动其 Vite `http://localhost:3000/` 并通过 ego-browser 打开设置弹窗，检查了四类规则配置、独立恢复默认、正整数阈值校验和 SQLite 写入失败模拟控件。前条“无 node_modules”判断不准确，现已纠正。直接运行 debug exe 时会因没有对应的本地 Vite 服务而显示 `ERR_CONNECTION_REFUSED`；改用 `bun run tauri dev` 后 Tauri 启动链路正常，桌面页面成功加载。规则弹窗从正式应用 SQLite 读取到白名单 17 项（含 `.txt`）、排除 8 项、忽略目录 28 项及阈值 50；仅查看后关闭，未保存或更改这些设置。

为验证 SQLite 无记录分支，使用临时 Tauri application identifier `com.keyboardcommand.issue39isolated` 启动独立应用/数据库；弹窗显示默认白名单 16 项、排除 8 项、忽略目录 28 项及阈值 50，确认默认回退正常。之后仅对该隔离测试数据库修改列名来制造查询错误，并重新启动隔离应用；在打开规则弹窗检查错误 UI 前，computer-use 报告检测到用户输入，按工具要求停止进一步控制。隔离配置文件及测试数据库已清理。正式应用数据库未被该测试写入。此前记录的保存失败（写锁回滚且草稿保留）、有效规则保存后重载、阈值验证和独立恢复默认验收依旧有效。该轮的查询失败界面没有由本代理观测；用户随后确认已在桌面应用手动测试该场景且功能正常，见下方完成确认。

**完成确认（2026-11-10）：** 用户确认已在桌面应用手动测试 SQLite 查询失败场景，功能正常。结合前述隔离数据库空记录默认值验收、设置读写/失败回滚、输入验证、规则应用与重载，以及 ego-browser 演示对照，issue39 验收完成。
