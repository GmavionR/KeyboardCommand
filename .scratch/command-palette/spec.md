# 命令面板产品技术规格说明书

Type: spec
Label: ready-for-human
Status: ready-for-human

## 问题陈述

KeyboardCommand（KbcApp）是一款面向 Windows 的键盘效率工具，随着应用功能（如文件夹内容复制、提示词列表等）与操作的不断增加，用户在日常高频办公中需要一种**无需使用鼠标逐级翻找页面、在 Windows 任意工作场景下即可一键唤出并执行应用功能**的高效交互通道。

此前应用仅具备窗口内部聚焦时的局部快捷键（如 `Ctrl+Shift+C`、`Ctrl+F`），一旦主窗口最小化、被其他应用遮挡或隐藏至系统托盘，应用即无法响应任何键盘操作；且外部程序调用（`kbcapp --route <path>`）主要服务于脚本与自动化，不适合人类日常屏幕前直观操作。因此，需要一套常驻系统后台、支持全局唤起、按名称毫秒级定位并执行应用功能的**命令面板**。

## 解决方案

为 KeyboardCommand 建立应用外壳级的**命令面板（Command Palette）**能力：

1. **常驻后台与系统级全局热键**：基于 Tauri 2 原生托盘能力与官方 `tauri-plugin-global-shortcut` 插件，提供系统级、可配置的全局热键（默认 `Ctrl+Shift+K`）；关闭主窗口（点击 ×）自动隐藏到系统托盘，保持后台热键与服务常驻。
2. **统一独立浮层窗口形态**：无论主窗口在托盘、最小化、被遮挡还是在当前屏幕，热键一律唤起屏幕水平居中偏上、无边框、无任务栏图标、透明背景的轻量独立 Webview 面板窗口（Spotlight / Raycast 风格）；预创建隐藏复用实现 0 毫秒级秒开；点击面板外任意区域（失焦）或按 Escape 自动隐藏，且不出现在任务栏与 Alt+Tab 切换器中。
3. **基于 cmdk 的精确交互与输入法守卫**：引入 `cmdk` 作为交互原语，提供完整 ARIA combobox 无障碍和键盘上下循环选择；配置 `shouldFilter={false}` 接管为大小写不敏感的纯文本包含匹配并支持英文别名（首版不引入拼音库）；自带输入法组字守卫（`isComposing`），彻底消除中文打字选词时的误触。
4. **统一命令注册表与面向未来扩展的执行接口**：功能路径收敛为单一事实清单；命令单层展示，按「页面 / 操作 / 外观 / 设置」四段固定排序。在接口层抽象定义 `CommandItem` 契约与 `CommandProvider` 动态提供者架构，不仅支持内置功能命令，更原生支持未来接入**用户自定义命令配置页面**（从 SQLite 动态读取用户自定义命令并执行）；跨页面动作具备智能自动先跳转后执行能力。
5. **跨窗口全局主题实时同步**：将 `ThemeProvider` 提升到根布局，通过事件广播与共享存储实现独立面板与主窗口的双向秒级外观同步。
6. **诚实反映的系统设置**：在系统设置中准确呈现命令面板的系统级生效作用域，若遇系统快捷键冲突如实标红提示；现有 `Ctrl+Shift+C` 与 `Ctrl+F` 保持为应用内快捷键；顺带修复现有文件夹实时搜索框的输入法组字误触缺陷。

## 用户故事

