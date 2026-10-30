# 确定忽略目录的默认规则

Type: grilling
Status: resolved

## 问题

设置弹窗允许用户配置忽略目录。首版默认应忽略哪些目录？规则在哪些文件夹层级生效？默认规则是否可在设置弹窗中逐项删除或恢复？

## 答案

- 忽略目录设置在整个应用范围内共用，并应用于每个已选根目录下的任意层级；按目录名匹配。
- 默认忽略以下目录：`.git`、`.hg`、`.svn`、`node_modules`、`bower_components`、`target`、`dist`、`build`、`out`、`.next`、`.nuxt`、`.output`、`.vite`、`.turbo`、`coverage`、`playwright-report`、`test-results`、`__pycache__`、`.pytest_cache`、`.mypy_cache`、`.venv`、`venv`、`.pnpm`、`.cache`、`.idea`、`.vscode`、`.history`、`.gradle`。
- 设置中允许逐项添加和移除忽略目录，并提供“恢复默认值”操作。
- 被忽略目录在树中仍显示为已忽略节点，不展开或遍历其后代，见 [issue 03](03-ignored-directory-presentation.md)。
- `.DS_Store` 是文件，不属于目录忽略清单；将其作为文件级默认排除项记录在 [issue 29](29-file-exclusion-rules.md)。
