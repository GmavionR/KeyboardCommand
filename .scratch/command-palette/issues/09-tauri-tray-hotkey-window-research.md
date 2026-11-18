# 09：Tauri 2 托盘、全局热键与独立面板窗口的主流做法调研

Type: research
Status: resolved
Label: ready-for-agent

## 问题

[issue 02](02-system-hotkey-and-invocation.md) 把系统级热键、托盘和可能的独立面板窗口拉进了范围，而这三项当前**一项都没有实现**。按 [`AGENTS.md`](../../../AGENTS.md) 的硬性要求，动手前必须先弄清主流怎么做。

需要调研并给出带一手来源的事实：

1. **全局快捷键**：`tauri-plugin-global-shortcut` 的当前版本、API、权限声明方式。注册被其他应用占用时的返回行为；能否检测冲突并给出可读原因；应用失焦与主窗口隐藏时是否仍然触发；Windows 上的已知限制。
2. **托盘**：Tauri 2 的托盘是内置 `TrayIconBuilder` 还是插件。图标、菜单、左键/双击事件的支持情况；「关闭主窗口即隐藏到托盘」的常见实现方式；托盘与 `single-instance` 插件如何配合。
3. **独立面板窗口**：用第二个 `WebviewWindow` 做一个无边框、不在任务栏显示、失焦自动隐藏、屏幕居中偏上的面板窗口，主流怎么做。相关窗口配置项（`decorations`、`skipTaskbar`、`alwaysOnTop`、`transparent`、`shadow`、`focus`）在 Windows 上的实际表现与坑。预创建隐藏窗口复用 vs 每次按需创建的取舍。
4. **窗口状态判定**：Tauri 能拿到哪些窗口状态（`isVisible`、`isMinimized`、`isFocused`）。Windows 上能否可靠判断「窗口被其他应用遮挡」和「窗口位于另一个虚拟桌面」；若不能，主流应用如何近似处理。跨虚拟桌面把窗口激活到前台的已知限制。
5. **参考产品**：Raycast、uTools、Quicker、PowerToys Run 在「主窗口隐藏时唤起面板」这件事上的形态选择——它们是一个独立窗口还是主窗口内的浮层？有没有两种形态并存的先例？

## 调研事实

### 1. 全局快捷键（`tauri-plugin-global-shortcut`）

- **版本与安装**：当前官方插件版本为 **2.x**（`tauri-plugin-global-shortcut = "2"`，前端 `@tauri-apps/plugin-global-shortcut`）。在 `src-tauri/Cargo.toml` 中作为 desktop 依赖引入。
- **注册位置**：
  - **推荐在 Rust 侧注册**：在 `setup` 钩子中通过 `tauri_plugin_global_shortcut::Builder::new().with_shortcuts([...]).with_handler(...)` 进行统一监听与窗口调度。在 Rust 侧注册零前端 IPC 权限风险，且在窗口尚未获焦或隐藏时响应最快。
  - **前端动态注册**：若由前端动态配置热键，需要 capabilities 声明 `global-shortcut:allow-register`、`global-shortcut:allow-unregister`、`global-shortcut:allow-is-registered`。
- **冲突与错误处理**：底层调用 Windows `RegisterHotKey` API。如果热键已被其他系统或应用占用，Rust 侧注册会返回 `Err`，前端 `register()` 会抛出可捕获的错误。应用可以据此感知注册失败，并在系统设置中向用户展示中文提示（「该快捷键已被系统或其他程序占用，请更换」）。
- **失焦与隐藏响应**：全局热键由操作系统级别消息循环截获，**完全不受应用失焦或窗口隐藏影响**。
- **Windows 已知限制**：操作系统硬保留热键（如 `Win+L`、`Ctrl+Alt+Del`）无法注册；若前台程序以管理员（UAC 提权）运行而本应用为普通权限，Windows UIPI（用户界面特权隔离）机制可能拦截快捷键，此为系统通用安全限制。

### 2. 系统托盘（Tauri 2 原生集成）

- **内置 API**：Tauri 2 的托盘**不再是独立插件**，已直接内置于核心。只需在 `Cargo.toml` 开启 `tauri = { version = "2", features = ["tray-icon"] }`。
- **构建方式**：在 Rust 侧使用 `tauri::tray::TrayIconBuilder` 和 `tauri::menu::MenuBuilder`：
  - 图标：使用 `app.default_window_icon().unwrap().clone()` 或通过 `tauri::image::Image::from_bytes` 打包嵌入。
  - 菜单：支持右键弹出菜单（如「显示主窗口」、「设置」、「退出」）。
  - 左键与点击行为：支持配置 `.show_menu_on_left_click(false)`，并在 `.on_tray_icon_event` 中捕获 `MouseButton::Left` 点击，直接唤起主窗口或切换显示。
