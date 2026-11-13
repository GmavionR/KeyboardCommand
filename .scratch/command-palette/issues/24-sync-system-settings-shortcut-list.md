# 24：同步系统设置的快捷键清单与分组说明

Type: task
Status: open
Label: ready-for-agent
Blocked by: 13

## 要做什么

命令面板热键真正接入后，系统设置里的快捷键清单必须与实际生效范围一致。

[`src/components/common/SystemSettingsModal.tsx:345`](../../../src/components/common/SystemSettingsModal.tsx) 起的第 4 组当前叫「**应用内快捷键与界面行为**」，注明「仅在应用窗口获得焦点时生效」，列的是 `Ctrl + Shift + C` 和 `Ctrl + F`。

接入系统级热键后需要：

- 新增命令面板热键条目，显示**用户当前配置的值**（默认 `Ctrl + Shift + K`），不是写死的字符串。
- 该条目的作用域说明是**系统级**，与同组内两个应用内快捷键不同。分组名与说明要相应调整，或把系统级快捷键拆成独立一组。
- 提供配置入口（具体形式由 [issue 13](13-hotkey-configuration.md) 决定）。
- 注册失败时如实呈现失败状态，不显示成已生效。
- 移除 issue 44 留在该分组末尾的「这些能力接入后才会在此处出现开关」说明——[folder-content-copy issue 54](../../folder-content-copy/issues/54-autostart-notification-and-global-hotkey.md) 的 Comments 已记录这项待办。

## 为什么必须做

[folder-content-copy issue 44](../../folder-content-copy/issues/44-system-settings-and-desktop-integrations.md) 的核心决议是「系统设置只呈真实状态，未接入的能力不给开关」，[`PROJECT_REQUIREMENTS.md`](../../../PROJECT_REQUIREMENTS.md) 第 3 节也写明「快捷键说明须与实际生效范围一致（应用内监听不等于系统级热键）」。清单不同步就是违反这条既有决议。

同时要更新 `PROJECT_REQUIREMENTS.md` 第 3 节中指向 issue 54 的「未接入能力」表述。

## Comments

- 2026-11-13：从 issue 02 的决议派生。用户外出，留待下次讨论后实施。