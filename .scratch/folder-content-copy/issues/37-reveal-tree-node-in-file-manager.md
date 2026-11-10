Type: task
Status: resolved

## Question

文件树右键菜单如何在系统文件管理器中显示当前有效节点？

## Answer

有效可选文件节点的菜单保留“仅复制当前文件”，并增加“在文件资源管理器中显示”；有效可选文件夹节点只显示后者。忽略或排除的文件夹不显示右键菜单，也不响应右键操作。文件节点在系统文件管理器中打开所在目录并定位该文件；文件夹节点直接打开自身。操作不改变现有勾选状态。路径失效或系统文件管理器启动失败时显示中文错误提示，且不改动文件树或勾选状态。

实现复用项目已有的 Tauri Opener 插件：文件使用 `revealItemInDir`，文件夹使用 `openPath`。由于文件夹根路径由用户任意选择，Opener 的 `openPath` capability 配置了匹配路径的 scope；界面仅从有效文件夹节点调用该操作。

## Comments

- 2026-11-10：用户在 Windows 开发运行中复现文件夹报错 `Not allowed to open path`。Opener 权限只有 `opener:allow-open-path` 标识，缺少匹配用户所选路径的 scope。为允许用户在任意目录树中打开文件夹，在 capability 中为 `opener:allow-open-path` 增加 `**` 路径 scope。重新运行 `bun run tauri dev`，载入 `D:\chromeDownload\ego-browser-v2.1.0\agent-skills` 并右键该根文件夹，Windows 文件资源管理器成功打开该目录，未出现错误提示。
