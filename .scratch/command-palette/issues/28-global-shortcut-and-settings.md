# 28：系统级全局热键注册与系统设置呈现

Type: task
Status: resolved
Label: ready-for-agent

## 要构建什么

接入 Tauri 官方全局热键插件，实现默认系统热键 `Ctrl+Shift+K` 全局唤起/Toggle 独立命令面板；配置持久化到 SQLite 数据库；在系统设置中如实呈现系统级生效作用域，遇快捷键冲突如实标红提示。

## 详细交付要求

1. **全局快捷键插件接入**：
   - 在 `src-tauri/Cargo.toml` 引入 `tauri-plugin-global-shortcut = "2"`；
   - 在前端引入 `@tauri-apps/plugin-global-shortcut` 或直接在 Rust 侧初始化监听；
   - 权限配置：在 `capabilities/default.json` 声明相关 permissions；
2. **热键注册与 Toggle 调度**：
   - 默认快捷键为 `Ctrl+Shift+K`（或跨平台 `CommandOrControl+Shift+K`）；
   - 从 SQLite `settings.db` 读取热键配置；
   - 热键触发逻辑：若面板当前可见（`is_visible()`），调用 `hide()` 收起；若当前隐藏，调用定位并执行 `show()` 与 `set_focus()`；
3. **系统设置界面同步（`SystemSettingsModal.tsx`）**：
   - 将原「应用内快捷键与界面行为」分组拆分或增补**「系统级全局快捷键」**条目：
     - 命令面板唤起：展示 `Ctrl + Shift + K`，标注「全局有效（后台及失焦时均可唤起）」；
     - 复制文件上下文包：`Ctrl + Shift + C`，标注「仅在应用窗口获得焦点时生效」；
     - 聚焦文件搜索：`Ctrl + F`，标注「仅在应用窗口获得焦点时生效」；
   - 若系统注册热键返回失败（被第三方程序占用），在设置项下方显示红色错误提示：「该快捷键已被系统或其他应用占用，请更换」；
   - 移除原先在分组末尾临时留存的「这些能力接入后才会在此处出现开关」占位文字。

## 验收条件

- [ ] 在第三方全屏应用（如浏览器、记事本）在前台时，按下 `Ctrl+Shift+K`，命令面板能跨应用在当前屏幕上方居中秒开。
- [ ] 面板处于打开状态时，再次按下 `Ctrl+Shift+K`，面板立即隐藏（Toggle 成功）。
- [ ] 系统设置弹窗中准确展示命令面板的全局热键，并清晰标明系统级与应用内快捷键的作用域区别。
- [ ] 若底层模拟热键冲突或不可用时，系统设置如实显示红色警告，不出现虚假“已生效”状态。
- [ ] `cargo check` 与 `bun run build` 编译通过。

## Blocked by

- [27：独立面板 Webview 窗口创建与失焦隐藏生命周期](27-standalone-palette-window.md)
