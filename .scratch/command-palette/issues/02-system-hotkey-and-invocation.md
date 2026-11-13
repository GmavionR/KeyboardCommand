# 02：系统级可配置热键与两种唤起场景

Type: grilling
Status: resolved
Label: ready-for-agent

## 问题

命令面板用什么键唤起，作用域是应用内还是系统级。

提问时给出的推荐是「应用内 `window` keydown，默认 `Ctrl+Shift+P`」，理由是现有两个快捷键都是应用内监听、系统级热键已被推到 [folder-content-copy issue 54](../../folder-content-copy/issues/54-autostart-notification-and-global-hotkey.md)、且项目当时没有托盘实现。

## 答案

**用户否决了推荐，选择系统级，并改了默认键。** 原话：

> 系统级别，用户可以配置快捷键。还是默认不使用 ctrl+shift+p 了，改为 ctrl+shift+k。
>
> 规则就是：
> 1. 如果当前应用没有窗口正在显示，也就是当前应用只隐藏在系统托盘，当用户按下 ctrl+shift+k 的时候显示一个搜索弹窗。
> 2. 如果当前应用有窗口正在显示（可能位于不同的虚拟桌面，或者被其他应用遮挡），则激活调度到前台，并在页面内显示一个弹窗遮罩，类似于 vscode 的命令面板。
>
> 1 和 2 的区别就是：2 看起来好像是网页的一个遮罩弹窗，但是 1 看起来却是一个 window 窗口。我不确定是不是这样。

据此确定下来的部分：

- **系统级全局热键**：应用失焦、甚至主窗口不显示时也要能唤起。这意味着必须引入全局快捷键能力，不再是 `window` 上的 keydown。
- **默认键改为 `Ctrl+Shift+K`**，放弃 `Ctrl+Shift+P`。
- **快捷键可由用户配置**，不是写死的常量。
- **两种唤起场景**：无窗口显示（仅托盘）时唤起面板；有窗口显示时先把窗口激活到前台，再显示面板。
- 「有窗口显示」包含**窗口在其他虚拟桌面**和**被其他应用遮挡**这两种情况——它们都算「有窗口」，走激活到前台的分支。

**用户明确表示不确定的部分不在本票决议内**：场景 1 是否真的必须是一个独立的 Windows 窗口、场景 2 是否真的必须是页内遮罩，即「两种呈现形态」是否成立。这一点连同判定口径、托盘语义、热键配置一起，拆成后续票据讨论，见 [issue 10](10-presentation-form.md)、[issue 11](11-window-visible-definition.md)、[issue 12](12-tray-and-close-behavior.md)、[issue 13](13-hotkey-configuration.md)。

## 影响到的既有约束

- 本决议把**托盘**拉进了范围，而当前应用没有托盘实现（issue 54 已记录这一事实）。
- 与 issue 54 的范围重叠，边界划分见 [issue 14](14-scope-boundary-with-issue-54.md)。
- [`PROJECT_REQUIREMENTS.md`](../../../PROJECT_REQUIREMENTS.md) 第 3 节和 issue 44 的「快捷键说明须与实际生效范围一致」需要在能力真正接入后同步更新，见 [issue 24](24-sync-system-settings-shortcut-list.md)。

## Comments

- 2026-11-13：grilling 第一轮 Q2。提问推荐应用内 + `Ctrl+Shift+P`，用户改为系统级 + 可配置 + `Ctrl+Shift+K`，并补充了两种唤起场景。
- 提问时已核实 `Ctrl+Shift+P` 在应用内未被占用；改用的 `Ctrl+Shift+K` 是否与系统或常见应用冲突**尚未核实**，归入 issue 13。