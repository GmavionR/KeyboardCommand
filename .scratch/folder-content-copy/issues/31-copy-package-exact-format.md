# 确定文件上下文包的精确文本格式

Type: grilling
Status: resolved

## 问题

已决定每个文件以绝对路径作为标题，后接 Markdown 代码块；代码围栏按内容自动延长，避免与文件内容冲突。本票据确定可直接用于验收的精确格式。

## 答案

- 每个文件以二级标题开始，标题中使用 Markdown 行内代码包住文件绝对路径；例如标题以 `##` 开头，后接路径行内代码。行内代码中的路径按原样呈现，空格、Markdown 符号和 Windows 反斜杠不转义；路径含反引号时，行内代码分隔符长度大于路径中最长的连续反引号串。
- 标题与文件代码块之间空一行。每个文件使用一个 Markdown 围栏代码块；文件代码块之间空一行。
- 代码块语言标记依据文件类型选择常见语言标识；无扩展名或无法识别的类型使用 `text`。
- 使用反引号作为代码围栏，最少三个；围栏长度为文件内容中最长连续反引号串的长度加一。
- 文件内容中的 CRLF 和 CR 换行统一为 LF；不裁剪文件内容、不删除尾部空行。
- 整个文件上下文包以一个 LF 换行符结尾。

格式示例：

````markdown
## `C:\项目\src\App.tsx`

```tsx
export function App() {
  return <main>Hello</main>;
}
```

## `C:\项目\README.md`

```markdown
# 项目说明
```
````

如文件内容含有三个或更多连续反引号，围栏长度相应增加至比内容中最长的连续反引号串多一个。

成熟的 Repomix 也采用逐文件 Markdown 区块、按文件类型标注围栏、区块间留空行，并按内容延长围栏。[格式说明](https://github.com/yamadashy/repomix#output-file-format)、[Markdown 输出实现](https://github.com/yamadashy/repomix/blob/main/src/core/output/outputStyles/markdownStyle.ts)

## Comments

- 用户确认标题、区块间距、代码围栏语言标记、围栏长度、内容换行处理及包末尾换行规则。
