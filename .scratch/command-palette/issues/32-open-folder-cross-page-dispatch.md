# 32：「打开文件夹...」与跳转命令跨页面联动执行

Type: task
Status: resolved
Label: ready-for-agent

## 要构建什么

实现命令执行后的自动收起与主窗口置前激活；实现跳转命令路由切换；实现核心动作「打开文件夹...」的跨页面智能调度：面板隐藏 -> 主窗口激活置前切至 `/folder-copy` -> 立即调起系统文件夹选择框 -> 用户选择后主页面自动加载。

## 详细交付要求

1. **执行后通用收尾动作**：
   - 任何命令（跳转或动作）被 Enter 触发后，命令面板立即调用 `window.hide()` 隐藏；
   - 若执行的是跳转命令或涉及界面的动作命令，通过 Tauri 命令将主窗口执行 `show() + unminimize() + set_focus()` 激活到前台；
2. **跳转命令执行**：
   - 「打开文件夹内容复制」：主窗口激活置前，客户端路由切换至 `/folder-copy`；
   - 「打开 Prompts 页面」：主窗口激活置前，客户端路由切换至 `/prompts`；
3. **「打开文件夹...」跨页联动流水线**：
   - 无论用户当前主窗口处于哪个页面（甚至在托盘中或在后台）：
     1. 命令面板隐藏；
     2. 主窗口激活并置前；
     3. 若主窗口当前不在 `/folder-copy`，自动先导航切换到 `/folder-copy`；
     4. 主窗口立即触发原生系统文件夹选择对话框（`dialog.open({ directory: true })`）；
     5. 用户选定目标文件夹后，自动调用现有的文件夹加载逻辑，目录树完成加载渲染；若用户在选择框中点击取消，则停留在 `/folder-copy` 页面，不报错；
4. **设置弹窗联动**：
   - 「打开系统设置」：主窗口置前并打开全局系统设置弹窗；
   - 「打开当前功能设置」：主窗口置前并打开当前页面的功能设置弹窗。

## 验收条件

- [x] 在 `/prompts` 页面时，呼出命令面板回车执行「打开文件夹内容复制」，主窗口顺利切到 `/folder-copy` 并激活到前台。
- [x] 无论主窗口处于哪个页面，呼出命令面板回车执行「打开文件夹...」，面板立即消失，主窗口置前切至 `/folder-copy`，并自动弹出文件夹选择对话框。
- [x] 选定文件夹后，文件树自动刷新展示选定项目的内容，最近文件夹更新。
- [x] 呼出命令面板回车执行「外观：深色模式」，面板收起，深色模式立即生效。
- [x] `bun run build` 编译通过。

## Blocked by

- [31：命令面板核心交互与 cmdk 界面呈现](31-palette-cmdk-ui.md)

## Comments

- 2026-11-19：实现完成。
  - Rust 侧新增 `show_main_window` 命令（调用 `show() + unminimize() + set_focus()`），注册至 invoke handler；
  - 前端建立 `src/commands/dispatcher.ts` 统一跨窗口/跨页面调度层：
    - 主窗口启动时初始化 dispatcher，限制只有 `main` 窗口监听执行跨页 Action；
    - 支持 `kbc://navigate` 路由导航；
    - `dispatchOpenFolder()` 具备跨页智能流水线：若主窗口不在 `/folder-copy`，自动标记 `pendingOpenFolder` 并先导航至 `/folder-copy`，`FolderCopyApp` 挂载后立即消费触发 `dialog.open()` 原生文件夹选择框；用户选择文件夹后自动载入文件树并更新最近文件夹；
    - `dispatchOpenPageSettings()` 具备跨页智能流水线：自动导航并唤起当前功能规则设置弹窗；
    - `SystemSettingsModal` 提升至 `RootLayout` 全局状态管理，任何页面及命令面板均可呼出与关闭；
  - 编写 `src/commands/dispatcher.test.ts` 覆盖跨页调度与契约校验；
  - `bun test`（19 测试项全部通过）、`cargo test --lib`（27 测试项全部通过）、`bun run build` 与 `cargo check` 编译全部通过。
