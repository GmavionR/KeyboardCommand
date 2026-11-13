# 44：接入系统设置与桌面能力

**要构建：** 用户能通过现有系统设置页面查看真实应用/存储状态，并使用设计中定义的主题和系统级行为控制。

**阻塞于：** [初始化桌面应用并接入现有页面](37-application-shell-and-ui.md)、[持久化文件规则设置](39-persist-file-rules.md)、[持久化并管理复制历史](43-history-storage-and-workflows.md)

**状态：** resolved
**标签：** ready-for-agent

**设计来源：** 外部演示项目 `E:\DevProjects\LocalProjects\tauriProjects\KeyboardCommand_Folder_Copy\docs\design.md` 第 4.1 节「系统设置与页面设置解耦」是当前基准（原文写的 `playground/KeyboardCommand_Folder_Copy/docs/design.md` 是同一份文件的旧仓库内路径，仓库内 `playground/` 已随 issue 46 删除，外部演示项目仍在）。该节把全局系统设置限定为四组：外观主题、应用更新、存储核心（DB 路径与读写连接状态）、快捷键速查清单；不得保留 mock 版本号、数据库状态或占用值作为正式数据。

- [x] 系统设置提供跟随系统、浅色、深色三态主题；跟随系统时响应 Windows 明暗变化，选择结果在重启后保持。既有 `src/context/ThemeContext.tsx` 已真实实现，本次核对无需改动：`localStorage['kbc_theme_mode']` 持久化三态选择，`matchMedia('(prefers-color-scheme: dark)')` 注册 `change` 监听实时跟随，`isDark` 落到 `<html>` 的 `.dark` 类与 `colorScheme`。
- [x] 版本、更新状态、SQLite 连接/模式/路径、应用数据占用和历史数量来自实际应用状态；SQLite 不可用时如实呈现错误状态。版本改用 `@tauri-apps/api/app` 的 `getVersion()` / `getTauriVersion()`（替换写死的 `v1.2.4` 与「Electron 32 + Node.js 22」假架构描述）；连接状态改为真连一次库读 `PRAGMA journal_mode`，读到什么显示什么，连不上显示红色「● 无法连接」加错误详情（替换写死的「● 已连接 (WAL Mode)」）；路径、占用与历史条数来自新增 Rust 命令 `storage_stats`（替换写死的「2.4 MB (历史快照 20 条已保留)」）。占用与连接两项独立读取、独立报错，一项失败不影响另一项如实显示。
- [x] 更新检查不显示固定模拟成功状态；发行更新端点未配置时清晰呈现不可用状态。更新服务端、签名和发布通道部署不属于本票据。删掉 `setTimeout` 900 毫秒后必报「已是最新版本」的假检查与「每天自动检查一次」的自动更新开关；按钮改为禁用态「检查更新（不可用）」，并在组内常驻琥珀色说明：未配置更新端点，因此不做在线检查、不给任何「已是最新」结论，发布日志同样不可用。
- [x] 全局快捷键说明与实际生效快捷键一致。分组名从「系统级行为与全局快捷键」改为「应用内快捷键与界面行为」，并注明「仅在应用窗口获得焦点时生效」——两个快捷键都是 `window` 上的 `keydown` 监听，不是系统级注册热键。清单补齐为实际存在的两条：`Ctrl + Shift + C` 复制已勾选文件的上下文包（`src/FolderCopyApp.tsx:476`）、`Ctrl + F` 聚焦搜索框（`src/components/folder-copy/SearchBar.tsx:101`）。
- [~] 按设计接入系统启动和桌面通知控制，并在操作失败时反馈。**本项移出本票据，转 [issue 54](54-autostart-notification-and-global-hotkey.md)。** 用户选择「只做诚实化，零新依赖」范围：这两项此前是勾选后不写任何存储、重启即复位的空开关，属于骗人的界面，先删除；能力接入后再出现。设计基准第 4.1 节的全局系统设置四组里本来也没有这两个开关，删除同时是回归设计基准。分组末尾留一句说明，讲清为什么这里没有这些开关。
- [x] 逐条完成前，先对照设计基准检视系统设置弹窗的主题与快捷键分组；对照后在桌面应用中手动验收主题持久化、真实存储状态和可用的系统控制。设计对照已完成（读 design.md 第 4.1 节，见上）。**桌面应用手动验收移交用户执行（待完成），见下方验收记录。** 原条目要求的 ego-browser 检视 playground 按 `spec.md` 第 66 条替换为对照设计文档 + 在运行中的应用里检视。

## Comments