1. **全局快捷唤出**：作为开发者，在 Windows 任意全屏软件（如 IDE、浏览器）中工作时，我随时按下 `Ctrl+Shift+K`，都能在当前鼠标所在的屏幕上方中央立即看到一个极简、半透明圆角的命令面板，输入焦点自动就位。
2. **轻量无干扰与快速撤销**：作为开发者，当我只是想临时调起面板看一眼，或者误触了热键，我只需按一下 `Esc` 键，或者用鼠标点击屏幕任意其他位置，面板立即静默消失，焦点无缝恢复给刚才的软件，任务栏不留任何痕迹。
3. **热键 Toggle 切换**：作为开发者，当命令面板已经弹出在屏幕上时，我再次按下 `Ctrl+Shift+K`，面板立即收起隐藏。
4. **跳转到指定功能**：作为开发者，我在命令面板中输入 `fc`、`folder` 或中文 `文件夹`，命中并回车选择「打开文件夹内容复制」，命令面板立即隐藏，主窗口自动从后台/托盘/最小化恢复到屏幕前台并切到 `/folder-copy` 路由。
5. **一键打开并加载文件夹**：作为开发者，无论我当前主窗口处于哪个页面（如 `/prompts`）或已隐藏至托盘，我在面板中输入 `打开` 或 `folder` 并选择「打开文件夹...」，面板立即隐藏，主窗口自动置前恢复并切至 `/folder-copy`，同时系统立刻弹出文件夹选择对话框供我挑选项目目录并自动加载。
6. **面向未来的用户自定义命令支持**：作为高级用户，未来我可以在命令配置页面添加属于自己的自定义快捷命令，命令面板能够直接读取并无缝列出我的自定义命令，支持像内置命令一样按名称搜索并一键执行。
7. **克制清晰的空状态与单层结构**：作为开发者，输入框为空时我能一眼看到清晰、克制的首版精简清单，按分类固定有序排列，不被冗余琐碎操作打乱视线，易于形成肌肉记忆。
8. **快速切换视觉主题**：作为开发者，我在命令面板中搜索 `dark`、`light` 或 `外观`，选择「外观：深色模式」，命令面板自身立即变为深色，主窗口也同时变为深色，且在外观条目右侧清晰看到当前选中状态的打勾标记 `✓`。
9. **中文拼写无误触**：作为中文用户，我在面板搜索框用拼音打字输入汉字时，按上下方向键翻选输入法候选词不会导致面板高亮条乱跳，按 Enter 键确认上屏文字不会误执行面板命令。
10. **系统托盘后台驻留**：作为开发者，我点击主窗口右上角的 × 关闭按钮，主窗口平滑隐藏至系统托盘，进程不退出；双击或左键点击托盘图标可重新呼出主窗口；右键托盘菜单可选择彻底退出。
11. **冲突与诚实设置**：作为开发者，若我配置的全局热键被系统中其他程序占用，应用在系统设置中清晰标红提示冲突状态，不会给出“已生效”的假象。
12. **既有搜索缺陷修复**：作为开发者，在主窗口文件夹浏览的实时搜索框中输入中文时，按 Enter 上屏汉字不再误勾选文件，输入法体验与命令面板同样稳健。

## 实现决定

### 1. 窗口架构与生命周期（遵循 ADR 0004）

- **双窗口结构**：
  - **主窗口（`main`）**：原应用窗口，承载路由页面与具体业务功能；
  - **命令面板窗口（`command-palette`）**：在 `tauri.conf.json` 或 setup 阶段预先创建的独立 Webview 窗口，初始属性：
    - `label`: `"command-palette"`
    - `url`: `"index.html"`（通过挂载独立的轻量面板路由组件 `/palette` 或动态挂载点加载）
    - `decorations`: `false`（无原生标题栏）
    - `transparent`: `true`（透明背景）
    - `skipTaskbar`: `true`（不显示在任务栏和 Alt+Tab）
    - `alwaysOnTop`: `true`（始终置于普通应用窗口之上）
    - `resizable`: `false`
    - `visible`: `false`（启动时预载但保持隐藏）
- **预创建复用机制**：启动时完成 Webview 实例化，避免每次按热键经历 Webview 创建与 DOM 加载导致的 200~500ms 白屏卡顿；呼出耗时为 0 毫秒级。
- **定位与多显示器跟随**：
  - 固定逻辑宽度 640px；
  - 呼出时通过 Tauri 原生接口获取当前鼠标所在屏幕的工作区信息（`current_monitor()` / `monitor_from_point()`），水平居中，垂直位于距离工作区顶部 20%~25% 处（Spotlight 风格）；
  - 高度随内容自适应紧凑包裹，上限限制为 420px，超出时在容器内部触发紧凑滚动条（`.fd-command-scroll`）。
