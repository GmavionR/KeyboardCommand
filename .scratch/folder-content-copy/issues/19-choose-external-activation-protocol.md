# 选择外部激活应用的参数或协议

Type: grilling
Status: resolved
Blocked by: 13, 14

## 问题

路由调研建议由已注册的 URI Scheme 携带目标路径；Tauri 激活调研建议首版使用 single-instance 插件转发 CLI/AHK 参数，再将参数交给路由入口。选择首版采用的外部激活方式，并明确命令行与 AutoHotkey 如何传入目标功能路径，以及未来是否需要注册 URI Scheme。

## 答案

- 首版外部激活面向命令行/PowerShell 和 AutoHotkey；不注册自定义 URI Scheme。未来确有浏览器或可点击链接唤起需求时，再评估增加 Tauri Deep Link。
- 外部调用约定为 `kbcapp --route <功能路径>`，例如 `kbcapp --route /folder-copy`。PowerShell 和 AutoHotkey 使用相同参数格式；参数值是逻辑功能路径，不随站内 URL 使用简洁路径还是哈希路径而改变。
- 使用 Tauri 官方 `single-instance` 插件保证仅运行一个实例。冷启动时有效路径启动并打开目标功能；首次启动参数和后续启动转交的参数走相同校验与路由流程。若请求早于前端路由就绪到达，应用须在路由就绪后处理，不能丢失请求。
- 无参数启动时打开默认功能页 `/folder-copy`。路径在功能路由白名单内时导航到对应页面；无效路径不执行导航并提示错误。冷启动时打开 `/folder-copy` 后提示；应用已运行时保持当前页面并提示。
- 有效的外部请求到达时，应用已运行则显示窗口、从最小化或隐藏状态恢复、聚焦窗口并导航到目标功能。
- 方案依据：Tauri Single Instance 插件可接收后续进程的参数；Windows/Linux Deep Link 则以新进程参数传入，若要单实例事件转交须与 single-instance 配合。首版仅需 CLI/AHK，因此先采用参数方式。[Tauri Single Instance](https://v2.tauri.app/plugin/single-instance/) · [Tauri Deep Linking](https://v2.tauri.app/plugin/deep-linking/)
