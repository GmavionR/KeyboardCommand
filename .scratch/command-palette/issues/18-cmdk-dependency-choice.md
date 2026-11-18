# 18：是否引入 cmdk

Type: grilling
Status: resolved
Label: ready-for-agent

## 决议

采用 **引入 `cmdk`（配合 `shouldFilter={false}` 自定义过滤与定制外壳）** 方案。

### 核心规则与配置

1. **复用优势**：
   - 一次性获取成熟完备的键盘上下导航、循环跳转、分组渲染、输入法组字守卫（`isComposing`）、完整 ARIA combobox 无障碍模式；
   - 官方已支持 React 19（本项目为 19.1）。
2. **过滤与排序控制**：
   - 配置 `shouldFilter={false}`，彻底关掉 cmdk 自带的英文模糊评分（command-score），完全由项目自身已决议的「大小写不敏感纯文本包含匹配」控制可见项与顺序。
3. **快捷键定制**：
   - 禁用 cmdk 默认开启的 `vimBindings`（避免其内部 Ctrl+P/K/N/J 与应用及系统热键冲突），保持纯净的上下方向键与 Enter 行为。
4. **视觉定制**：
   - 外层由 Tauri 独立无边框 Webview 承载，内层 cmdk 结构完全使用项目自身的 Tailwind v4 类名（slate/blue 主题配色），保持视觉统一。

## Comments

- 2026-11-18：用户在 Grilling 第二轮明确确认本决议。
