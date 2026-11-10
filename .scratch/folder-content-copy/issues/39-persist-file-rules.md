# 39：持久化文件规则设置

**要构建：** 用户能在页面规则设置中查看、修改并保存白名单、排除规则、忽略目录及大目录阈值；设置经 SQLite 持久化并在保存后应用到当前目录。

**阻塞于：** [初始化桌面应用并接入现有页面](37-application-shell-and-ui.md)、[浏览真实目录并加载文件树](38-directory-tree-and-pagination.md)

**状态：** claimed
**标签：** ready-for-agent

**设计来源：** `playground/KeyboardCommand_Folder_Copy/docs/design.md` 是设置弹窗 UI 与交互的当前基准；规则语义、默认值和失败行为见 `.scratch/folder-content-copy/spec.md`。

- [ ] 打开设置时从 SQLite 查询配置；查询成功但无记录时展示默认值，查询失败时禁用编辑表单并提供重试和关闭。
- [ ] 白名单、名称排除规则、忽略目录及大目录阈值均可按设计增删，并支持各自独立恢复默认；阈值只接受正整数，无效值禁用保存。
- [ ] 保存将全部配置置于同一 SQLite 事务；成功后关闭弹窗并以新配置重新加载当前目录。
- [ ] 保存失败时回滚数据、保留未保存草稿和当前页面状态，不关闭弹窗或重载；提供中文错误摘要和可展开的技术详情，并可重试或取消。
- [ ] 树、搜索、递归选择和历史选择恢复使用同一套当前规则；此票据至少验收树重载后规则立即生效。
- [ ] 逐条完成前，先运行 `ego-browser skill` 并用 ego-browser 检视 playground 设置弹窗及交互；对照设计稿后，在桌面应用中手动验收 SQLite 读写、验证、失败保留和成功重载流程。

**实现进度（2026-11-10）：** 接入 Tauri 官方 SQL 插件与 SQLite 迁移；前端设置弹窗改为从 SQLite 读取并以单条参数化 upsert 保存完整配置，保存后应用规则并重载当前目录。`bun run build` 与 `cargo check` 通过，桌面应用启动成功。尚未完成设置弹窗的桌面交互验收：当前 computer-use 截图与目标窗口内容不匹配，无法可靠操作控件；本票据保持处理中，待完成手动验收后再勾选验收项并关闭。

**问题修复（2026-11-10）：** 用户反馈添加 `.txt` 白名单后重启再打开规则页面看不到。检查应用 SQLite 数据库发现 `folder_copy_settings` 尚无设置记录；Tauri SQL 插件的 `sql:default` 不包含写权限，导致 `database.execute(...)` 无法保存。已在 `src-tauri/capabilities/default.json` 添加 `sql:allow-execute`。`bun run build`、`cargo check` 和 `git diff --check` 通过。尚未完成桌面界面中的保存与重启复验，因此票据仍保持处理中。
