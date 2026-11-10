# 47：接入命令行激活与单实例导航

**父票据：** [初始化桌面应用并接入现有页面](37-application-shell-and-ui.md)

**要构建：** 用户或自动化脚本可通过命令行请求打开功能路径；已有应用实例接收后续请求并导航到目标页面。

**阻塞于：** [初始化 Tauri 应用与功能路由](45-bootstrap-tauri-shell.md)、[将 playground 页面迁入桌面应用](46-port-playground-ui.md)

**状态：** completed
**标签：** completed

- [x] 使用 Tauri 官方单实例能力；支持 `kbcapp --route <功能路径>`，AHK、PowerShell 与其他命令行使用相同参数格式。
- [x] 无参数启动默认打开 `/folder-copy`；冷启动和运行中收到的功能路径均通过注册路由白名单校验。
- [x] 有效冷启动请求导航到指定页面；有效运行中请求转交到现有实例，并显示窗口、从最小化/隐藏状态恢复、聚焦窗口后导航。
- [x] 无效冷启动路径回退到 `/folder-copy` 并提示错误；运行中收到无效路径时保留当前页面并提示错误。
- [x] 不注册自定义 URI Scheme；外部激活协议遵循项目既定应用外壳约束。
- [x] 完成前先运行 `ego-browser skill`，用 ego-browser 检视 playground 页面路径与相关交互；再从命令行手动验收冷启动、单实例转交、窗口恢复、路由导航及无效路径反馈。

**实现与验收记录：**

- 采用 Tauri 官方 `tauri-plugin-single-instance` 转交第二次启动的参数；参数由 Rust 解析，冷启动初始请求与运行中请求均通过路由白名单校验。应用包名设为 `kbcapp`，可直接运行 `kbcapp --route /folder-copy`。
- 未注册自定义 URI Scheme。运行中有效请求会显示、恢复并聚焦窗口；无效请求提示错误且保留当前页面。缺失参数或无参数时回到默认页面 `/folder-copy`。
- 已用 ego-browser 检视 playground 的 `/folder-copy` 页面及设计中的路由激活 UI；手动命令行验收冷启动有效路径、无参数启动、冷启动无效路径、有效和无效的第二实例转交，以及最小化后恢复聚焦。
- `bun run build`、`cargo check` 和 `cargo build` 均通过；按项目约定未新增或运行自动化测试。
- 业界实现依据：Tauri 官方单实例插件负责实例间参数转交；官方事件 API 传递激活请求，官方窗口 API 执行显示、恢复和聚焦。路由仍由应用自己的白名单决定。
