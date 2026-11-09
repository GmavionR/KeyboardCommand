# 38：浏览真实目录并加载文件树

**要构建：** 用户能从已接入的页面选择、输入或重载 Windows 目录，并浏览真实文件树；目录筛选及大目录分页按默认规则生效。

**阻塞于：** [初始化桌面应用并接入现有页面](37-application-shell-and-ui.md)

**状态：** done
**标签：** ready-for-agent

**设计来源：** `playground/KeyboardCommand_Folder_Copy/docs/design.md` 是页面 UI 与交互的当前基准；默认筛选细节见 `.scratch/folder-content-copy/spec.md`。

- [x] 文件夹选择器、手动输入路径并按 Enter 加载、Esc 还原编辑、复制当前完整路径、最近 10 个目录选择和重新载入均作用于真实文件系统。
- [x] 文件夹树显示真实的文件与目录；仅显示符合默认白名单及排除规则的文件，忽略或排除目录按设计标记且不能展开。
- [x] 每个目录按直接子项数量独立判断分页；超过默认阈值 50 时，展开加载首批 30 项，加载更多追加下一批，末批显示剩余全部。
- [x] 空目录、无可选文件、失效路径及可读取目录内容时提供与设计一致的状态和反馈；界面不再使用假目录数据作为运行结果。
- [x] 逐条完成前，先运行 `ego-browser skill` 并用 ego-browser 检视 playground 对应页面和交互；对照设计稿后，在桌面应用中手动验收本票据的目录选择、加载、刷新和分页流程。

**实现记录：** Rust 命令使用 `std::fs::read_dir` 扫描真实目录，按规则过滤、排序，并以 `spawn_blocking` 避免阻塞异步运行时；前端通过 Tauri dialog 选择目录，并按目录逐页加载。移除了运行时 mock 文件树。

**验收记录：** `bun run build`、`cargo check` 和 `cargo build` 成功。ego-browser 已检查 playground 的目录浏览页面。桌面应用加载临时真实目录后确认过滤结果正确、忽略目录显示标记；75 项目录展开后显示首批 30 项与剩余 45 项。临时 playground 和夹具已清理。