- 2026-11-13：用户在推送 issue 53 后要求分析下一个任务，本票据是当时唯一未完成的实现票据（5 项全未勾选）。经 AskUserQuestion，用户选定范围「只做诚实化，零新依赖」：拆掉全部假数据，接真实版本号、SQLite 连接状态、磁盘占用、历史条数；更新检查改为诚实呈现「未配置更新端点」；自启/通知开关在能力接入前先移除；快捷键文案改为「应用内快捷键」。不引入任何新依赖或新插件。
- **零新依赖的依据**：`getVersion()` / `getTauriVersion()` 属 `core:app:default`，已随现有 `core:default` 授权，capability 文件无需改动；自定义 Rust 命令（`storage_stats`）与既有 `list_history` 一样不需要 capability 条目。因此本次 `Cargo.toml`、`package.json`、`capabilities/` 全部未改。
- **两个目录分别取真实路径，不靠假设**：设置数据库由 sql 插件落在 `app_config_dir()`（依据 `E:\Packages\cargo` 下 `tauri-plugin-sql-2.6.0/src/wrapper.rs:92`），历史快照落在 `app_data_dir()`。Windows 上两者同为 `%APPDATA%\{identifier}`，但 `storage_stats` 仍分别解析并下发两个真实路径，界面也分两格显示，不把「同根」写死进前端。
- **WAL / SHM 计入占用**：`database_bytes` 累加 `settings.db`、`settings.db-wal`、`settings.db-shm` 三个文件；WAL 模式下漏掉 sidecar 会把占用报小。`-journal` 不计（回滚日志模式的临时文件，本项目用 WAL）。历史目录平铺存放，`directory_bytes` 只累加文件本身、不递归子目录。
- **上限 20 只有一处事实来源**：`StorageStats` 一并下发 `history_limit`（取 Rust 常量 `HISTORY_LIMIT`），前端显示 `{count} / {limit} 条`，不在 TypeScript 里再写一遍 20。字节格式化复用既有 `src/utils/treeUtils.ts` 的 `formatBytes`，不新写格式化函数。
- **map.md 第 64 条的 WebView 右键菜单决定本就在本票据落地，但此前从未写进票据正文**：`src/data/browserMenuPolicy.ts` + 本弹窗的「允许 WebView 右键菜单」开关已实现（开发版默认允许、发布版默认屏蔽、选择持久化到 `localStorage['kbc_allow_browser_menu']`）。本次只把所在分组改名，开关行为与文案未动。该决定实现完毕，补记于此。
- 新增前端数据模块 `src/data/systemStatus.ts`：`loadStorageStats()` 薄封装 `invoke('storage_stats')`，`loadAppVersion()` 并发取应用与 Tauri 版本，`loadJournalMode()` 复用既有 `getDatabase()` 读 `PRAGMA journal_mode`（读不到值就抛错，不预设 WAL）。
- 弹窗新增刷新按钮，可重读连接状态与磁盘占用；复制历史后占用变化不必关闭重开弹窗才能看到。

## 验收记录

机器证据（已完成）：

- `cargo test --lib`：27 项通过。本次新增 4 项覆盖存储统计纯逻辑——平铺目录求和且忽略子目录（150 字节）、目录不存在时返回 0、`-wal`/`-shm` 计入而 `-journal` 不计（4640 字节）、首次写入前占用为 0。
- `cargo check` 与 `cargo check --release` 均通过；`bun run build`（`tsc && vite build`）无类型错误、构建成功。
- 设计对照：外部演示项目 design.md 第 4.1 节定义的四组（外观主题 / 应用更新 / 存储核心 / 快捷键清单）与实现后的四节一一对应；该节未定义自启与通知开关，删除后与基准一致。
- **浏览器内检视不可行，已实测确认**：起了 vite dev server 并用 ego-browser 打开 `http://localhost:3579/folder-copy`，`#root` 始终为空。原因在 `src/main.tsx:31-44`——`bootstrap()` 先 `await listen('activation-request')` 再 `await invoke('initial_activation')`，之后才 `createRoot().render()`；普通浏览器没有 Tauri IPC，两个 await 直接抛错，整页不渲染。这是既有外壳设计，不属本票据范围，未改动。因此本票据的界面核验只能在真实桌面应用中进行，全部交用户执行。

用户桌面验收（待执行，按项目约定由用户在运行中的桌面应用完成）：

- 主题：三态切换即时生效；选「跟随系统」后切换 Windows 明暗，界面实时跟随；选浅色或深色后重启应用，选择保持。
- 版本：显示的应用版本与 `tauri.conf.json` 一致，Tauri 版本与 `Cargo.toml` 依赖一致，不再出现 `v1.2.4` 与 Electron/Node.js 字样。
- 存储：数据库路径与历史目录路径可在资源管理器中打开且确实存在；复制一次文件后点刷新，历史条数 +1、占用随之变化；条数显示为 `N / 20`。
- 更新：「检查更新（不可用）」为禁用态且不可点击，琥珀说明常驻，任何情况下都不出现「已是最新版本」。
- 快捷键：窗口获得焦点时 `Ctrl + Shift + C` 复制、`Ctrl + F` 聚焦搜索；应用失焦时两者不生效（与「仅在应用窗口获得焦点时生效」的说明一致）。
- 右键菜单开关：发布版切换后重启仍生效；输入框内原生右键粘贴始终可用。