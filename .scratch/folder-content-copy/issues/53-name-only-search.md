# 搜索只匹配文件名/目录名，去掉会把父目录带出来的 --full-path

Type: bug
Status: resolved

## 问题

用户报告：「现在有一个 bug，`--full-path` 会把父级目录路径也纳入匹配范围。导致搜索到当前文件夹下文件不符合搜索字符串，但是文件的父级别的路径符合搜索字符串的问题。所以不要用 `--full-path`，只匹配文件名或目录名。」

[issue 41](41-search-and-keyboard-navigation.md) 落地的实现用 `fd --fixed-strings --ignore-case --full-path`，应用侧 `accept_match` 也拿**整条相对路径**做包含比较。两端一致，但一致地错：搜索 `components` 会把 `components/` 下所有通过规则的文件都列出来，即使它们的名称与 `components` 毫无关系。结果列表被同名目录的内容淹没，10 条上限很快被无关项占满。

## 实测依据（fd 10.5.0，Windows）

夹具：`components/copier.ts`、`components/helper.rs`、`utils/tree.ts`、`notes.md`。关闭 MSYS 参数转换（`MSYS2_ARG_CONV_EXCL='*'`）后运行：

- 带 `--full-path`，查询 `components`：返回 `./components/`、`./components/copier.ts`、`./components/helper.rs` —— 后两条是用户报告的误匹配。
- 去掉 `--full-path`，查询 `components`：只返回 `./components/`。
- 去掉 `--full-path`，查询 `copier`：返回 `./components/copier.ts`。

- 去掉 `--full-path`，查询 `utils/tree`：fd 直接以退出码 1 报错 —— `The search pattern 'utils/tree' contains a path-separation character and will not lead to any search results.`
- 去掉 `--full-path`，查询 `TREE`：返回 `./utils/tree.ts`，大小写不敏感仍生效。

结论：fd 默认只匹配 basename（文件与目录都按自身名称匹配），正是需要的语义，不需要额外参数；但含分隔符的 pattern 会被 fd 判为错误而非空结果。

## 答案

- `fd_search_command` 删除 `--full-path`，其余参数不变（`--hidden --fixed-strings --ignore-case --show-errors --color never --path-separator /`，目录规则继续下推 `--exclude`）。
- `accept_match` 先用 `split('/')` 取末段作为**自身名称**，只对名称做 trim + 小写的包含比较；名称不命中直接拒绝，不再看父路径。祖先目录仍逐个复核忽略/排除规则，本名仍按目录规则或 `is_allowed_file` 判定。
- 删除 `fd_query_arg`：它唯一的作用是把查询里的 `/` 转成平台原生分隔符以适配 `--full-path` 的匹配方式。名称里不含分隔符，这层转换连同它的单测一起移除；`normalize_query` 收敛为 `query.trim().to_lowercase()`。
- 新增 `is_unmatchable_query`：空查询或含路径分隔符（`std::path::is_separator`，Windows 上同时覆盖 `/` 与 `\`）时在**拉起 fd 之前**返回空结果。否则 fd 的报错会进 stderr，被 `run_fd_search` 当成遍历失败而误报「部分路径无法访问，搜索不完整」的琥珀色警告 —— 用户只是输了个不可能命中的词，不是磁盘出了问题。
- 排序、10 条上限、`has_more`、高亮、Enter 行为都不变。结果仍按完整相对路径升序，只是入选条件变严。

## 影响

- 含分隔符的查询（`utils/tree`、`utils\tree`）不再能匹配任何结果，因为名称里没有分隔符。这是语义收紧的必然结果，不是缺陷；应用提前短路，显示正常的「没有搜索到」空状态而非错误警告。
- 想按目录缩小范围时，改为搜索目录名定位到该目录，再在树中浏览；搜索框不再承担路径过滤职责。
- fd 预筛与应用侧复核依旧同语义，预筛只影响性能不影响正确性。

## Comments

- 本票据取代 [issue 22](22-live-search-experience.md) 原答案中「相对路径包含完整输入文本即为匹配」的口径，也取代 issue 41 中为 `--full-path` 分隔符断层所做的那次修复（该修复本身正确，但修的是不该存在的匹配方式）。
- 前端文案同步：输入框占位符改为「搜索文件名或文件夹名」，下拉头部改为「匹配名称结果」，空状态改为「只比对文件/文件夹自身的名称……」，超限提示改为「结果过多，请输入更准确的名称」。
- 结果副行的路径高亮改为只高亮末段名称：原来对整条 `relativePath` 取首个 `indexOf`，当查询同时出现在父目录名里时，高亮会落在父目录段上，与「因为名称命中才入选」的事实不符。现在前缀目录部分原样输出，只有名称段走高亮。
- 验证：`cargo test --lib` 23 项通过。新增/改写 5 项：名称大小写不敏感包含、父目录命中但本名不命中必须拒绝（含带分隔符查询）、目录按自身名称命中、fd 参数中不得出现 `--full-path` 且查询按 trim + 小写原样传入、不可能命中的查询提前短路。写第一版回归测试时误用 `treeUtils.ts` 作反例（`treeutils` 本身就含 `utils`），被测试当场抓出，改用 `components/copier.ts` 夹具。真实 fd 10.5.0 复跑上述四条命令，结果与预期一致。桌面端人工验收待用户执行。