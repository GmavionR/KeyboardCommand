# 08：命令面板主流实现调研

Type: research
Status: resolved
Label: ready-for-agent

## 问题

项目 [`AGENTS.md`](../../../AGENTS.md) 有硬性要求：任何功能动手前先回答「业界主流怎么做的」，找最受欢迎的 GitHub 实现或成熟平台的做法，模仿或复用而不是从零手搓。

命令面板该复用哪个实现？主流怎么处理分类、下钻、中文匹配和无障碍？

## 答案

全程只读调研（npm registry / GitHub raw 源码 / 官方文档）。**完成调研不代表已选定方案**，选型决策见 [issue 18](18-cmdk-dependency-choice.md)。

### cmdk 是采用度断层第一的实现

- 最新版 **1.1.1**（2025-03-14，MIT）。仓库已迁移：`pacocoursey/cmdk` → **`dip/cmdk`**，**13,139 stars**。
- `peerDependencies`：`react` / `react-dom` = `^18 || ^19 || ^19.0.0-rc`，**官方支持 React 19**（本项目为 19.1）。
- **运行时依赖 4 个，全是 dependencies 而非 peer**：`@radix-ui/react-dialog@^1.1.6`、`react-primitive`、`react-id`、`react-compose-refs`。
- **重要纠正**：radix-dialog 是 **cmdk 自身**的硬依赖，不是只有 shadcn 包装层才需要。`dist/index.mjs` 顶层 `import * as w from "@radix-ui/react-dialog"`，且 `Dialog` 是 `Command` 的属性，即使 `sideEffects: false` 也 tree-shake 不掉。shadcn 的 `CommandDialog` 用的是它自己的 `ui/dialog` + `CommandPrimitive`，并未用 `Command.Dialog`。
- 体积：约 49.6 kB min / **16.7 kB gzip**（含 4 个依赖）。
- 月下载 **1.739 亿**（同口径 react 为 9.11 亿）。

### 可无 dialog 使用，但依赖照样进包

`<Command>` 只渲染 `<div cmdk-root tabIndex={-1}>`，**不含 portal / overlay / focus trap / Escape**。这些要自己补，或用 `Command.Dialog`（= Radix Root + Portal + Overlay + Content）一次性拿到。

### 过滤与排序可以完全接管

- `shouldFilter={false}` **同时关闭过滤与排序**，保留 DOM 顺序，由调用方条件渲染；`Command.Empty` 仍有效。
- 自定义评分：`filter?: (value, search, keywords?) => number`，0 = 隐藏，>0 显示并降序排；导出 `defaultFilter`（即 command-score）；Item 的 `keywords` prop 注入第三参。
- 注意 `Command` 的 `value` / `onValueChange` 指的是**选中项**，搜索词要在 `Command.Input` 上受控。

### 键盘与输入法

- 支持 Group `heading`、Item `disabled` / `onSelect` / `forceMount`、`loop`、`disablePointerSelection`、`vimBindings`（默认 true，Ctrl+N/J/P/K）、Alt+↑↓ 跨组、Home/End。
- **有输入法守卫**：root 的 `onKeyDown` 判断 `e.nativeEvent.isComposing || e.keyCode === 229`，中文组字期间不触发上下键和 Enter。

### 无障碍

cmdk 开箱即提供完整 ARIA combobox 模式：Input 为 `role="combobox"` + `aria-autocomplete="list"` + `aria-controls` + `aria-activedescendant`，root 自动渲染视觉隐藏的 `<label>`；List 为 `role="listbox"`；Item 为 `role="option"` + `aria-selected` / `aria-disabled`；Group 内层 `role="group"` + `aria-labelledby`。

符合 ARIA APG 的关键约束：**DOM 焦点始终留在 combobox**，视觉高亮用 `aria-activedescendant` 表达；dialog 不支持 `aria-activedescendant`，所以外层可以是 `role="dialog"`，但内层 popup 必须是 listbox。

**两个缺口**：cmdk root 没有 `role="dialog"` / `aria-modal`（只有走 Radix `Dialog.Content` 才有）；`aria-expanded` 硬编码 `true`，从不为 false。

### 替代方案对比

| 库 | 版本 / stars | React 19 | 样式 / dialog | 嵌套 |
| --- | --- | --- | --- | --- |
| **cmdk** | 1.1.1 / 13.1k | 支持 | 完全 unstyled，dialog 可选 | 官方 pages 配方 |
| kbar | 1.0.0 / 5,263 | 支持 | 半 headless，自带 Portal/Animator/虚拟列表与内联样式 | `parent`/`children`，空查询 Backspace 回退 |
| react-cmdk | 1.3.9（2023-04）/ 1,234 | **不支持**，仅 ^16/^17/^18 | 强制自带 CSS + @headlessui 1.6 + heroicons | 显式 Page |
| @mantine/spotlight | 9.8.0 / mantine 31.9k | 需 react ^19.2 | 强绑 Mantine 同版本与主题，**与纯 Tailwind 冲突** | 未核实 |
| ninja-keys | 1.2.2 / 1,704 | Lit web component，无 React peer | 自带 dialog + Material 图标 | tree/flat，Backspace 回退 |

