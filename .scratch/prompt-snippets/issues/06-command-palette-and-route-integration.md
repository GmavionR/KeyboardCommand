# 06：命令面板集成与 CLI 唤起

Type: task
Status: resolved
Label: ready-for-agent

## 要构建什么

1. 在命令面板（Command Palette）中注册「打开提示词片段」跳转命令，并支持直接检索提示词；
2. 在主窗口标题栏或主导航中添加「提示词」入口；
3. 支持通过命令行 `kbcapp --picker prompts` 直接唤起浮层提示词选择器。

## 验收条件

- [x] 命令面板能搜索并跳转到 `/prompts`。
- [x] 命令行参数能正常触发提示词选择器模式。