- **失焦与隐藏**：
  - Web 侧监听 `appWindow.onFocusChanged` 或 Rust 侧监听 `WindowEvent::Focused(false)`，失去焦点即调用 `window.hide()`；
  - 按 Escape 键调用 `window.hide()`；
  - 面板处于已显示状态时，再次按下全局唤起热键直接将其 `hide()`（Toggle）；
  - 执行任何命令后立即 `hide()`；若为跳转命令，主窗口调用 `window.show()`、`window.unminimize()`、`window.set_focus()` 激活置前；
  - 面板隐藏后，Windows 系统自动把系统输入焦点交还给唤起前的前台窗口。

### 2. 系统托盘与主窗口关闭交互

- **Tauri 2 原生集成**：
  - 在 `Cargo.toml` 开启 `tauri = { version = "2", features = ["tray-icon"] }`，无需引入第三方插件；
  - 在 `src-tauri/src/lib.rs` 中使用 `tauri::tray::TrayIconBuilder` 与 `tauri::menu::MenuBuilder` 初始化。
- **关闭拦截**：
  - 监听主窗口的 `WindowEvent::CloseRequested`，调用 `api.prevent_close()` 阻止窗口销毁，并调用 `window.hide()`。
- **托盘菜单与事件**：
  - 左键单击托盘图标（配置 `.show_menu_on_left_click(false)` 并在 `on_tray_icon_event` 中捕获 `MouseButton::Left`）：显示并激活主窗口；若主窗口已在前台则隐藏；
  - 右键上下文菜单提供：
    1. 「显示主窗口」
    2. 「命令面板」（点击可直接呼出独立面板）
    3. 分隔线
    4. 「退出」（调用 `app.exit(0)`，唯一彻底退出应用的途径）。

### 3. 系统级全局热键与系统设置同步

- **官方插件**：采用 `tauri-plugin-global-shortcut = "2"`（前端 `@tauri-apps/plugin-global-shortcut`）；
- **默认键与存储**：默认热键为 `Ctrl+Shift+K`，持久化保存在 SQLite `settings.db` 的通用配置表中；应用启动由 Rust setup 钩子初始化注册；
- **冲突处理与系统设置呈现**：
  - Windows API 底层若提示热键被占用，返回 `Error`，Rust 侧静默捕获不阻断启动；
  - 系统设置（`SystemSettingsModal.tsx`）将快捷键清单分为两类：
    1. **系统级全局热键**：呈现当前配置的命令面板热键（若被占用，以醒目红字如实提示「该快捷键已被系统或其他程序占用，请更换」；支持用户修改配置与单热键录制）；
    2. **应用内快捷键与界面行为**：保留 `Ctrl+Shift+C` 与 `Ctrl+F`，明确标注「仅在应用窗口获得焦点时生效」；
  - 移除此前留在设置界面末尾的「这些能力接入后才会在此处出现开关」临时说明。

### 4. 交互核心：引入 cmdk 与匹配规范

- **依赖选型**：引入 `cmdk`（官方支持 React 19），提供完善的 ARIA combobox 模式、键盘上下循环、分组及内置输入法组字守卫；
- **接管过滤与排序**：
  - 传入 `shouldFilter={false}`，彻底关闭 cmdk 自带的 command-score，完全采用项目已决议的**大小写不敏感纯文本包含匹配**；
  - 命令同时支持中文名称与英文别名（`aliases`），命中文本使用 `<mark className="bg-amber-200 dark:bg-amber-500/40 text-inherit rounded-sm px-0.5">` 进行字符片段高亮；
  - 首版不引入拼音首字母匹配库，保持轻量与零额外运行时开销；
- **禁用默认 vim 键绑定**：
  - 配置禁用 cmdk 的 `vimBindings`（避免其内部 Ctrl+P/K/N/J 造成非预期的快捷键截获），仅保留标准方向键（`↑` / `↓`）与 `Enter`；
