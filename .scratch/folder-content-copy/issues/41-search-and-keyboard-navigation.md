# 41：接入实时搜索与树键盘导航

**要构建：** 用户能搜索当前目录中的可选文件和目录、定位到树节点，并用键盘完成搜索及文件树导航。

**阻塞于：** [浏览真实目录并加载文件树](38-directory-tree-and-pagination.md)、[持久化文件规则设置](39-persist-file-rules.md)、[完成文件选择与选择清单](40-file-selection-and-summary.md)

**状态：** resolved
**标签：** ready-for-agent

**设计来源：** `playground/KeyboardCommand_Folder_Copy/docs/design.md` 的键盘表格与搜索交互是当前基准；此处行为替代旧 issue 22 和 issue 36 中与之冲突的决定。

- [x] 使用用户自行安装的 `fd` 搜索；覆盖 fd 默认跳过的隐藏/忽略项，再应用当前目录规则。fd 不可用时禁用搜索并显示安装指引。新增 `src-tauri/src/search.rs`：`fd_available` 以 `fd --version` 探测系统 PATH，`search_paths` 用 `--unrestricted`（= `--no-ignore --hidden`）覆盖隐藏/忽略项；只把目录规则（`ignored_directories` 与末尾 `/` 的排除规则）交给 `--exclude`，文件规则由应用侧 `is_allowed_file` 后筛，避免 `--exclude` 连带剪枝同名文件夹。fd 不可用时输入框禁用并显示安装命令，徽标改为「重新检测」按钮，兑现「安装后重试」。
- [x] 按大小写不敏感的相对路径纯文本匹配；输入停止 500 毫秒后查询，最多显示 10 项，超出时提示缩小搜索；匹配部分高亮，无结果显示空状态。`--fixed-strings --ignore-case --full-path` 纯文本匹配；前端 500ms 防抖 + 请求版本号防迟到覆盖；`collect_matches` 持续消费到 11 条**有效**匹配或耗尽再升序取前 10（非先取前 10 再过滤），`hasMore` 触发「结果过多，请输入更准确的路径」；`renderHighlightedText` 高亮匹配段，空结果显示「没有搜索到」。**匹配范围已被 [issue 53](53-name-only-search.md) 收窄为文件/目录自身名称：`--full-path` 移除，提示文案改为「请输入更准确的名称」。**
- [x] 遍历部分失败时保留已有搜索结果并提示搜索不完整；`Ctrl+F` 聚焦搜索并选中已输入文本。`--show-errors` + 独立线程排空 stderr（防管道写满阻塞），有错误即 `incomplete=true` 并保留已得结果，输入框旁与下拉内均提示「搜索不完整」；全局 `Ctrl+F` 监听 `focus()` + `select()`。
- [x] 搜索结果上下键移动高亮；Enter 对文件切换选择并保持列表开启，对目录只定位、展开并滚动到可见位置。上下键循环移动 `highlightedIndex`；文件 Enter 调 `onToggleFileSelect(relativePath, size)` + 定位，目录 Enter 仅定位；两者都保持下拉开启。定位 `handleLocateNodeInTree` 逐级展开祖先、缺页继续追加直到目标节点真正出现在树里，目录目标还会加载其首页子项（避免假空目录），再高亮 + `scrollIntoView`。
- [x] 文件树上下键只移动焦点、不改变选择；Space 和 Enter 对文件夹展开/关闭、对文件切换选择；右键展开或进入首个子项，左键折叠或跳到父目录；忽略目录不能展开。`FileTree` 键盘处理：上下键仅 `setFocusedPath`；Space/Enter 合并分支，目录展开折叠（忽略/排除目录守卫）、文件按 `isFileAllowed` 切换；右键未展开则展开、已展开则进入首个子项；左键已展开则折叠、否则跳父目录（顶层跳到根）；根恒展开、可被聚焦，修正原先 `.filter(Boolean)` 把根空串滤掉导致顶层左键失效。
- [x] 逐条完成前，先运行 `ego-browser skill` 并用 ego-browser 检视 playground 搜索栏及文件树键盘交互；对照设计稿后，在桌面应用中手动验收 fd 可用/不可用、部分失败、结果定位和各键盘行为。ego-browser 对照已完成（playground `http://localhost:3578/`，space 1）：搜索下拉、文件 Enter 保持开启且勾选数变化、树焦点移动、上下键只移焦点、Space/Enter 展开折叠均与实现一致。**桌面应用手动验收移交用户执行（待完成），见下方验收记录。**

## Comments

