# 23：现有实时搜索缺少输入法组字守卫

Type: task
Status: resolved
Label: ready-for-agent

## 决议

在实施命令面板的同时，**顺带修复现有文件夹浏览搜索框（`SearchBar.tsx`）及相关输入框的输入法组字误触缺陷**。

### 修复规范

1. **守卫逻辑**：
   在键盘监听函数（`handleKeyDown`）头部增加标准输入法组字判断：
   ```tsx
   if (e.nativeEvent.isComposing || e.keyCode === 229) {
     return;
   }
   ```
2. **覆盖范围**：
   - `src/components/folder-copy/SearchBar.tsx`：彻底解决打字确认候选词（Enter）时误触文件勾选、按上下键翻选候选词时列表高亮跳跃的问题；
   - 检查并顺带覆盖 `TopToolbar.tsx`（路径输入）及 `SettingsModal.tsx`（排除规则输入）的同类键盘处理。

## Comments

- 2026-11-18：用户在 Grilling 第二轮明确确认顺带修复该既有缺陷。