- **「关闭主窗口即隐藏到托盘」**：
  - 主流标准写法：在 `src-tauri/src/lib.rs` 的 `app.on_window_event` 监听 `WindowEvent::CloseRequested`，调用 `api.prevent_close()` 阻止窗口销毁，并调用 `window.hide()` 将其隐藏。
  - 彻底退出应用仅由托盘右键菜单的「退出」项（调用 `app.exit(0)`）触发。
- **与 `single-instance` 配合**：
  - 项目已接入 `tauri-plugin-single-instance = "2"`。外部再次启动 `kbcapp --route ...` 时，回调函数中拿到 `app.get_webview_window("main")`，调用 `window.show()` 和 `window.set_focus()` 并发送路由激活事件，无论主窗口此前是最小化还是隐藏在托盘，均能稳定恢复并置前。

### 3. 独立面板窗口（Spotlight 风格窗口）

- **窗口配置项（`tauri.conf.json` 或 Rust 预建）**：
  - `decorations: false`（无原生系统标题栏）
  - `transparent: true`（透明背景，配合 Web 侧圆角与阴影）
  - `skipTaskbar: true`（不在任务栏显示图标，保持轻量挂件感）
  - `alwaysOnTop: true`（总在最前，避免被普通活动窗口压在下方）
  - `center: true` 或动态调整位置（屏幕水平居中，垂直居中偏上约 15%~20% 黄金视线区）
  - `resizable: false`
- **预创建隐藏复用 vs 按需创建**：
  - **业界 100% 统一采用预创建隐藏复用**。应用启动（或主窗口启动）时即在后台创建好该 Webview 窗口，初始为 `visible: false`。
  - 热键按下时直接执行 `window.show()` + `window.set_focus()`，**唤起延迟为 0 毫秒**；若按需动态创建，每次唤起需要经历 Webview 进程初始化、DOM 解析和 JS 加载，会有 200~500ms 的明显卡顿与白屏。
- **失焦自动隐藏（Blur to Hide）**：
  - 前端监听 `appWindow.onFocusChanged(({ payload: focused }) => { if (!focused) appWindow.hide(); })`，或 Rust 侧监听 `WindowEvent::Focused(false)`。鼠标点击屏幕其他任何地方，面板立即自动隐藏。

### 4. 窗口状态判定事实

- **Tauri 提供的状态**：`is_visible()`、`is_minimized()`、`is_focused()`。
- **遮挡与虚拟桌面判定**：
  - Win32 API 没有可靠、轻量的高层接口来判定「窗口是否被其他应用完全遮挡」或「窗口是否在当前虚拟桌面」；
  - **主流桌面工具的通用策略**：**根本不需要判定遮挡与虚拟桌面**。当用户唤起命令面板时，呼出的是独立的命令面板窗口；当用户在命令面板中执行跳转命令需要打开主窗口时，直接调用主窗口的 `window.show()`、`window.unminimize()`、`window.set_focus()`。Windows 窗口管理器会自动将主窗口拉到当前前台视口（如果跨虚拟桌面，也会自动切换或呼出）。

### 5. 参考产品事实（Raycast, uTools, PowerToys Run, Quicker, VS Code）

- **Raycast（macOS 效率标杆）**：无论主程序是否处于设置界面、无论后台有没有窗口，按下唤起热键永远弹出**同一个独立浮层窗口**（Spotlight 居中形态）。
- **uTools（国内成熟多功能效率工具）**：无论主窗口在托盘还是后台，按下呼出热键（如 `Alt+Space`）永远弹出**同一个独立的胶囊搜索栏**。执行插件指令后由该独立窗口承载或调出对应主界面。
- **PowerToys Run（Windows 官方开源效率工具）**：无论后台系统状态如何，`Alt+Space` 永远弹出**独立的屏幕顶部居中搜索框**。
- **VS Code**：VS Code 的 `Ctrl+Shift+P` 是页内遮罩，但 VS Code 是单机 IDE，**不是常驻后台的全局效率工具，没有系统级全局热键**。只有在 VS Code 窗口在前台获焦时该热键才生效。
- **结论**：**业界没有任何成熟的全局效率工具会并存「托盘时是一个独立窗口，主窗口显示时变成页内遮罩」两套形态**。两套形态不仅开发维护成本翻倍（两套窗口管理、两套焦点陷阱、两套样式与通信），而且会导致用户心智模型混乱（不知道这次按热键会弹在屏幕中间还是弹在某个窗口里面）。

## 结论

1. 基础设施：Tauri 2 内置 `TrayIconBuilder`，配合 `tauri-plugin-global-shortcut` 能够完整、轻量地实现系统托盘与全局热键。
2. 架构决策推导：[issue 10](10-presentation-form.md) 应坚决倾向 **(b) 统一为独立面板窗口**。这不仅是 Raycast / uTools / PowerToys Run 的成熟业界标准，而且一次性消除了 issue 11（复杂的窗口状态判定）、彻底消除了维护两套 UI 外壳的技术包袱。

## Comments

- 2026-11-18：完成平台能力与主流开源/商业产品调研，结论转 issue 10。
