# 搜索保留 fd 原生 gitignore 过滤、目录规则下推 exclude，并在开发模式展示 fd 命令

Type: grilling
Status: resolved

## 问题

[issue 51](51-substring-rule-matching.md) 落地后，搜索仍用 `--unrestricted`（等价于 `--no-ignore --hidden`），把 `.gitignore` 忽略的文件也搜了出来；同时因为担心 `fd --exclude` 误伤同名文件，目录排除规则完全没有下推，fd 要遍历全部目录再由应用复核。

用户提出三点要求：

1. 显示每次搜索执行的 fd 命令，只在开发模式可用，生产模式不显示。
2. 保留 fd 原生「忽略 `.gitignore` 中配置」的特性。
3. 在保留该特性的基础上，目录排除规则交给 `--exclude`，文件规则由应用后筛选。

## 实测依据（fd 10.5.0，Windows）

先建可验证夹具再测，避免凭文档猜语义。关键结论：

- **默认模式确实尊重 `.gitignore`**：夹具中 `ignored/b.ts`（被 `ignored/` 忽略）与 `src/debug.log`（被 `*.log` 忽略）在默认模式下都不出现；`--unrestricted` 下两者都出现。
- **`--exclude` 的尾斜杠只匹配目录路径**，这是能安全下推目录规则的关键：
  - `--exclude '*dist*/'`：剪掉 `dist/`、`mydist/`、`dist_backup/`（任意嵌套层级），但**保留全部文件**，包括名为 `dist` 的文件、`dist.ts`、`keep/dist.txt`。
  - `--exclude '*dist*'`（无尾斜杠）：连同 `dist.ts`、`adistb.txt`、`keep/dist.txt` 一起剪掉 —— 这才是会误伤文件的写法。
  - `--exclude 'dist/'`：只剪名称恰好为 `dist` 的目录，保留同名文件，符合忽略目录的全等语义。
- **glob 元字符必须转义**：`--exclude '*a[b]c*/'` 会把 `abxc/` 当字符类匹配一并剪掉；`--exclude '*a\[b\]c*/'` 只剪 `a[b]c/`。反斜杠转义在 Windows 上有效。
- 探针必须在关闭 MSYS 参数转换（`MSYS2_ARG_CONV_EXCL='*'`）下运行，否则 Git Bash 会改写 `--path-separator /` 等参数，得到自相矛盾的结论。

## 答案

- fd 参数用 `--hidden` 取代 `--unrestricted`：保留原生 `.gitignore`／`.ignore` 过滤，同时放开隐藏项，使白名单里的 `.env.example` 之类仍可被搜到。
- 忽略目录下推为 `--exclude '{name}/'`（全等语义）；目录排除规则下推为 `--exclude '*{text}*/'`（包含语义）。`text` 取 `rule_text`（去 `*`、去尾斜杠、trim、转小写），再对 `\ ? * [ ] { }` 做反斜杠转义。空规则跳过。
- 文件排除规则不下推，仍由 `accept_match` → `is_allowed_file` 后筛选。`accept_match` 保留对祖先目录与本名的全部复核，因此 fd 预筛只是性能优化，正确性不依赖它。
- 预筛是「只少剪、不多剪」的安全方向：fd 的 `--exclude` 大小写敏感，而应用规则大小写不敏感，所以 fd 剪掉的是应用必定排除的子集，不会漏掉本该保留的结果。
- `SearchOutcome` 新增 `command: Option<String>`，用 `#[cfg(debug_assertions)]` 渲染、`#[cfg(not(debug_assertions))]` 恒为 `None`，配合 `skip_serializing_if` 使 release 构建根本不下发该字段。前端只按字段是否存在决定渲染，无需第二套开关。
- 前端在搜索下拉头部下方渲染终端风格命令面板：等宽字体、可换行可选中、自定义 slate 配色滚动条、复制按钮沿用项目既有 `writeText` + 2 秒「已复制」反馈，并标注「仅开发模式」。

## 影响

- 被 `.gitignore` 忽略的文件即使显示在文件树中，也不会出现在搜索结果里。这是用户明确要保留的 fd 原生行为，树与搜索的可见范围因此不再完全一致。
- `--hidden` 会让 `.git/` 进入遍历范围，由默认忽略目录 `.git` 的 `--exclude '.git/'` 剪掉；即使用户删掉该忽略项，`accept_match` 仍会拒绝 `.git` 祖先下的结果。
- 目录规则重新下推后，fd 不再遍历被排除的整棵子树，大仓库搜索更快。

## Comments

- 用户要求：「fd 原生搜索默认情况下会忽略 gitignore 中的配置，我想保留这一特性。在保留这个特性的基础上，目录排除规则交给 exclude，文件规则由应用后筛选。」以及「显示每次搜索时执行的 fd 命令，这个只在开发模式下可用，生产模式下不会显示」。
- 本票据修正了 issue 51 中「`--exclude` 不区分文件与文件夹、目录规则不能下推」的判断：带尾斜杠的 glob 只匹配目录，可以安全下推。issue 22/26/29/41、`spec.md`、`PROJECT_REQUIREMENTS.md` 的相关口径已同步。
- 验证：`cargo test --lib` 22 项通过（新增 7 项覆盖 `--hidden`/无 `--unrestricted`、忽略目录与目录规则的下推写法、文件规则不下推、元字符转义、空规则跳过、查询分隔符、命令渲染引号）；`bun run build` 通过。桌面端人工验收待用户执行。