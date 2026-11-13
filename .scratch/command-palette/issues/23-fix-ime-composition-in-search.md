# 23：现有实时搜索缺少输入法组字守卫

Type: task
Status: open
Label: needs-triage

## 要修什么

文件夹浏览的实时搜索在**中文输入法组字期间会误执行命令**。

[`src/components/folder-copy/SearchBar.tsx:141`](../../../src/components/folder-copy/SearchBar.tsx) 的 `handleKeyDown`：

```tsx
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Escape') { ... }
  if (!isDropdownOpen || results.length === 0) { ... }
  if (e.key === 'ArrowDown') { ... }
  else if (e.key === 'ArrowUp') { ... }
  else if (e.key === 'Enter') {
    e.preventDefault();
    const item = results[highlightedIndex];
    if (item) executeItem(item);
  }
};
```

**没有任何组字状态判断**。已核实 `src` 全目录 `isComposing` / `composition` / `keyCode` **零命中**。

后果：

- 用中文输入法打字，按 **Enter 确认候选词**时，会连带执行 `executeItem`——对文件是切换勾选，对文件夹是定位并展开树。用户只是想上屏一个字，结果改了选择集。
- 按 **上下键选候选词**时，结果列表的高亮条会跟着跳。

## 主流做法

cmdk 在 root 的 `onKeyDown` 里判断 `e.nativeEvent.isComposing || e.keyCode === 229`，组字期间直接返回（见 [issue 08](08-prior-art-research.md)）。这是标准守卫写法。

## 待用户决定

- 是否现在修。这是**独立于命令面板的既有缺陷**，不是本次功能引入的。
- 修的范围：只修 SearchBar，还是顺带检查其他键盘处理点。已核实其他 `onKeyDown` 的位置：[`FileTree.tsx:175`](../../../src/components/folder-copy/FileTree.tsx)（树导航，焦点在容器上而非输入框，不受组字影响）、[`TopToolbar.tsx:87`](../../../src/components/folder-copy/TopToolbar.tsx)（路径输入框，**可能同样受影响**）、[`SettingsModal.tsx`](../../../src/components/folder-copy/SettingsModal.tsx) 的规则输入框（Enter 添加规则 chip，**可能同样受影响**）。后两处需要实际用输入法验证。

## Comments

- 2026-11-13：为命令面板做主流实现调研时顺带发现。命令面板全是中文命令名，若手搓浮层必然踩同一个坑，这也是 [issue 18](18-cmdk-dependency-choice.md) 倾向选用 cmdk 的理由之一。
- 提问时已向用户指出，用户外出未答是否要修。