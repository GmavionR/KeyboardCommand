# 05：命令匹配沿用名称包含，配英文别名

Type: grilling
Status: resolved
Label: ready-for-agent

## 问题

这是与项目既有决定的正面冲突点。

[folder-content-copy issue 51](../../folder-content-copy/issues/51-substring-rule-matching.md) / 52 / 53 刚把筛选规则与文件搜索统一为「**名称包含、不区分大小写、无通配符**」。而主流命令面板（cmdk、VS Code、Raycast）用的是**子序列 fuzzy 匹配 + 打分排序**。

命令面板跟哪一边？

## 答案

**沿用名称包含匹配**，与全项目一致：

- 大小写不敏感的纯文本包含匹配。
- 不支持通配符，不做子序列 fuzzy。
- **不引入打分排序**；命中结果按分类的固定顺序排列。
- 每条命令可携带**英文别名关键词**，让 `set` 命中「设置」、`copy` 命中「复制文件上下文包」。别名与命令名一起参与同一套包含匹配。

理由：中文命令名做 fuzzy 收益很低，而全项目统一匹配语义的价值更高。

## 主流验证

调研（见 [issue 08](08-prior-art-research.md)）证实这个组合是被主流验证过的模式，不是自创：

- **VS Code** 在本地化构建下把英文原始标题作为 `commandAlias`，与本地化 label 一起参与匹配——正是「本地化名 + 英文别名」。其匹配代码中没有任何拼音逻辑。
- **uTools** 是「中文名 + 英文指令 + 拼音首字母」三者并存（`本地搜索` / `find` / `ss`）。

拼音首字母是**可选叠加项**，本票不决定是否采用，见 [issue 22](22-pinyin-initial-matching.md)。

## Comments

- 2026-11-13：grilling 第一轮 Q5，用户答「agree」。
- 若最终选用 cmdk（见 [issue 18](18-cmdk-dependency-choice.md)），需要用 `shouldFilter={false}` 关掉它内置的 fuzzy 过滤与排序，改为自行条件渲染；该 prop 会同时关闭过滤和排序，正好符合本决议。