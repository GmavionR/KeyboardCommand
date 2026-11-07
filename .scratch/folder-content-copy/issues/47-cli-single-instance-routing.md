# 47：接入命令行激活与单实例导航

**父票据：** [初始化桌面应用并接入现有页面](37-application-shell-and-ui.md)

**要构建：** 用户或自动化脚本可通过命令行请求打开功能路径；已有应用实例接收后续请求并导航到目标页面。

**阻塞于：** [初始化 Tauri 应用与功能路由](45-bootstrap-tauri-shell.md)、[将 playground 页面迁入桌面应用](46-port-playground-ui.md)

**状态：** ready-for-agent
**标签：** ready-for-agent

- [ ] 使用 Tauri 官方单实例能力；支持 `kbcapp --route <功能路径>`，AHK、PowerShell 与其他命令行使用相同参数格式。
- [ ] 无参数启动默认打开 `/folder-copy`；冷启动和运行中收到的功能路径均通过注册路由白名单校验。
- [ ] 有效冷启动请求导航到指定页面；有效运行中请求转交到现有实例，并显示窗口、从最小化/隐藏状态恢复、聚焦窗口后导航。
- [ ] 无效冷启动路径回退到 `/folder-copy` 并提示错误；运行中收到无效路径时保留当前页面并提示错误。
- [ ] 不注册自定义 URI Scheme；外部激活协议遵循项目既定应用外壳约束。
- [ ] 完成前先运行 `ego-browser skill`，用 ego-browser 检视 playground 页面路径与相关交互；再从命令行手动验收冷启动、单实例转交、窗口恢复、路由导航及无效路径反馈。
