# 42：复制文件上下文包

**要构建：** 用户能预览并复制当前选择的文件上下文包，也能从树中右键单独复制一个文件；复制写入系统剪贴板并立即显示对应历史记录。历史记录的持久化和管理由后续票据完成。

**阻塞于：** [完成文件选择与选择清单](40-file-selection-and-summary.md)

**状态：** resolved
**标签：** ready-for-agent

**设计来源：** playground 已随 issue 46 删除，复制栏、预览弹窗和单文件右键交互改以 `docs/design/文件夹复制界面绘制说明.md` 与设计文档为基准（见总规格“基准来源已变更”决定）；包格式与失败规则见 `.scratch/folder-content-copy/spec.md`，并取代 issue 31 的旧格式决定。

- [x] 按当前设计生成完整 Markdown 包：包含文件数、生成时间、来源根目录、文件清单及文件内容区块；内容完整、路径与语言标记正确。新增 `src-tauri/src/context_package.rs`，由 Rust 读取真实文件内容并渲染，删除前端 `generateContextPackageMarkdown` 与 `FileNode.content` 模拟内容。
- [x] 预览显示即将复制的包；“复制文件上下文包”按钮及 `Ctrl+Shift+C` 写入系统剪贴板并给出成功反馈。剪贴板统一改用官方 `@tauri-apps/plugin-clipboard-manager` 的 `writeText` 并 `await` 结果，不再使用 `navigator.clipboard`。
- [x] 仅可选文件节点显示右键菜单“仅复制当前文件”；复制单文件并新增一条历史，不改变已有选择集合。目录、忽略节点和不可选文件不显示该菜单。
- [x] 普通复制任一文件读取失败时全量取消，保留剪贴板和选择，并显示失败路径及可获取原因；剪贴板写入失败时也不创建成功历史。
- [x] 成功复制后在当前运行时历史列表中新增记录；历史跨重启持久化由 [issue 43](43-history-storage-and-workflows.md) 完成。
- [x] 空选择或正在读取时主复制按钮禁用；执行时显示加载状态（“正在合成上下文包…”）。
- [x] 逐条完成前，先对照设计基准检视页面与交互，再在已接入 Rust 的应用中手动验收多文件复制、读取失败、剪贴板反馈及单文件复制无副作用。（原步骤要求先用 ego-browser 检视 playground；playground 已删除，按总规格决定改为以绘制说明文档为基准在运行中的应用内检视。）

## Comments

- 失败原因必须来自真实底层错误：首版失败弹窗沿用了 playground 的演示文本（`SystemError [...] File is locked by another process`），在测试 2 被用户截图当场暴露。已为 `CopyFailureDetail` 增加 `detail` 字段，把 Rust 返回的 io/UTF-8 底层错误透传到「技术详情」，状态预设演示条目单独标注为演示数据。
- 非 UTF-8 文本的口径由用户在验收中提问并拍板“保持现状”：解码失败等同读取失败，触发普通复制全量取消，错误码 `EENCODING`，技术详情给出首个非法字节位置；不采用 Repomix/Gitingest 的“跳过并留痕”，也不按系统 ANSI 代码页转码。该决定已写入总规格与 `map.md`「已作决定」。
- 普通复制与历史“读取当前文件”是两种语义（全量取消 vs 跳过失败项并替换记录），因此拆成 `generate_context_package` 与 `refresh_context_package` 两个命令，而不是在一个命令里塞开关；后者在“一个文件都没读到”时返回空正文并只提示，不弹失败对话框。
- 右键菜单泄漏 WebView2 原生检视菜单的问题在本票据验收中发现，已由 `src/data/browserMenuPolicy.ts` 实现“开发版默认允许、发布版默认屏蔽 + 系统设置开关（`kbc_allow_browser_menu`）”，归入 [issue 44](44-system-settings-and-desktop-integrations.md) 收尾。

## 验收记录

机器证据（把剪贴板导出到文件逐字节比对，夹具在 `%TEMP%\kbc42-demo`）：

- 测试 1 多文件复制：包内 3 个文件，README 含反引号代码块时围栏自动升为 4 个反引号，`.tsx` 标 `tsx`，CRLF 文件原样保留 `\r\n`，无模拟内容残留。
- 测试 2 读取失败：勾选 `gbk.md` 后复制弹出失败对话框，摘要为中文、技术详情显示 `UTF-8 解码失败：invalid utf-8 sequence of 1 bytes from index 0`。
- 测试 4 多文件含中文名：剪贴板转储确认 2 个 `#### [FILE: ...]` 区块，相对路径使用 `/`。
- 测试 5 历史“读取当前文件”：删除两个源文件之一后，该历史记录被只含剩余 1 个文件的新包替换且时间刷新，符合“跳过失败项、有成功即替换”的口径。
- 测试 6 单文件右键复制：转储为单区块包，CR/LF 计数与原文件一致，原有勾选未被清除（用户另行确认）。

用户桌面验收：测试 3 预览弹窗显示真实内容；`Ctrl+Shift+C` 触发复制正常；上述 4 项右键菜单策略结果正常。

未能机器证明的一项：测试 2 的“失败时剪贴板保持不变”因用户随后用截图覆盖了剪贴板而无法取证，只能依据代码路径（失败即在写剪贴板之前返回）与历史条数未增加来论证。