月下载：cmdk 1.739 亿 ≫ spotlight 245 万 > kbar 159 万 > ninja-keys 12.9 万 > react-cmdk 12.1 万。**未发现更新且采用度接近 cmdk 的库**。

kbar 内部搜索用 **Fuse.js 7.5**（`threshold: 0.2`、`ignoreLocation: true`）+ `priority`，与本项目「名称包含」决议冲突；是否能公开配置未核实。体积 27.5 kB gzip。

### 分类与下钻的三种主流模型

1. **前缀符号（VS Code）**：单一输入框，`''` = 文件（Ctrl+P）、`'#'` = 工作区符号、`'@'` = 当前文件符号（`'@:'` 按类别分组）、`'view '` = 视图。**Ctrl+Shift+P 不是独立界面**，`ShowAllCommandsAction` 只是 `quickAccess.show('>')`，即预填 `>`；删掉 `>` 就回到文件模式。命令标签格式为 `Category: Label`。
2. **显式页栈（cmdk / kbar / Raycast / ninja-keys / react-cmdk）**：cmdk README 的「Nested items」用 `pages` 数组，`onSelect` push，Escape 或搜索为空时 Backspace pop。Raycast `useNavigation` 的 `push`/`pop`，Escape 自动回上一层。
3. **扁平列表 + 分组标题**：默认形态，shadcn 文档搜索即此。

本项目已在 [issue 03](03-category-semantics.md) 明确选第 3 种。

### 中文匹配

- **VS Code 无拼音逻辑**：`filters.ts` 中 `pinyin|cjk|chinese|0x4E00` 全部无命中；只有 `matchesWords`（注释称支持非 ASCII 语言的词首匹配）与变音符归一。但 `commandsQuickAccess.ts` 在本地化构建下把英文原始标题作为 `commandAlias` 与本地化 label 一起匹配——**「本地化名 + 英文别名」是 VS Code 的官方模式**。
- **uTools 明确支持拼音**：官方文档称「支持中英文、拼音、拼音首字母搜索」，一个功能可挂多个指令（`本地搜索`/`find`/`搜索`/`ss`，`翻译`/`fy`），分类下钻用右方向键。
- 拼音库月下载：`pinyin-pro` **180 万**（最流行）、`tiny-pinyin` 16.6 万、`pinyin-match` 2.68 万（`PinyinMatch.match(input, keyword)` 返回索引区间数组或 false，支持全拼/首字母/混合/多音字/繁体）、`@napi-rs/pinyin` 3.7 万（Rust 原生模块，**不适合 Tauri webview 前端**）。

### 未能核实的项

- Linear 的嵌套与面包屑行为（相关文档 URL 均 404）。
- Quicker 的匹配实现。
- command-score 对 CJK 的具体退化行为（未逐行审计）。
- kbar 是否公开 Fuse.js 配置入口。

## 顺带发现的现有缺陷

`src` 中 **`isComposing` 零命中**。[`SearchBar.tsx:141`](../../../src/components/folder-copy/SearchBar.tsx) 的 `handleKeyDown` 直接判 `e.key === 'Enter'` 就执行 `executeItem`，没有输入法组字守卫。用中文输入法打字、按 Enter 确认候选词时会误选中文件；按上下键选候选词时高亮条会跟着跳。这是**独立于命令面板的现有 bug**，已单独开票 [issue 23](23-fix-ime-composition-in-search.md)。

## 主要来源

- npm：https://registry.npmjs.org/cmdk/latest
- cmdk：https://github.com/dip/cmdk
- shadcn command.tsx：https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/new-york-v4/ui/command.tsx
- kbar：https://github.com/timc1/kbar
- Mantine Spotlight：https://mantine.dev/x/spotlight/
- ninja-keys：https://github.com/ssleptsov/ninja-keys
- VS Code quickAccess：https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/workbench/contrib/quickaccess/browser/quickAccess.contribution.ts
- VS Code filters.ts：https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/base/common/filters.ts
- VS Code commandsQuickAccess.ts：https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/workbench/contrib/quickaccess/browser/commandsQuickAccess.ts
- Raycast Navigation：https://developers.raycast.com/api-reference/user-interface/navigation
- uTools：https://www.u-tools.cn/plugins/topic/42/ 、https://www.u-tools.cn/plugins/topic/51/
- pinyin-match：https://github.com/xmflswood/pinyin-match
- ARIA APG Combobox：https://www.w3.org/WAI/ARIA/apg/patterns/combobox/

## Comments

- 2026-11-13：grilling 第一轮期间派后台代理完成，全程只读，未写入任何文件。
- 调研开始时曾假设「只用 cmdk 的 Command 原语就不会引入 radix」，调研**推翻了这个假设**，已在上方「重要纠正」中记录。