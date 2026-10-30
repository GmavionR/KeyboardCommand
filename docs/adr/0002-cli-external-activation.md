# 首版通过命令行参数激活功能

首版已知的外部调用方是命令行、PowerShell 和 AutoHotkey，因此采用稳定参数 `kbcapp --route <功能路径>`，并用 Tauri 官方 `single-instance` 插件将后续启动的请求转交给现有实例；首版不注册 URI Scheme。这样可直接满足已确定的调用方式，且避免在尚无浏览器链接用例时引入协议注册；代价是首版不能通过自定义 URI Scheme 打开应用，未来出现此需求时再扩展 Deep Link。
