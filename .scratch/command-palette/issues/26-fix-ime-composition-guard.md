# 26：现有搜索框输入法组字守卫修复

Type: task
Status: resolved
Label: ready-for-agent

## 要构建什么

修复现有文件夹浏览实时搜索框（`SearchBar.tsx`）及相关输入框在中文输入法打字组字期间按 Enter 误触文件勾选、按上下键翻选候选词时列表高亮跳跃的既有缺陷。

## 详细交付要求

1. **`SearchBar.tsx` 守卫补齐**：
   - 在 `src/components/folder-copy/SearchBar.tsx` 的 `handleKeyDown` 函数顶部加入标准输入法守卫：
     ```tsx
     if (e.nativeEvent.isComposing || e.keyCode === 229) {
       return;
     }
     ```
2. **其他输入点排查与修复**：
   - 检查 `TopToolbar.tsx`（手动路径输入框）与 `SettingsModal.tsx`（排除规则输入框）中的键盘处理函数，若存在直接监听 Enter/方向键而未排除输入法状态的情况，统一加入组字守卫。
3. **保持既有逻辑完备**：
   - 组字完成后（汉字已上屏），普通按键行为（Esc 清空/关闭下拉、上下键选择结果项、Enter 执行选中项）保持原有功能完好无损。

## 验收条件

- [x] 使用微软拼音输入法在文件夹搜索框打字，按数字键或空格键上屏汉字，搜索下拉列表中不高亮跳动。
- [x] 中文拼音打字过程中按 Enter 键确认上屏英文字符，不触发文件的勾选或文件夹树展开。
- [x] 打字过程中按上下方向键翻选输入法候选词，文件结果列表的高亮条保持稳定不动。
- [x] 汉字上屏后，按 Enter 键正常切换文件勾选或定位展开文件夹。
- [x] `bun run build` 编译无类型或语法错误。

## Blocked by

None (can start immediately)

## Comments

- 2026-11-18：实现完成。
  - `SearchBar.tsx`：`handleKeyDown` 顶部加入 `if (e.nativeEvent.isComposing || e.keyCode === 229) return;`
  - `TopToolbar.tsx`：`handleKeyDown` 顶部同样加入 IME 组字守卫
  - `SettingsModal.tsx`：白名单、排除规则、忽略目录三处内联 `onKeyDown` lambda 均加入守卫
  - `bun run build`（`tsc && vite build`）零错误零警告通过
