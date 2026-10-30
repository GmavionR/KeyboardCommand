# 复制历史快照存储方案比较

日期：2026-10-30

## 结论摘要

对于最多 20 条、每条含较大复制文本以及文件夹、选中路径和时间戳的本地历史记录，建议先采用**单个 SQLite 数据库**作为权威存储：复制文本可直接存为 `TEXT`，文件夹、路径列表可用 JSON 文本或规范化子表，时间戳存整数。添加 `(captured_at DESC, id DESC)` 索引并在列表查询中只取元数据、预览和 `LIMIT`，用户打开某一项时再取全文。数据量上限低，SQLite 已足够简单；把全文拆成文件并不会自动消除复杂度。

如果产品后来需要导出/独立管理正文文件或单条超大文本导致数据库备份、读取成本明显，再转为混合方案：SQLite 管索引元数据，正文用内容哈希命名的独立文件；需增加写入状态、孤儿清理和一致性修复流程。仅文件快照适用于可直接浏览、手工备份的要求优先于检索和跨记录事务的场景。

这符合成熟的本地应用惯例：SQLite 提供事务化结构化元数据和排序查询；Tauri Store 是持久化键值文件，更适合设置或小型状态，不是历史记录查询引擎。Tauri 官方 Store 暴露 `get/set/keys/values/entries/save`，并可手动保存或自动保存；其接口未提供关系查询、按时间排序和事务语义。[Tauri Store 文档](https://v2.tauri.app/plugin/store/)

## 范围与假设

- 上限为 20 条记录；不假设云同步、多进程并发写入或全文检索。
- 每项字段：复制文本、文件夹、选中路径集合、捕获时间戳。文件夹和路径是路径值/快照，不代表复制文件本身。
- “原子写入”指崩溃/断电时不留下半条记录；“恢复”指应用启动时可检测坏数据并尽可能保留可读历史。任何方案都不能替代备份，也不能保证介质损坏后恢复。

## 方案对比

| 维度 | SQLite 单库 | 每条记录一个文件 | 混合：SQLite 元数据 + 正文文件 |
|---|---|---|---|
| 数据建模 | 一次插入即可原子保存全部字段；文本可存 `TEXT`，路径列表可放 JSON 或独立表 | 每个文件可序列化完整记录；文件夹/路径/时间戳都要随正文重复保存 | 元数据表易查询，正文独立；跨库和正文文件的提交不是一个事务 |
| 原子写入 | SQLite 事务将一条记录作为整体提交；SQLite 处理提交时的原子性和崩溃回滚。[Atomic Commit](https://sqlite.org/atomiccommit.html) [事务](https://www.sqlite.org/lang_transaction.html) | 常见做法是同目录写临时文件、flush/sync 后 rename；`std::fs::rename`不能跨挂载点，具体替换语义依平台而异。[Rust rename](https://doc.rust-lang.org/std/fs/fn.rename.html) `tempfile::persist`也提示原子性并非所有平台保证，且它本身不保证同步文件和父目录。[tempfile persist](https://docs.rs/tempfile/latest/tempfile/struct.NamedTempFile.html#method.persist) | 文件可以原子替换，但 SQLite 与正文文件无法用普通单一事务一起提交；必须用先写正文后插入元数据、临时/最终状态或启动修复协议。
| 损坏恢复 | 崩溃中的未完成事务可自动回滚；SQLite 文档强调对崩溃/断电的自动恢复。[How To Corrupt](https://www.sqlite.org/howtocorrupt.html) 完整文件损坏仍需检测、恢复或从备份回滚；官方 recovery 工具尽力从损坏库提取记录，不保证完整。[Recovery](https://sqlite.org/recovery.html) | 独立文件使单条损坏通常局部化，但要逐个解析、校验字段/版本；临时文件可清除。无法原子保护“索引清单 + 多文件”的集合状态 | 单个正文坏掉时其他记录和索引可保留；需把缺正文标为损坏。数据库索引坏损仍影响全局列表；相比 SQLite 单库增加两类一致性检查
| 迁移 | schema 版本和迁移脚本集中管理；迁移可在事务中执行，`rusqlite_migration`说明迁移逐条事务运行，失败回滚。[crate 文档](https://docs.rs/rusqlite_migration/latest/rusqlite_migration/) | 每个文件要有 `schema_version`，启动时批量迁移；版本升级期间易出现新旧文件混杂，回滚/重试需设计 | 数据库迁移加正文格式版本双轨管理；需兼容旧文件并处理部分升级
| 列表/排序 | `ORDER BY captured_at DESC LIMIT 20`；索引支持稳定的最近记录列表；列表时不取正文列可避免读取大文本 | 需要扫描目录、解析文件，再排序；即使只有 20 条也不难，但额外手写排序、坏文件跳过和分页逻辑 | SQLite 快速列出索引，正文延迟读取；好处主要在大正文/导出/隔离需求，不是 20 条列表性能
| 运维复杂度 | 最低；一个持久数据源，SQLite/Rust 生态成熟 | 低至中；易人工查看和逐条备份，但目录枚举与原子替换细节需处理 | 最高；需要协调库与文件的删除、写入、恢复、迁移和孤儿清理 |

## 推荐数据形状与操作

```sql
CREATE TABLE history (
  id            INTEGER PRIMARY KEY,
  captured_at   INTEGER NOT NULL,
  folder        TEXT,
  selected_paths TEXT NOT NULL, -- JSON 数组；若需按路径查询则改为子表
  content       TEXT NOT NULL
);
CREATE INDEX history_recent ON history(captured_at DESC, id DESC);
```

1. 捕获时在一个 SQLite 事务中插入整条记录，再裁剪超出上限的旧记录。时间戳并列时用 `id` 提供稳定顺序。
2. 列表查询只取 `id, captured_at, folder, selected_paths` 和由正文派生的短预览（预览可在写入时单独存），排序加 `LIMIT 20`；选中记录后按 `id` 读取全文。实际只有 20 条，若界面需要全部渲染全文，也可一次读取全部，保持设计简单。
3. schema 变更通过带版本号的事务迁移；若采用外部迁移 crate，迁移失败应回滚，迁移前备份是额外保险而非迁移原子性的替代。
4. 使用 SQLite 默认可靠同步设置，避免为微小历史写入把 `synchronous` 降为 `OFF`；SQLite 指出关闭同步会在系统崩溃/断电时增加数据库损坏风险。[SQLite corruption guidance](https://www.sqlite.org/howtocorrupt.html)
5. 若未来引入正文文件：先写入同目录临时文件并持久化，再按不可变内容哈希重命名；之后在事务中写元数据。启动时清理无元数据引用的正文文件，并将元数据指向缺失文件的条目标成不可读取/可删除。删除顺序优先删元数据，再异步清理孤儿正文，避免用户看到指向不存在正文的有效条目。

## 数据库位置与 Tauri 边界

使用 Tauri Rust API 的应用数据目录（例如 `app.path().app_data_dir()`）放数据库及附属备份，而不是依赖当前工作目录；Tauri 官方示例使用 `app_local_data_dir()`解析插件文件路径，文档也说明 `app_data_dir`/`app_local_data_dir`可被统一目录覆盖。[Tauri 插件开发示例](https://v2.tauri.app/develop/plugins/) [目录覆盖配置](https://v2.tauri.app/reference/config/#appdirectoriesoverride)

如正文最终存文件，路径由 Rust 后端基于应用数据目录生成；不要直接把不受信任的路径片段拼进文件名。Tauri 文件系统插件的访问由 capability scope 控制，应用可通过最小范围授权文件访问。[Tauri File System](https://v2.tauri.app/plugin/file-system/)

## 决策

当前规模的默认选择为**SQLite 单库**。它以一次事务原子保存所有字段，迁移和最近列表查询直接，避免双存储一致性问题。纯文件快照在“人工可见、逐条导出”是核心需求时再选；混合方案只在正文文件独立性有明确收益时引入，并接受额外恢复与迁移责任。