- **无结果文案**：无匹配结果时显示居中文案 `没有搜索到匹配命令`。

### 5. 功能路径单一事实来源与命令注册/执行接口设计

- **收敛前端路由清单**：
  - 在 `src/config/routes.ts` 中集中定义功能路径及元数据：
    ```ts
    export interface RouteMetadata {
      path: string;
      title: string;
      aliases: string[];
      category: '页面' | '操作' | '外观' | '设置';
    }
    ```
  - 路由树、TS 类型、命令面板均由此清单派生，消除分散在多处的硬编码；Rust 侧白名单保持一致校验。

- **高度扩展的命令契约与 Provider 体系**：
  为原生支持未来可能增加的**用户自定义命令配置页面**（用户在设置中自定义命令、快捷操作或外部脚本），将命令模型抽象为标准接口：
  ```ts
  /** 分类类型（支持内置与未来用户自定义分类） */
  export type CommandCategory = '页面' | '操作' | '外观' | '设置' | '自定义' | (string & {});

  /** 命令类型 */
  export type CommandType = 'jump' | 'action' | 'custom';

  /** 命令来源：内置 / 功能 / 用户自定义 */
  export type CommandSource = 'builtin' | 'feature' | 'user';

  /** 命令执行上下文（标准能力注入） */
  export interface CommandExecutionContext {
    /** 客户端路由跳转 */
    navigate: (to: string) => Promise<void>;
    /** 激活并将主窗口带到前台 */
    activateMainWindow: () => Promise<void>;
    /** 派发全局或跨窗口事件 */
    emitEvent: (event: string, payload?: unknown) => Promise<void>;
  }

  /** 统一命令项定义 */
  export interface CommandItem {
    id: string;
    title: string;
    category: CommandCategory;
    type: CommandType;
    source: CommandSource;
    aliases?: string[];
    shortcut?: string;
    icon?: string;
    customPayload?: Record<string, unknown>; // 为用户自定义命令预留扩展参数
    run: (ctx: CommandExecutionContext) => void | Promise<void>;
    canExecute?: () => boolean;
    disabledReason?: string;
    checked?: boolean; // 主题等单选项右侧展示 ✓
  }

  /** 动态命令提供者（Provider）模式 */
  export interface CommandProvider {
    id: string;
    getCommands: () => CommandItem[] | Promise<CommandItem[]>;
  }
  ```

- **面向未来的自定义命令扩展点**：
  - 首版实现内置的 `BuiltinRouteProvider`、`FolderCopyProvider`、`AppearanceProvider` 与 `SettingsProvider`；
  - 后续扩展“用户自定义命令”功能时，仅需新增 `UserCustomCommandProvider`（从 SQLite `custom_commands` 表读取数据，转换为 `CommandItem`），面板即可自动识别、呈现并执行用户自定义命令，无需修改命令面板核心呈现逻辑。

### 6. 首版预置命令清单（精简 8 项）

首版保持克制精简，**「操作」分类下仅保留核心高频动作「打开文件夹...」**，其余细粒度操作保留在具体功能页面内：

| 分类 | 显示名称 | 类型 | 英文别名 / 关键词 | 行为与联动说明 |
| :--- | :--- | :--- | :--- | :--- |
| **页面** | 打开文件夹内容复制 | 跳转 | `folder-copy`, `fc` | 导航至 `/folder-copy`，主窗口激活置前 |
| **页面** | 打开 Prompts 页面 | 跳转 | `prompts`, `prompt` | 导航至 `/prompts`，主窗口激活置前 |
| **操作** | 打开文件夹... | 动作 | `open`, `folder`, `dir` | **跨页联动**：主窗口激活置前并切换至 `/folder-copy`，立即弹出系统文件夹选择对话框，用户选择后自动加载该文件夹内容 |
| **外观** | 外观：跟随系统 | 动作 | `theme`, `system`, `auto` | 切换主题跟随系统；生效时右侧展示 `✓`，跨窗口广播同步 |
| **外观** | 外观：浅色模式 | 动作 | `theme`, `light` | 切换浅色主题；生效时右侧展示 `✓`，跨窗口广播同步 |
| **外观** | 外观：深色模式 | 动作 | `theme`, `dark` | 切换深色主题；生效时右侧展示 `✓`，跨窗口广播同步 |
| **设置** | 打开系统设置 | 动作 | `settings`, `system`, `preferences` | 打开全局系统设置弹窗 |
| **设置** | 打开当前功能设置 | 动作 | `rules`, `config` | 打开文件夹规则设置弹窗 |

