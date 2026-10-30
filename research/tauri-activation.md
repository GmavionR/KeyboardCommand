# Tauri 2 Windows 单实例与外部激活方案

## 结论

推荐以官方 `tauri-plugin-single-instance` 实现 Windows 单实例和后续启动转发；CLI 与 AutoHotkey v2 直接启动已安装的 EXE 并传入稳定参数（如 `--route settings/keyboard`）。Rust callback 校验请求、显示/恢复/聚焦窗口，再把导航请求交给前端；冷启动 argv 与二实例 callback 应归一到同一请求处理流程。若将来需要浏览器等以 URL 打开应用，再采用官方 `deep-link` 插件并启用其 single-instance 集成。单纯 CLI/AHK 路由不需要自建 IPC 或模拟按键。

## 官方单实例机制

[Tauri 官方文档](https://tauri.app/plugin/single-instance/)列出 Windows 支持，callback 接收 `AppHandle`、新实例参数 `args` 和启动目录 `cwd`，且要求插件最先注册。默认不会自动聚焦窗口，应用需实现窗口行为。

[Windows 源码](https://github.com/tauri-apps/plugins-workspace/blob/v2/plugins/single-instance/src/platform_impl/windows.rs)显示实现以 bundle identifier 创建 mutex 和隐藏事件窗口；第二实例通过 `WM_COPYDATA` 传 cwd/argv，首实例调用 callback，第二实例退出。因此它适用于同一应用标识的进程间转交，不是通用双向 RPC。参数需短小、明确并在应用内校验。

[插件 changelog](https://github.com/tauri-apps/plugins-workspace/blob/v2/plugins/single-instance/CHANGELOG.md)记录 Windows callback 聚焦支持及启动竞态修复。文档当前标注 Rust 最低版本 1.90，实施时须核对项目工具链和依赖版本。

## CLI / AutoHotkey

CLI 与 AHK 可运行安装后的 EXE 并传稳定参数，例如 `KeyboardCommand.exe --route settings/keyboard`。单实例插件会把第二次启动参数交给首实例。路径参数必须明确相对路径基准，因为 callback 同时提供调用者 cwd；不应默认相对安装目录。AHK v2 的 [Run](https://www.autohotkey.com/docs/v2/lib/Run.htm) 可启动目标程序并带命令行，注意 Windows 参数引号和空格处理。AHK 仅做启动器，不承担协议转发或窗口键盘模拟。

## URL deep link

[Tauri Deep Linking 文档](https://v2.tauri.app/plugin/deep-linking/)说明 Windows/Linux 桌面 URL 会作为新进程命令行参数传递；启用 `single-instance` 插件的 `deep-link` feature 后，可把 URL 交给运行中的唯一实例。适用于浏览器、文件管理器或其他程序点击 `keyboardcommand://...` 的场景。代价是 scheme 注册/打包配置与 URL 输入校验。冷/热启动都应交给同一导航请求处理器。

## 方案比较

| 方案 | 适用性 | 约束 |
|---|---|---|
| `single-instance` + argv | 推荐给 CLI/AHK 命令式激活 | callback 是 Rust 主进程，SPA 路由尚可能未 ready；需把请求排队/交给前端，并处理 show、unminimize、focus |
| `deep-link` + single-instance feature | 推荐给外部 URL 打开 | 需 scheme 注册、打包集成和 URL 白名单验证 |
| 自建 named pipe / IPC | 仅当需要直接双向 RPC、响应确认或更复杂消息 | 自行处理锁、发现、权限、协议、生命周期，路由激活场景重复官方能力 |
| AHK 发窗口消息/模拟按键 | 不推荐 | 依赖焦点、窗口句柄和时序；不能可靠传递结构化请求 |

## 路由交接与规格建议

- callback 是 Rust 与前端 SPA 的边界：解析/校验参数、恢复窗口、发送带 payload 的内部请求；不要假定 React/TanStack Router 已初始化，前端需在 ready 后处理。
- 首次进程的启动 argv 不会走二实例 callback；两种入口归一化后才可保证冷启动和热启动一致。
- 使用稳定公开命令（例如 `--route <key>`）而非暴露内部组件名/前端 URL；拒绝未知 route，并明确 cwd/路径参数语义。
- 窗口隐藏/最小化时需恢复和聚焦。Windows 对前台激活有限制；当前插件 changelog 说明其 callback 聚焦支持。
- deep-link 作为未来扩展，不是 CLI/AHK 的必要依赖。自建 IPC 仅在后续出现双向请求需求时再评估。

## 推荐写入规格的要求

要求 Windows 单实例；外部 CLI/AHK 通过稳定参数激活受支持功能；隐藏/最小化窗口恢复并聚焦；冷启动与热启动采用统一请求语义；输入经过白名单校验。实现优先使用官方 single-instance 插件，AHK v2 只启动安装 EXE 并传参。未来需要可点击 URL 时再加入 deep-link 和其 single-instance feature。

## 来源

- [Tauri Single Instance Plugin](https://tauri.app/plugin/single-instance/) — 平台、安装、回调和注册顺序。
- [Tauri Deep Linking](https://v2.tauri.app/plugin/deep-linking/) — 桌面 URL 参数与 single-instance 集成。
- [Windows 实现源码](https://github.com/tauri-apps/plugins-workspace/blob/v2/plugins/single-instance/src/platform_impl/windows.rs) — mutex、事件窗口、WM_COPYDATA、args/cwd。
- [插件 changelog](https://github.com/tauri-apps/plugins-workspace/blob/v2/plugins/single-instance/CHANGELOG.md) — Windows 聚焦及缺陷修复。
- [AutoHotkey v2 Run](https://www.autohotkey.com/docs/v2/lib/Run.htm) — 程序启动接口。
