# 40：完成文件选择与选择清单

**要构建：** 用户能在真实文件树中选择文件或目录，查看三态选择结果，并在当前选择面板管理已选文件。

**阻塞于：** [浏览真实目录并加载文件树](38-directory-tree-and-pagination.md)

**状态：** resolved
**标签：** ready-for-agent

**设计来源：** `E:\DevProjects\LocalProjects\tauriProjects\KeyboardCommand_Folder_Copy\docs\design.md` 是文件树和选择面板 UI/交互的当前基准；该演示项目的 React 代码仅作 UI/交互参考。选择规则见 `.scratch/folder-content-copy/spec.md`。

- [x] 单击文件切换其选择；选择目录递归纳入符合当前规则、未被排除且不在忽略目录下的文件。
- [x] 目录根据可选后代显示全选、部分选中或未选中状态；目录选择与文件规则变更保持一致。
- [x] 提供全部展开、全部折叠、全选符合规则文件和清空选择操作。
- [x] 当前选择面板展示已选文件及大小、文件数量；可直接移除单项。
- [x] 复制相对路径清单到系统剪贴板，并反馈复制成功或失败；选择面板与树的选择状态保持同步。使用 Tauri 官方 clipboard-manager 插件写入系统剪贴板。
- [x] 先使用 ego-browser 检视 playground，再在桌面应用中手动验收文件/目录选择、三态反馈、批量操作和清单操作。playground 通过 `pnpm run dev` 在 `http://localhost:3578/` 运行；没有使用 `file://`。

## Comments

- 用户修正范围：不实现 Token 估算。已从本票据和总规格中删除该要求；选择面板仅显示文件大小、文件数和总字节数。
- 已完成 playground 与桌面端交互验收：目录递归选择能统计惰性分页中未展开文件的实际大小；移除单项后目录正确显示部分选择；目录勾选、清空和列表状态同步正常。
- 系统剪贴板采用 Tauri 2 官方 clipboard-manager 插件的 `writeText` API；capability 显式启用 `clipboard-manager:allow-write-text`，并已在桌面应用实际验证复制成功。该插件权限默认不开放，需按使用场景显式授权。参考 [Tauri Clipboard 插件文档](https://v2.tauri.app/plugin/clipboard/)。

## Answer

已完成 issue40。选择面板显示文件数、单文件大小和总大小，路径清单通过系统剪贴板复制并反馈结果；支持递归目录选择、三态、批量操作和列表同步。历史时间显示为“刚刚”“N 分钟前”等相对时间；文件大小仅用于界面统计，不写入文件上下文包。不实现 Token 估算。Playground 以 `pnpm run dev` 在 3578 端口运行并检查，桌面端交互已手动验收。

- 用户后续修正：文件上下文包不包含文件大小注释；复制历史时间改为“刚刚”“N 分钟前”等相对时间，并可通过悬停查看本地完整时间。
- 已删除模拟文件内容中的文件大小注释；复制历史相对时间每 30 秒刷新一次。