*注：空输入时展示全量 8 条命令（按上述分类固定顺序排列）；首版不收录动态变化的「最近文件夹」，保持列表的静态确定性。*

### 7. 全局主题提升与跨窗口同步

- **提升作用域**：将 `ThemeProvider` 从 `FolderCopyApp` 提升至应用顶层（`main.tsx` 或根路由 `RootLayout`），确保全应用所有页面及弹窗安全调用 `useTheme()`；
- **跨 Webview 实时同步**：命令面板 Webview 同样挂载 `ThemeProvider`；当用户在面板或主窗口任一处切换外观时，通过 Tauri 原生事件 `app.emit('theme-changed', mode)` 与 Webview 共享的 `localStorage` 实现秒级实时双向同步，无需重启或重新打开。

### 8. 视觉设计细节与死类清理

- **外壳容器**：`bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden`；
- **搜索输入框**：无边框、无 focus ring、字号 `text-base`、背景透明，左侧带 `Search` 图标，占位符为 `输入命令或功能名称...`；
- **列表高亮行**：`bg-blue-50 dark:bg-blue-600/20 text-blue-900 dark:text-blue-100 border-l-2 border-blue-600 dark:border-blue-500`；
- **右侧标记**：跳转命令带 `ArrowRight`（`→`）图标；快捷键带 mono 字体 chip；主题当前项带 `Check`（`✓`）图标；
- **底部指引条**：底部常驻微字号提示条：`↑↓ 选择 · ↵ 执行 · esc 隐藏`；
- **清理死类**：彻底清理现有代码中未配置关键帧动画的 `animate-in fade-in zoom-in-95` 等死类，保持干脆轻量的秒开性能。

### 9. 顺带缺陷修复：现有搜索框输入法组字守卫

- 在实施命令面板的同时，修复 `src/components/folder-copy/SearchBar.tsx` 中的 `handleKeyDown`：
  ```tsx
  if (e.nativeEvent.isComposing || e.keyCode === 229) {
    return;
  }
  ```
- 彻底解决中文输入法打字确认候选词（Enter）时误触文件勾选、按上下键翻选候选词时列表高亮跳跃的缺陷；检查并覆盖其他同类输入点（`TopToolbar.tsx` 与 `SettingsModal.tsx`）。

## 测试与验收决定

1. **真实桌面环境验证**：
   - 全局热键必须在主窗口失焦、最小化、被遮挡、隐藏至托盘等所有真实桌面场景下，通过手动按下 `Ctrl+Shift+K` 进行唤出验证；
   - 多显示器场景下，将鼠标移至不同显示器，验证面板是否稳定在鼠标所在屏幕的水平居中偏上位置弹出。
2. **输入与交互回归**：
   - 验证中文输入法在命令面板与主窗口 `SearchBar` 中打字选词时，Enter 不触发执行，上下键不干扰高亮；
   - 验证输入名称片段（如 `fc`、`文件`、`dark`、`设置`）能准确过滤并显示琥珀色高亮；
   - 验证执行跳转命令后主窗口置前并切路由，执行动作命令后动作即时生效；
   - 验证在任意页面执行「打开文件夹...」后，主窗口激活置前并切换至 `/folder-copy`，同时自动弹出系统原生文件夹选择对话框。
