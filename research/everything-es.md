# Everything `es.exe` 作为实时搜索加速器的评估

## 结论

建议把 `es.exe` 作为用户可选、可检测的加速后端进行后续原型评估，不应成为应用的必要依赖或唯一搜索实现。Everything 的名称/路径索引适合对已索引文件夹做实时名称查询；覆盖范围取决于用户机器配置，未索引、未运行、索引尚未加载和查询失败都必须回退到应用自己的目录遍历。它不能替代文件夹树加载、文件内容读取、扩展名白名单或忽略目录规则。

## 官方能力与边界

- 官方将 ES 定义为从命令提示符或 PowerShell 查询 Everything 的 CLI，要求 Everything 已安装并正在运行。默认 ES 不等待数据库加载，数据库未加载时可能返回空结果；`-timeout <毫秒>` 可等待加载。[CLI 文档](https://voidtools.com/support/everything/command_line_interface/)
- `-path <path>` 将查询限制到指定路径内，`-parent-path`/`-parent` 可限制父目录；`-match-path` 让搜索词匹配完整路径。支持 `-count`、`-ad`（仅文件夹）和 `/a-d`（仅文件）。[CLI 文档](https://voidtools.com/support/everything/command_line_interface/)
- 输出支持 `-json`、`-csv`、`-tsv`、`-txt`、EFU 等格式；JSON 可用于结构化消费。实现时仍应核实目标版本字段形状、转义和空值行为。`-full-path`、`-no-folder-append-path-separator` 有助于一致地处理路径。[CLI 文档](https://voidtools.com/support/everything/command_line_interface/)
- Everything 默认索引所有本地固定 NTFS 卷；名称和路径始终索引，大小/日期等字段可选。它通过 NTFS USN Change Journal 构建和监控 NTFS 索引，并据官方说明实时维护；停机期间变更由 NTFS 日志保留以供追踪。但日志溢出、重建等仍可能影响新鲜度，Everything 不应成为应用文件树状态的权威来源。[索引说明](https://www.voidtools.com/support/everything/indexes/) [选项说明](https://www.voidtools.com/support/everything/options/) [FAQ](https://www.voidtools.com/faq/)
- 可移动 NTFS 卷可在选项中显式纳入，也可启用自动包含，不能假定已配置。网络共享、映射盘、FAT/FAT32 等可通过 Folder Indexing 纳入；首次扫描可能需要数分钟，完成前不可搜索。Folder Indexing 慢于原生 NTFS 索引，监控/重扫设置及管理员身份会影响可用性；Everything 以管理员运行时映射盘不可用。文件夹索引不要求 Everything Service。[索引说明](https://www.voidtools.com/support/everything/indexes/) [Folder Indexing](https://voidtools.com/support/everything/folder_indexing/)
- Everything Service 是提升 NTFS 索引访问能力的方式，并非 ES 独立运行的索引服务。官方称无 Service 也能索引 NTFS，但速度较慢；CLI 仍要求 Everything 客户端进程运行。应用不应静默安装、启动或配置 Everything。[Service 文档](https://www.voidtools.com/support/everything/everything_service/) [CLI 文档](https://voidtools.com/support/everything/command_line_interface/)

## 对 KbcApp 搜索的适配

KbcApp 要求在选定文件夹下实时匹配文件和文件夹名称。`-path` 与 `-json` 在接口层面适配：应用可把用户输入作为搜索词，以路径范围限制结果，再按当前目录、白名单及忽略目录配置过滤。要正确处理路径边界（例如不能把 `C:\work\foo2` 当作 `C:\work\foo` 子目录）、大小写/通配符语义、进程超时、输出上限和取消。输入应作为独立参数传递，避免命令行注入；PowerShell 7.3+ 可使用官方 `-argv` 原生参数传递选项。

ES 只检索 Everything 数据库中已索引项目。选中目录未被索引时，空结果不代表目录没有匹配项；需要区分成功无命中与不可用/未索引，或用本地枚举验证。CLI 退出码 8 表示未找到 Everything IPC 窗口，7 表示 IPC 查询失败，4/6 表示参数错误；只有加 `-no-result-error` 时，无结果才返回 9。默认无结果也可能返回成功，不能仅凭退出码判断索引覆盖完整。[CLI 文档](https://voidtools.com/support/everything/command_line_interface/)

## 方案比较与建议

| 方案 | 适用点 | 代价与边界 |
| --- | --- | --- |
| 应用内 Rust 遍历 | 对打开目录提供完整性可控的搜索；不依赖外部程序；覆盖未索引卷 | 大目录需自行实现异步遍历、取消、去重、忽略目录、分页及变更处理；重复全量扫描会产生 I/O，应复用已加载树或增量扫描 |
| Everything `es.exe` 可选后端 | 复用现有索引；支持路径范围和结构化输出；适合大范围名称查询 | 依赖 Everything 安装且运行、目录已索引、版本及参数兼容；外部进程/IPC/解析和状态判断增加复杂度；搜索语义可能与应用规则不同 |
| Rust 搜索库 | 可复用遍历或匹配组件，避免依赖另一桌面应用 | 库仍需访问目标目录，不能自动复用 Everything 数据库；需评估 crate 维护情况、Windows 路径行为和许可证，不能仅凭 Rust 库推断更快 |

建议以应用目录扫描或已加载树作为可靠基线；仅在检测到 Everything、可连接且查询路径可用时调用 ES。未运行、超时、解析/IPC 错误或路径覆盖不明时回退本地搜索，并保持一致的过滤规则。可提供加速设置和状态说明，不要求普通用户安装 Everything。只搜索已加载的单一目录时，在内存树上过滤通常更简单；ES 更适合跨已索引范围查找或大目录的快速定位。

目前没有针对 KbcApp 目录规模、交互延迟或本机 Everything 的可比基准。voidtools FAQ 的索引时间是其自有示例，不能推导本应用端到端速度。本报告不承诺性能倍率；是否默认启用应由后续真实目录基准和缺索引体验验证。

## 来源

- [voidtools：Command Line Interface](https://voidtools.com/support/everything/command_line_interface/)
- [voidtools：Indexes](https://voidtools.com/support/everything/indexes/)
- [voidtools：Folder Indexing](https://voidtools.com/support/everything/folder_indexing/)
- [voidtools：Everything Service](https://voidtools.com/support/everything/everything_service/)
- [voidtools：Options](https://voidtools.com/support/everything/options/)
- [voidtools：FAQ](https://www.voidtools.com/faq/)
- [voidtools 官方 ES 源码仓库](https://github.com/voidtools/es)
