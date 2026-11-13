# 14：与 issue 54 的边界，以及现有两个快捷键是否升级为系统级

Type: grilling
Status: open
Label: needs-triage

## 问题

[folder-content-copy issue 54](../../folder-content-copy/issues/54-autostart-notification-and-global-hotkey.md) 的范围是「接入开机自启、桌面通知与系统级全局快捷键」，其中全局快捷键部分正是本 effort 要做的事。两个 effort 都声称要做，会两边各做一半。

需要定：

- **全局热键能力归谁**：从 issue 54 拆出来交给 command-palette，还是 54 先做通用热键基础设施、command-palette 只消费它？
- **托盘归谁**：issue 54 的自启需要托盘（「开机后驻留托盘」），本 effort 的 [issue 12](12-tray-and-close-behavior.md) 也需要托盘。同一个托盘不能做两次。
- **自启与通知**是否留在 54 不动。
- **现有两个应用内快捷键是否升级为系统级**：`Ctrl+Shift+C`（复制文件上下文包，[`FolderCopyApp.tsx:391`](../../../src/FolderCopyApp.tsx)）和 `Ctrl+F`（聚焦搜索，[`SearchBar.tsx:99`](../../../src/components/folder-copy/SearchBar.tsx)）。issue 54 的待明确项里已有「全局快捷键与 Ctrl+Shift+C 现有的应用内监听如何共存」。若都升级为系统级，会抢占其他应用的同名快捷键，风险明显更高；倾向只让命令面板热键是系统级，其余保持应用内。
- 顺带：现有 `Ctrl+F` 的判断**没有排除 shift**，所以 `Ctrl+Shift+F` 也会聚焦搜索。这是个既存小缺陷，要不要一并修。

## 提问时的倾向

倾向：**热键与托盘基础设施归本 effort**（因为命令面板是第一个真正需要它们的消费者），issue 54 收窄为「自启 + 通知」，并在其正文里注明依赖本 effort 的托盘与热键。现有两个快捷键**保持应用内**，不升级。

**此倾向未与用户确认，不构成决议。**

## Comments

- 2026-11-13：从 issue 02 的用户答复中拆出。用户外出，留待下次讨论。
- 本票不阻塞于 issue 09，因为它是范围划分决策，不依赖平台能力事实。