- 搜索从「内存里搜已加载树节点」改为真实 fd 子进程：原 `searchNodes` 只能搜到已展开加载的节点，对未加载目录是盲区。删除 `src/utils/treeUtils.ts` 的 `searchNodes` 与 `src/types` 的 `SearchResultItem`，新增 `SearchMatch`/`SearchOutcome`（与 Rust 同形，camelCase）与薄封装 `src/data/searchBackend.ts`。
- **评审发现并修复的阻断级缺陷（分隔符断层）**：fd 在 Windows 上 `--full-path` 按原生 `\` 匹配，`--path-separator /` 只改输出不改匹配。原实现把用户查询原样交给 fd，导致任何含分隔符的跨目录查询（如 `utils/tree`）恒为空。修复：`normalize_query` 把查询统一成 `/` 供应用侧 `accept_match` 比较；`fd_query_arg` 再把 `/` 转成平台原生分隔符交给 fd 预筛。两端都通，单测 + 真实 fd 命令双重验证。**后续 [issue 53](53-name-only-search.md) 判定 `--full-path` 这一匹配方式本身就是缺陷（父目录命中会带出无关子项），已整体移除，`fd_query_arg` 与这层分隔符转换随之删除。**
- **评审发现并修复的阻断级缺陷（目录定位假空）**：原 `handleLocateNodeInTree` 只 `setExpandedFolders`，绕过了加载分支，目录定位后呈现「展开目录以读取内容」空壳。修复：定位流程对目录目标额外加载首页子项。
- 迟到结果防护用单调递增 `requestVersion` ref：旧查询返回时若版本号已变则丢弃，不覆盖新查询。
- stderr 用独立线程排空并采样（上限 20 条），取够 11 条有效匹配即 `child.kill()` + `wait()`，不必遍历完整目录；warning 只报首条错误，避免采样截断后计数失真。
- GUI 拉起控制台程序用 `CREATE_NO_WINDOW`（命名常量）防黑窗闪烁。
- 抽出 `appendDirectoryPage(node, page)` 统一首页加载与分页追加形状，消除三处重复（`handleToggleExpandFolder` / `handleLoadMoreChildren` / 定位）。
- 伪造 fd 状态的设计预设（`search_fd_missing` / `search_incomplete`）已删除：fd 可用性与搜索完整性必须来自真实检测，不能由预设伪造。`search_over10` / `search_empty` 保留为真实查询词预填（`presetQuery`），仍走 500ms 防抖与真实 fd。预设栏由 13 项重排为 11 项。
- 搜索结果文件大小：fd 不返回 size，对文件结果额外 `fs::metadata` 取大小并透传给 `handleToggleFileSelect(path, size?)`，使尚未加载进树的文件被勾选时大小不为 0。

## 验收记录

机器证据（已完成）：

- `cargo test --lib`：7 个测试全绿（`accept_match` 大小写不敏感纯文本、忽略目录祖先剪枝、文件规则只作用于文件而保留同名目录、11 条有效匹配截断 + 升序、目录识别与全路径排序、反斜杠查询归一化、fd 预筛参数用平台分隔符）。
- `cargo check` 无错误；`bun run build`（`tsc && vite build`）无类型错误、构建成功。
- 真实 fd 10.5.0 端到端：归一化后的 `components\folder-copy` 返回目录及子文件；未归一化的 `components/folder-copy` 恒空（证明分隔符修复必要）；`utils\tree` 命中 `./src/utils/treeUtils.ts`。
- ego-browser 对照 playground（`http://localhost:3578/`）：搜索栏占位文案、下拉「文件回车切换勾选，目录回车仅定位 (保持下拉开启)」、文件 Enter 后勾选数 4→3 且树焦点移到 copier.ts、树上下键只移焦点、Space/Enter 对目录展开折叠——均与实现一致。

用户桌面验收（待执行，按项目约定由用户在运行中的桌面应用完成）：

- fd 可用：输入跨目录路径（如 `components/folder`）能出结果；fd 不可用（临时从 PATH 移除）：输入框禁用 + 安装指引，装回后点「重新检测」恢复。
- 部分失败：对含无权限子目录的根搜索，保留可访问结果并提示「搜索不完整」。
- 结果定位：文件 Enter 切换勾选并滚动到可见；目录 Enter 展开并加载子项、滚动到可见，不呈现假空目录。
- 键盘：树上下键只移焦点不改选择；Space/Enter 展开折叠目录、切换文件；右键展开/进入首个子项；左键折叠/跳父目录（含顶层跳根）；忽略目录不能展开；`Ctrl+F` 聚焦并全选已输入文本。

## Comments

- 本票据实现时的 fd 策略（`--unrestricted` 覆盖隐藏/忽略项、目录规则以裸名传 `--exclude`）已被 [issue 51](51-substring-rule-matching.md) 与 [issue 52](52-fd-gitignore-and-dev-command.md) 取代：规则改为名称包含语义，fd 改为保留 `.gitignore` 过滤、只用 `--hidden`，目录规则以 `name/` 与 `*text*/` 下推。搜索交互、键盘导航与错误反馈行为不变。