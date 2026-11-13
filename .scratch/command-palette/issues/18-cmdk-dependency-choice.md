# 18：是否引入 cmdk

Type: grilling
Status: open
Label: needs-triage

## 问题

**这是第一轮已经提出但用户未回答的问题（原 Q8）。** 事实前提已由 [issue 08](08-prior-art-research.md) 备齐。

三条路：

- **(a) cmdk + 用它的 `Command.Dialog`**：一次性拿到键盘导航、循环选择、分组、完整 ARIA、**输入法组字守卫**、portal、焦点陷阱、Escape。代价：+16.7 kB gzip、+4 个运行时依赖（含 `@radix-ui/react-dialog`，**无法 tree-shake 掉**），且 radix 浮层的默认行为与现有 4 个手搓弹窗不一致——命令面板会成为项目里唯一「正规」的浮层。
- **(b) cmdk + 自己写外壳**：沿用现有 `fixed inset-0 z-50` 遮罩约定，焦点陷阱与 Escape 自己补。radix 依赖照样进包，只是不用。
- **(c) 零依赖手搓**：约 150–250 行，视觉与现有弹窗完全一致，但输入法守卫、ARIA、焦点陷阱、循环选择全要自己写对。

## 提问时的倾向

倾向 **(a)**，理由：

1. [issue 06](06-overlay-open-close-behavior.md) 已确认要「Escape 关闭 + 点遮罩关闭 + 焦点恢复」，这正好是 radix Dialog 的默认行为，自己写等于重新实现一遍 radix。
2. **输入法守卫**这种坑手搓极可能漏——现有 [`SearchBar.tsx:141`](../../../src/components/folder-copy/SearchBar.tsx) 就漏了（见 [issue 23](23-fix-ime-composition-in-search.md)），而命令面板全是中文命令名，必然踩同一个坑。
3. AGENTS.md 要求模仿最流行实现，cmdk 月下载 1.739 亿是采用度断层第一，且官方支持 React 19。
4. 视觉上用项目自己的 Tailwind 类覆盖，保持 slate/blue 配色不变。
5. 「与现有弹窗不一致」记成技术债，将来用同一套原语反过来重构那 4 个弹窗，而不是让新代码迁就旧缺陷。

**此倾向未与用户确认，不构成决议。**

## 决策的连带影响

- 选 (a) 或 (b) 都要用 `shouldFilter={false}` 关掉内置 fuzzy 过滤与排序，以符合 [issue 05](05-matching-semantics.md) 的名称包含决议。
- 选 (a) 时，若 [issue 10](10-presentation-form.md) 确定存在独立窗口形态，`Command.Dialog` 的 portal 与焦点陷阱在独立 webview 里是否仍合适，需要一并确认。
- cmdk 的 `vimBindings` 默认开启（Ctrl+N/J/P/K），其中 **Ctrl+P 与 Ctrl+K** 是否与项目快捷键冲突需要检查；倾向关掉 vimBindings 只保留上下键。

## Comments

- 2026-11-13：grilling 第一轮 Q8，因用户外出未答。
- 提问前曾错误地以为「只用 Command 原语就不会引入 radix」，issue 08 已纠正：radix-dialog 是 cmdk 自身硬依赖。