3. **窗口生命周期与失焦回归**：
   - 验证点击面板外任意位置面板自动隐藏；
   - 验证面板呼出后再次按下热键 Toggle 隐藏；
   - 验证面板关闭后焦点顺利返回第三方前台应用；
   - 验证点击主窗口右上角 × 隐藏到托盘，托盘图标左键单击激活主窗口，托盘右键「退出」彻底终止进程。
4. **编译与质量门禁**：
   - 保证 `cargo check`、`cargo test --lib`、`bun run build`（`tsc && vite build`）全部零警告/错误通过。

## 范围外

1. 文件夹内文件正文、复制历史记录的跨功能异步内容检索；
2. 引入第三方拼音首字母库或全拼打分引擎；
3. 提示词（Prompts）等未来功能的内部业务逻辑实现；
4. 自定义 URI Scheme 与浏览器 Deep Link 唤起；
5. 打包签名与线上自动更新服务器配置。

## 实施任务与工单进度矩阵

本规格已按「示踪弹端到端垂直切片」原则拆解为 9 张实现工单（从 25 号顺接决策票据）。在后续开发实施过程中，本表格将实时维护每张工单的最新完成状态：

| 票号 | 标题 | 状态 | Blocked by | 交付要点 |
| :--- | :--- | :--- | :--- | :--- |
| [25](issues/25-tray-and-close-to-hide.md) | 系统托盘常驻与主窗口关闭拦截隐藏 | `resolved` | 无 | 托盘图标、左键显隐、右键退出菜单、拦截 × 隐藏到托盘 |
| [26](issues/26-fix-ime-composition-guard.md) | 现有搜索框输入法组字守卫修复 | `ready-for-agent` | 无 | SearchBar 及相关输入框补齐 `isComposing` 守卫，杜绝打字误选 |
| [27](issues/27-standalone-palette-window.md) | 独立面板 Webview 窗口与失焦隐藏生命周期 | `ready-for-agent` | 25 | 预创建透明 Webview、鼠标多屏居中偏上定位、失焦/Esc 自动隐藏 |
| [28](issues/28-global-shortcut-and-settings.md) | 系统级全局热键注册与系统设置呈现 | `ready-for-agent` | 27 | 官方插件注册 `Ctrl+Shift+K`、Toggle 机制、系统设置区分作用域与标红 |
| [29](issues/29-global-theme-elevation-and-sync.md) | 全局 ThemeProvider 提升与跨窗口实时双向主题同步 | `ready-for-agent` | 27 | Provider 提升至根布局、多 Webview 事件广播秒级主题同步 |
| [30](issues/30-extensible-command-registry.md) | 可扩展命令注册表与路由单一来源架构 | `ready-for-agent` | 29 | 路由单一元数据清单、`CommandItem` 契约抽象、预留用户自定义 Provider |
| [31](issues/31-palette-cmdk-ui.md) | 命令面板核心交互与 cmdk 界面呈现 | `ready-for-agent` | 30 | cmdk 引入、大小写不敏感包含检索、琥珀色高亮、四段固定分类、清理死类 |
| [32](issues/32-open-folder-cross-page-dispatch.md) | 「打开文件夹...」与跳转命令跨页面联动执行 | `ready-for-agent` | 31 | 跳转置前激活、打开文件夹跨页调度自动切至 `/folder-copy` 并弹选择框 |
| [33](issues/33-e2e-integration-and-verification.md) | 端到端集成与桌面多场景验证 | `ready-for-agent` | 26, 28, 32 | 12 条用户故事桌面真机回归、高 DPI 多屏验证、Rust/TS 全编译通过 |

## 关联文档与事实来源

- 需求地图：[`map.md`](map.md)
- 决策票据：`issues/01-terminology-and-v1-scope.md` 至 `issues/24-sync-system-settings-shortcut-list.md`
- 架构决策记录：[`docs/adr/0004-command-palette-standalone-window.md`](../../docs/adr/0004-command-palette-standalone-window.md)
- 领域词汇表：[`GLOSSARY.md`](../../GLOSSARY.md)
- 产品设计背景：[`PROJECT_REQUIREMENTS.md`](../../PROJECT_REQUIREMENTS.md)
