use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Component, Path, PathBuf};
use std::sync::Mutex;
use tauri::menu::{MenuBuilder, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager, State};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

mod context_package;
mod history_store;
mod search;
pub(crate) mod prompt_store;
pub(crate) mod memory_stats;
#[cfg(windows)]
pub(crate) mod windows_bridge;

const DEFAULT_ROUTE: &str = "/folder-copy";
/// 命令面板全局热键默认值（Ctrl+Shift+K）
const PALETTE_SHORTCUT_DEFAULT: &str = "Ctrl+Shift+K";

/// 全局热键注册状态，通过 Mutex 共享给 command 查询
struct ShortcutStatus {
    shortcut: String,
    registered: bool,
    error: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ActivationRequest {
    route: Option<String>,
    error: Option<String>,
    palette: Option<String>,
    #[serde(skip)]
    route_explicit: bool,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TreeSettings {
    whitelist: Vec<String>,
    exclusions: Vec<String>,
    ignored_directories: Vec<String>,
    large_dir_threshold: usize,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct FileNode {
    id: String,
    name: String,
    path: String,
    #[serde(rename = "type")]
    node_type: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    extension: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    size: Option<u64>,
    is_ignored: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    ignored_reason: Option<String>,
    is_excluded: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    excluded_reason: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    children: Option<Vec<FileNode>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    children_count: Option<usize>,
    has_more_children: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DirectoryPage {
    children: Vec<FileNode>,
    total_count: usize,
}

struct DirectoryEntry {
    name: String,
    relative_path: String,
    is_directory: bool,
    is_ignored: bool,
    ignored_reason: Option<String>,
    is_excluded: bool,
    excluded_reason: Option<String>,
    size: Option<u64>,
    extension: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SelectableFile {
    pub(crate) path: String,
    pub(crate) size: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DirectorySelectableCount {
    path: String,
    count: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SelectableFiles {
    files: Vec<SelectableFile>,
    directory_counts: Vec<DirectorySelectableCount>,
}

impl ActivationRequest {
    fn valid(route: &str) -> Self {
        Self {
            route: Some(route.to_string()),
            error: None,
            palette: None,
            route_explicit: false,
        }
    }

    fn invalid(message: impl Into<String>) -> Self {
        Self {
            route: None,
            error: Some(message.into()),
            palette: None,
            route_explicit: false,
        }
    }
}

fn validate_route(route: &str) -> Result<&'static str, &'static str> {
    match route {
        "/folder-copy" => Ok(DEFAULT_ROUTE),
        "/prompts" => Ok("/prompts"),
        _ => Err("无效的功能路径，已保留当前页面。"),
    }
}

fn parse_palette_mode(value: &str) -> Option<&'static str> {
    match value {
        "show" => Some("show"),
        "command" | "palette" => Some("command"),
        "prompts" | "prompt" | "snippets" => Some("prompts"),
        "blank" => Some("blank"),
        "hide" | "close" => Some("hide"),
        "toggle" => Some("toggle"),
        _ => None,
    }
}

fn parse_activation_args(args: impl IntoIterator<Item = String>) -> ActivationRequest {
    let mut args = args.into_iter().peekable();
    let mut requested_route: Option<String> = None;
    let mut requested_palette: Option<String> = None;

    while let Some(argument) = args.next() {
        if argument == "--route" {
            if requested_route.is_some() {
                return ActivationRequest::invalid(
                    "--route 参数只能指定一次。默认功能页为 /folder-copy。",
                );
            }
            let Some(route) = args.next() else {
                return ActivationRequest::invalid(
                    "--route 缺少功能路径。默认功能页为 /folder-copy。",
                );
            };
            requested_route = Some(route);
        } else if let Some(route) = argument.strip_prefix("--route=") {
            if requested_route.is_some() {
                return ActivationRequest::invalid(
                    "--route 参数只能指定一次。默认功能页为 /folder-copy。",
                );
            }
            requested_route = Some(route.to_string());
        } else if argument == "--palette" {
            if requested_palette.is_some() {
                return ActivationRequest::invalid("--palette 参数只能指定一次。");
            }
            // 可选模式参数：--palette show / hide / toggle，缺省 toggle
            let mode = match args.peek().map(|s| s.as_str()) {
                Some(next) => parse_palette_mode(next),
                None => None,
            };
            if mode.is_some() {
                args.next();
            }
            requested_palette = Some(mode.unwrap_or("toggle").to_string());
        } else if argument == "--prompts" || argument == "--picker" {
            if requested_palette.is_some() {
                return ActivationRequest::invalid("--palette 或 --prompts 参数只能指定一次。");
            }
            requested_palette = Some("prompts".to_string());
        } else if argument == "--blank" {
            if requested_palette.is_some() {
                return ActivationRequest::invalid("浮窗模式参数只能指定一次。");
            }
            requested_palette = Some("blank".to_string());
        } else if argument == "--mode" || argument == "--overlay" {
            if requested_palette.is_some() {
                return ActivationRequest::invalid("浮窗模式参数只能指定一次。");
            }
            let Some(mode) = args.next() else {
                return ActivationRequest::invalid("--mode 缺少模式参数（如 command / prompts / blank / hide）。");
            };
            let parsed = parse_palette_mode(&mode).unwrap_or("command");
            requested_palette = Some(parsed.to_string());
        } else if let Some(mode) = argument.strip_prefix("--mode=") {
            if requested_palette.is_some() {
                return ActivationRequest::invalid("浮窗模式参数只能指定一次。");
            }
            let parsed = parse_palette_mode(mode).unwrap_or("command");
            requested_palette = Some(parsed.to_string());
        } else if let Some(mode) = argument.strip_prefix("--palette=") {
            if requested_palette.is_some() {
                return ActivationRequest::invalid("--palette 参数只能指定一次。");
            }
            let Some(mode) = parse_palette_mode(mode) else {
                return ActivationRequest::invalid(
                    "--palette 仅支持 show / hide / toggle，缺省为 toggle。",
                );
            };
            requested_palette = Some(mode.to_string());
        }
    }

    let route_explicit = requested_route.is_some();
    let route = requested_route.as_deref().unwrap_or(DEFAULT_ROUTE);
    match validate_route(route) {
        Ok(route) => ActivationRequest {
            palette: requested_palette,
            route_explicit,
            ..ActivationRequest::valid(route)
        },
        Err(message) => {
            ActivationRequest::invalid(format!("{message} 默认功能页为 /folder-copy。"))
        }
    }
}

#[tauri::command]
fn initial_activation(request: State<'_, ActivationRequest>) -> ActivationRequest {
    request.inner().clone()
}

/// 计算命令面板在目标显示器上的居中偏上位置，然后显示并聚焦。
/// 策略：获取当前光标坐标 → 找包含该坐标的显示器 → 居中 X，Y 位于工作区顶部 20%。
pub(crate) fn show_palette_window_with_mode(app: &tauri::AppHandle, mode: &str) -> Result<(), String> {
    #[cfg(windows)]
    windows_bridge::capture_current_foreground_window();

    let _ = app.emit("picker-mode-switch", mode);
    show_palette_window(app)
}

pub(crate) fn show_palette_window(app: &tauri::AppHandle) -> Result<(), String> {
    let palette = app
        .get_webview_window("command-palette")
        .ok_or("找不到命令面板窗口")?;

    // 窗口尺寸（固定 640px 宽；高度由前端内容决定，这里用当前值）
    let win_size = palette.outer_size().map_err(|e| e.to_string())?;
    let win_w = win_size.width;
    let _win_h = win_size.height;

    // 获取所有显示器
    let monitors = app.available_monitors().map_err(|e| e.to_string())?;

    // 获取鼠标当前位置
    let cursor = app.cursor_position().ok();

    // 找到鼠标所在显示器，回退到主显示器
    let target_monitor = cursor
        .as_ref()
        .and_then(|pos| {
            monitors.iter().find(|m| {
                let mp = m.position();
                let ms = m.size();
                pos.x >= mp.x as f64
                    && pos.x < (mp.x + ms.width as i32) as f64
                    && pos.y >= mp.y as f64
                    && pos.y < (mp.y + ms.height as i32) as f64
            })
        })
        .or_else(|| monitors.first());

    let (x, y) = if let Some(monitor) = target_monitor {
        let mp = monitor.position();
        let ms = monitor.size();
        let center_x = mp.x + (ms.width as i32 - win_w as i32) / 2;
        let top_y = mp.y + (ms.height as i32) / 5; // 约 20% 处
        (center_x, top_y)
    } else {
        (100, 100)
    };

    palette
        .set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y }))
        .map_err(|e| e.to_string())?;
    palette.show().map_err(|e| e.to_string())?;
    palette.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn show_palette(app: tauri::AppHandle) -> Result<(), String> {
    show_palette_window_with_mode(&app, "palette")
}

#[tauri::command]
fn show_prompt_picker(app: tauri::AppHandle) -> Result<(), String> {
    show_palette_window_with_mode(&app, "prompts")
}

#[tauri::command]
fn list_prompts(app: tauri::AppHandle) -> Vec<prompt_store::PromptItem> {
    let dir = prompt_store::get_prompts_directory(&app);
    prompt_store::list_all_prompts(&dir)
}

#[tauri::command]
fn save_prompt(
    app: tauri::AppHandle,
    payload: prompt_store::SavePromptPayload,
) -> Result<prompt_store::PromptItem, String> {
    let dir = prompt_store::get_prompts_directory(&app);
    prompt_store::save_prompt_file(&dir, payload)
}

#[tauri::command]
fn delete_prompt(file_path: String) -> Result<(), String> {
    prompt_store::delete_prompt_file(&file_path)
}

#[tauri::command]
fn get_prompts_dir(app: tauri::AppHandle) -> String {
    prompt_store::get_prompts_directory(&app).to_string_lossy().to_string()
}

#[tauri::command]
fn set_prompts_dir(app: tauri::AppHandle, new_dir: String) -> Result<String, String> {
    prompt_store::set_prompts_directory(&app, &new_dir)
}

#[tauri::command]
fn paste_prompt(
    app: tauri::AppHandle,
    content: String,
    restore_clipboard: Option<bool>,
) -> Result<(), String> {
    #[cfg(windows)]
    {
        windows_bridge::paste_snippet_to_active_window(
            &app,
            &content,
            restore_clipboard.unwrap_or(true),
        )
    }
    #[cfg(not(windows))]
    {
        let _ = (app, content, restore_clipboard);
        Ok(())
    }
}

#[tauri::command]
fn reveal_prompt_file(file_path: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        use std::process::Command;
        let path = std::path::Path::new(&file_path);
        if path.exists() {
            let _ = Command::new("explorer")
                .arg(format!("/select,{}", path.display()))
                .spawn();
            return Ok(());
        }
    }
    #[cfg(not(windows))]
    let _ = file_path;
    Ok(())
}

#[tauri::command]
fn open_prompt_file(file_path: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        use std::process::Command;
        let path = std::path::Path::new(&file_path);
        if path.exists() {
            let _ = Command::new("cmd")
                .args(["/C", "start", "", &file_path])
                .spawn();
            return Ok(());
        }
    }
    #[cfg(not(windows))]
    let _ = file_path;
    Ok(())
}

#[tauri::command]
fn get_memory_stats() -> memory_stats::MemoryStats {
    memory_stats::get_application_memory_stats()
}

/// 激活主窗口到前台（show + unminimize + set_focus）。
/// 由命令面板的 activateMainWindow / navigate 执行上下文调用。
#[tauri::command]
fn show_main_window(app: tauri::AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("找不到主窗口")?;
    window.show().map_err(|e| e.to_string())?;
    window.unminimize().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ShortcutStatusInfo {
    shortcut: String,
    registered: bool,
    error: Option<String>,
}

fn get_shortcut_file_path(app: &tauri::AppHandle) -> Option<PathBuf> {
    app.path().app_data_dir().ok().map(|d| d.join("palette_shortcut.txt"))
}

fn load_shortcut_from_disk(app: &tauri::AppHandle) -> String {
    if let Some(path) = get_shortcut_file_path(app) {
        if let Ok(content) = fs::read_to_string(path) {
            let trimmed = content.trim();
            if !trimmed.is_empty() && trimmed.parse::<Shortcut>().is_ok() {
                return trimmed.to_string();
            }
        }
    }
    PALETTE_SHORTCUT_DEFAULT.to_string()
}

fn save_shortcut_to_disk(app: &tauri::AppHandle, shortcut: &str) {
    if let Some(path) = get_shortcut_file_path(app) {
        if let Some(parent) = path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        let _ = fs::write(path, shortcut.trim());
    }
}

fn handle_palette_toggle(app_handle: &tauri::AppHandle) {
    if let Some(palette) = app_handle.get_webview_window("command-palette") {
        if palette.is_visible().unwrap_or(false) {
            let _ = palette.hide();
        } else {
            let _ = show_palette_window(app_handle);
        }
    }
}

fn apply_palette_action(app: &tauri::AppHandle, action: &str) {
    match action {
        "command" | "show" | "palette" => {
            let _ = show_palette_window_with_mode(app, "command");
        }
        "prompts" => {
            let _ = show_palette_window_with_mode(app, "prompts");
        }
        "blank" => {
            let _ = show_palette_window_with_mode(app, "blank");
        }
        "hide" | "close" => {
            if let Some(palette) = app.get_webview_window("command-palette") {
                let _ = palette.hide();
            }
        }
        _ => handle_palette_toggle(app),
    }
}

fn apply_palette_shortcut(
    app: &tauri::AppHandle,
    status_state: &Mutex<ShortcutStatus>,
    new_shortcut_str: &str,
) -> Result<ShortcutStatusInfo, String> {
    let parsed: Shortcut = new_shortcut_str
        .parse()
        .map_err(|e| format!("快捷键格式无效：{e}"))?;

    let mut status = status_state.lock().unwrap();
    let old_shortcut_str = status.shortcut.clone();

    // 如果之前已注册，注销旧快捷键
    if status.registered {
        if let Ok(old_shortcut) = old_shortcut_str.parse::<Shortcut>() {
            let _ = app.global_shortcut().unregister(old_shortcut);
        }
    }

    let app_handle = app.clone();
    let reg_result = app.global_shortcut().on_shortcut(parsed, move |_app, _shortcut, event| {
        if event.state == ShortcutState::Pressed {
            handle_palette_toggle(&app_handle);
        }
    });

    let (registered, error) = match reg_result {
        Ok(_) => {
            save_shortcut_to_disk(app, new_shortcut_str);
            (true, None)
        }
        Err(e) => {
            let err_msg = format!("该快捷键已被系统或其他应用占用（{e}）");
            (false, Some(err_msg))
        }
    };

    status.shortcut = new_shortcut_str.to_string();
    status.registered = registered;
    status.error = error.clone();

    let info = ShortcutStatusInfo {
        shortcut: new_shortcut_str.to_string(),
        registered,
        error,
    };

    let _ = app.emit("palette-shortcut-changed", &info);
    Ok(info)
}

#[tauri::command]
fn get_shortcut_status(state: State<'_, Mutex<ShortcutStatus>>) -> ShortcutStatusInfo {
    let s = state.lock().unwrap();
    ShortcutStatusInfo {
        shortcut: s.shortcut.clone(),
        registered: s.registered,
        error: s.error.clone(),
    }
}

#[tauri::command]
fn update_palette_shortcut(
    app: tauri::AppHandle,
    state: State<'_, Mutex<ShortcutStatus>>,
    shortcut: String,
) -> Result<ShortcutStatusInfo, String> {
    apply_palette_shortcut(&app, &state, &shortcut)
}

#[tauri::command]
fn reset_palette_shortcut(
    app: tauri::AppHandle,
    state: State<'_, Mutex<ShortcutStatus>>,
) -> Result<ShortcutStatusInfo, String> {
    apply_palette_shortcut(&app, &state, PALETTE_SHORTCUT_DEFAULT)
}

pub(crate) fn user_error(action: &str, path: &Path, error: impl std::fmt::Display) -> String {
    format!("{action}失败：{}（{error}）", path.display())
}

// 规则按「名称包含该文本」判定，大小写不敏感。`*` 没有特殊含义，直接丢弃，
// 这样早期以 `*.lock` 形式保存的规则仍然等价于 `.lock`。
pub(crate) fn rule_text(rule: &str) -> String {
    rule.trim()
        .trim_end_matches('/')
        .replace('*', "")
        .trim()
        .to_lowercase()
}

pub(crate) fn is_directory_rule(rule: &str) -> bool {
    rule.trim().ends_with('/')
}

fn name_matches_rule(lowered_name: &str, rule: &str) -> bool {
    let text = rule_text(rule);
    !text.is_empty() && lowered_name.contains(&text)
}

pub(crate) fn is_allowed_file(name: &str, settings: &TreeSettings) -> bool {
    let lowered = name.to_lowercase();
    let excluded = settings
        .exclusions
        .iter()
        .filter(|rule| !is_directory_rule(rule))
        .any(|rule| name_matches_rule(&lowered, rule));
    if excluded {
        return false;
    }

    settings
        .whitelist
        .iter()
        .any(|rule| name_matches_rule(&lowered, rule))
}

pub(crate) fn directory_block_reason(
    name: &str,
    settings: &TreeSettings,
) -> (bool, Option<String>, bool, Option<String>) {
    let ignored = settings
        .ignored_directories
        .iter()
        .find(|rule| rule.trim().eq_ignore_ascii_case(name))
        .map(|rule| format!("规则忽略目录 ({rule})"));
    if ignored.is_some() {
        return (true, ignored, false, None);
    }

    let lowered = name.to_lowercase();
    let excluded = settings
        .exclusions
        .iter()
        .filter(|rule| is_directory_rule(rule))
        .find(|rule| name_matches_rule(&lowered, rule))
        .map(|rule| format!("命中目录排除规则 ({rule})"));
    (false, None, excluded.is_some(), excluded)
}

fn validated_directory(
    root_path: &str,
    relative_path: &str,
    settings: &TreeSettings,
) -> Result<(PathBuf, PathBuf), String> {
    let supplied_root = Path::new(root_path);
    let root = fs::canonicalize(supplied_root)
        .map_err(|error| user_error("访问文件夹", supplied_root, error))?;
    if !root.is_dir() {
        return Err(format!("路径不是文件夹：{}", root.display()));
    }

    let relative = Path::new(relative_path);
    if relative
        .components()
        .any(|component| !matches!(component, Component::Normal(_)))
    {
        return Err("目录相对路径无效。".to_string());
    }

    let mut current = root.clone();
    for component in relative.components() {
        let Component::Normal(segment) = component else {
            continue;
        };
        let name = segment.to_string_lossy();
        let (ignored, _, excluded, _) = directory_block_reason(&name, settings);
        if ignored || excluded {
            return Err(format!("该目录已被规则屏蔽，无法展开：{name}"));
        }
        current.push(segment);
    }

    let canonical_target =
        fs::canonicalize(&current).map_err(|error| user_error("读取目录", &current, error))?;
    if !canonical_target.starts_with(&root) || !canonical_target.is_dir() {
        return Err(format!("无法访问目录：{}", current.display()));
    }
    Ok((root, canonical_target))
}

fn read_directory_page(
    target: &Path,
    relative_parent: &str,
    offset: usize,
    settings: &TreeSettings,
) -> Result<DirectoryPage, String> {
    let mut entries = Vec::new();
    let iterator = fs::read_dir(target).map_err(|error| user_error("读取目录", target, error))?;

    for item in iterator {
        let item = item.map_err(|error| user_error("读取目录项", target, error))?;
        let file_type = item
            .file_type()
            .map_err(|error| user_error("读取目录项属性", &item.path(), error))?;
        if file_type.is_symlink() || (!file_type.is_file() && !file_type.is_dir()) {
            continue;
        }

        let name = item.file_name().to_string_lossy().into_owned();
        let is_directory = file_type.is_dir();
        let (is_ignored, ignored_reason, is_excluded, excluded_reason) = if is_directory {
            directory_block_reason(&name, settings)
        } else {
            if !is_allowed_file(&name, settings) {
                continue;
            }
            (false, None, false, None)
        };

        let relative_path = if relative_parent.is_empty() {
            name.clone()
        } else {
            format!("{relative_parent}/{name}")
        };
        let size = if is_directory {
            None
        } else {
            Some(
                item.metadata()
                    .map_err(|error| user_error("读取文件信息", &item.path(), error))?
                    .len(),
            )
        };
        let extension = Path::new(&name)
            .extension()
            .map(|value| format!(".{}", value.to_string_lossy().to_lowercase()));

        entries.push(DirectoryEntry {
            name,
            relative_path,
            is_directory,
            is_ignored,
            ignored_reason,
            is_excluded,
            excluded_reason,
            size,
            extension,
        });
    }

    entries.sort_by(|left, right| {
        right
            .is_directory
            .cmp(&left.is_directory)
            .then_with(|| left.name.to_lowercase().cmp(&right.name.to_lowercase()))
            .then_with(|| left.name.cmp(&right.name))
    });

    let total_count = entries.len();
    let page_size = if total_count > settings.large_dir_threshold.max(1) {
        30
    } else {
        total_count
    };
    let children = entries
        .into_iter()
        .skip(offset)
        .take(page_size)
        .map(|entry| FileNode {
            id: entry.relative_path.clone(),
            name: entry.name,
            path: entry.relative_path,
            node_type: if entry.is_directory {
                "directory"
            } else {
                "file"
            },
            extension: entry.extension,
            size: entry.size,
            is_ignored: entry.is_ignored,
            ignored_reason: entry.ignored_reason,
            is_excluded: entry.is_excluded,
            excluded_reason: entry.excluded_reason,
            children: None,
            children_count: None,
            has_more_children: false,
        })
        .collect();

    Ok(DirectoryPage {
        children,
        total_count,
    })
}

#[tauri::command]
async fn load_directory_tree(
    root_path: String,
    settings: TreeSettings,
) -> Result<FileNode, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let (_, target) = validated_directory(&root_path, "", &settings)?;
        let listing = read_directory_page(&target, "", 0, &settings)?;
        let root_name = target
            .file_name()
            .map(|name| name.to_string_lossy().into_owned())
            .unwrap_or_else(|| target.display().to_string());
        let has_more_children = listing.total_count > listing.children.len();
        Ok(FileNode {
            id: "root".to_string(),
            name: root_name,
            path: "".to_string(),
            node_type: "directory",
            extension: None,
            size: None,
            is_ignored: false,
            ignored_reason: None,
            is_excluded: false,
            excluded_reason: None,
            children: Some(listing.children),
            children_count: Some(listing.total_count),
            has_more_children,
        })
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn load_directory_page(
    root_path: String,
    relative_path: String,
    offset: usize,
    settings: TreeSettings,
) -> Result<DirectoryPage, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let (_, target) = validated_directory(&root_path, &relative_path, &settings)?;
        read_directory_page(&target, &relative_path, offset, &settings)
    })
    .await
    .map_err(|error| error.to_string())?
}

fn collect_selectable_files(
    directory: &Path,
    relative_directory: &str,
    settings: &TreeSettings,
    files: &mut Vec<SelectableFile>,
    directory_counts: &mut Vec<DirectorySelectableCount>,
) -> Result<(), String> {
    let initial_count = files.len();
    let entries =
        fs::read_dir(directory).map_err(|error| user_error("读取目录", directory, error))?;
    for entry in entries {
        let entry = entry.map_err(|error| user_error("读取目录项", directory, error))?;
        let file_type = entry
            .file_type()
            .map_err(|error| user_error("读取目录项属性", &entry.path(), error))?;
        if file_type.is_symlink() || (!file_type.is_file() && !file_type.is_dir()) {
            continue;
        }

        let name = entry.file_name().to_string_lossy().into_owned();
        let relative_path = if relative_directory.is_empty() {
            name.clone()
        } else {
            format!("{relative_directory}/{name}")
        };

        if file_type.is_dir() {
            let (is_ignored, _, is_excluded, _) = directory_block_reason(&name, settings);
            if !is_ignored && !is_excluded {
                collect_selectable_files(
                    &entry.path(),
                    &relative_path,
                    settings,
                    files,
                    directory_counts,
                )?;
            }
        } else if is_allowed_file(&name, settings) {
            let size = entry
                .metadata()
                .map_err(|error| user_error("读取文件信息", &entry.path(), error))?
                .len();
            files.push(SelectableFile {
                path: relative_path,
                size,
            });
        }
    }
    directory_counts.push(DirectorySelectableCount {
        path: relative_directory.to_string(),
        count: files.len() - initial_count,
    });
    Ok(())
}

#[tauri::command]
async fn list_selectable_files(
    root_path: String,
    relative_path: String,
    settings: TreeSettings,
) -> Result<SelectableFiles, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let (_, target) = validated_directory(&root_path, &relative_path, &settings)?;
        let mut files = Vec::new();
        let mut directory_counts = Vec::new();
        collect_selectable_files(
            &target,
            &relative_path,
            &settings,
            &mut files,
            &mut directory_counts,
        )?;
        files.sort_by(|left, right| left.path.cmp(&right.path));
        directory_counts.sort_by(|left, right| left.path.cmp(&right.path));
        Ok(SelectableFiles {
            files,
            directory_counts,
        })
    })
    .await
    .map_err(|error| error.to_string())?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let initial_request = parse_activation_args(std::env::args().skip(1));
    let shortcut_status = Mutex::new(ShortcutStatus {
        shortcut: PALETTE_SHORTCUT_DEFAULT.to_string(),
        registered: false,
        error: None,
    });
    let migrations = vec![
        tauri_plugin_sql::Migration {
            version: 1,
            description: "create_folder_copy_settings",
            sql: "CREATE TABLE IF NOT EXISTS folder_copy_settings (\
                id INTEGER PRIMARY KEY CHECK (id = 1),\
                settings_json TEXT NOT NULL\
            );",
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 2,
            description: "create_recent_folder",
            sql: "CREATE TABLE IF NOT EXISTS recent_folder (\
                path_key TEXT PRIMARY KEY,\
                path TEXT NOT NULL,\
                last_used_at INTEGER NOT NULL\
            );",
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 3,
            description: "create_app_settings",
            sql: "CREATE TABLE IF NOT EXISTS app_settings (\
                key TEXT PRIMARY KEY,\
                value TEXT NOT NULL\
            );",
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(initial_request)
        .manage(shortcut_status)
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:settings.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            let request = parse_activation_args(args.into_iter().skip(1));

            if let Some(action) = request.palette.clone() {
                // 仅操作面板时不置前主窗口：主窗口抢焦点会触发面板失焦隐藏
                if request.route_explicit {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.unminimize();
                        let _ = window.set_focus();
                    }
                    let _ = app.emit("activation-request", request.clone());
                }
                apply_palette_action(app, &action);
                return;
            }

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }

            let _ = app.emit("activation-request", request);
        }))
        .plugin(tauri_plugin_opener::init())
        .on_window_event(|window, event| {
            match event {
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    if window.label() == "main" {
                        api.prevent_close();
                        let _ = window.hide();
                    }
                }
                tauri::WindowEvent::Focused(false) => {
                    if window.label() == "command-palette" {
                        let _ = window.hide();
                    }
                }
                _ => {}
            }
        })
        .setup(|app| {
            let show_main = MenuItem::with_id(app, "show_main", "显示主窗口", true, None::<&str>)?;
            let show_prompts = MenuItem::with_id(app, "show_prompts", "提示词片段", true, None::<&str>)?;
            let command_palette = MenuItem::with_id(app, "command_palette", "命令面板", true, None::<&str>)?;
            let separator = PredefinedMenuItem::separator(app)?;
            let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;

            let tray_menu = MenuBuilder::new(app)
                .items(&[&show_main, &show_prompts, &command_palette, &separator, &quit])
                .build()?;

            let mut tray_builder = TrayIconBuilder::with_id("main-tray")
                .tooltip("KeyboardCommand")
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) && window.is_focused().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "show_main" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                        "show_prompts" => {
                            let _ = show_palette_window_with_mode(app, "prompts");
                        }
                        "command_palette" => {
                            let _ = show_palette_window_with_mode(app, "palette");
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                });

            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }

            tray_builder.build(app)?;

            // 挂载 Windows 原生 WM_COPYDATA 消息监听通道
            #[cfg(windows)]
            {
                if let Some(main_win) = app.get_webview_window("main") {
                    windows_bridge::setup_wm_copydata_listener(&main_win);
                }
                if let Some(palette_win) = app.get_webview_window("command-palette") {
                    windows_bridge::setup_wm_copydata_listener(&palette_win);
                }
            }

            // 读取已保存或默认的全局热键并注册（默认 Ctrl+Shift+K）
            let initial_shortcut = load_shortcut_from_disk(app.handle());
            if let Some(status) = app.try_state::<Mutex<ShortcutStatus>>() {
                let _ = apply_palette_shortcut(app.handle(), &status, &initial_shortcut);
            }

            // 首启动携带 --palette：按 launcher 语义只呈现面板，不展示主窗口
            let initial_request = app.state::<ActivationRequest>().inner().clone();
            if let Some(action) = initial_request.palette {
                if !initial_request.route_explicit {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.hide();
                    }
                }
                apply_palette_action(app.handle(), &action);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            initial_activation,
            show_palette,
            show_prompt_picker,
            show_main_window,
            get_shortcut_status,
            update_palette_shortcut,
            reset_palette_shortcut,
            load_directory_tree,
            load_directory_page,
            list_selectable_files,
            search::fd_available,
            search::search_paths,
            context_package::generate_context_package,
            context_package::refresh_context_package,
            context_package::filter_selectable_paths,
            history_store::list_history,
            history_store::save_history,
            history_store::replace_history,
            history_store::delete_history,
            history_store::read_history_body,
            history_store::storage_stats,
            list_prompts,
            save_prompt,
            delete_prompt,
            get_prompts_dir,
            set_prompts_dir,
            paste_prompt,
            reveal_prompt_file,
            open_prompt_file,
            get_memory_stats
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn settings() -> TreeSettings {
        TreeSettings {
            whitelist: vec![".ts".to_string(), ".js".to_string(), "Dockerfile".to_string()],
            exclusions: vec![
                ".lock".to_string(),
                ".min.js".to_string(),
                "node_modules/".to_string(),
            ],
            ignored_directories: vec![".git".to_string(), "target".to_string()],
            large_dir_threshold: 50,
        }
    }

    #[test]
    fn palette_cli_bare_defaults_to_toggle() {
        let request = parse_activation_args(["--palette".to_string()]);
        assert_eq!(request.palette.as_deref(), Some("toggle"));
        assert!(request.error.is_none());
        assert!(!request.route_explicit);
    }

    #[test]
    fn palette_cli_accepts_equals_and_space_modes() {
        for (args, expected) in [
            (vec!["--palette=show"], "show"),
            (vec!["--palette=hide"], "hide"),
            (vec!["--palette=toggle"], "toggle"),
            (vec!["--palette", "show"], "show"),
            (vec!["--palette", "hide"], "hide"),
        ] {
            let request = parse_activation_args(args.into_iter().map(String::from));
            assert_eq!(request.palette.as_deref(), Some(expected));
            assert!(request.error.is_none());
        }
    }

    #[test]
    fn palette_cli_bare_does_not_swallow_following_flag() {
        let request = parse_activation_args(
            ["--palette", "--route", "/prompts"]
                .into_iter()
                .map(String::from),
        );
        assert_eq!(request.palette.as_deref(), Some("toggle"));
        assert_eq!(request.route.as_deref(), Some("/prompts"));
        assert!(request.route_explicit);
    }

    #[test]
    fn palette_cli_invalid_mode_reports_error() {
        let request = parse_activation_args(["--palette=spin".to_string()]);
        assert!(request.palette.is_none());
        assert!(request.error.is_some());
    }

    #[test]
    fn palette_cli_duplicate_reports_error() {
        let request = parse_activation_args(
            ["--palette", "--palette=hide"]
                .into_iter()
                .map(String::from),
        );
        assert!(request.palette.is_none());
        assert!(request.error.is_some());
    }

    #[test]
    fn whitelist_matches_any_substring_of_the_name() {
        let settings = settings();
        assert!(is_allowed_file("main.ts", &settings));
        assert!(is_allowed_file("treeUtils.tsx", &settings));
        assert!(is_allowed_file("package.json", &settings));
        assert!(is_allowed_file("Dockerfile.dev", &settings));
        assert!(!is_allowed_file("photo.png", &settings));
    }

    #[test]
    fn matching_ignores_case_on_both_sides() {
        let mut settings = settings();
        settings.whitelist = vec![".TS".to_string()];
        assert!(is_allowed_file("MAIN.ts", &settings));

        settings.whitelist = vec![".ts".to_string()];
        settings.exclusions = vec![".LOCK".to_string()];
        assert!(!is_allowed_file("Cargo.Lock", &settings));
    }

    #[test]
    fn exclusions_veto_a_whitelisted_name() {
        let mut settings = settings();
        assert!(!is_allowed_file("Cargo.lock", &settings));
        assert!(!is_allowed_file("bundle.min.js", &settings));

        settings.exclusions.push(".map".to_string());
        assert!(is_allowed_file("app.js", &settings));
        assert!(!is_allowed_file("app.js.map", &settings));
    }

    #[test]
    fn star_is_dropped_so_legacy_rules_still_work() {
        let mut settings = settings();
        settings.exclusions = vec!["*.lock".to_string()];
        assert!(!is_allowed_file("Cargo.lock", &settings));

        settings.exclusions = Vec::new();
        settings.whitelist = vec!["*.ts".to_string()];
        assert!(is_allowed_file("main.ts", &settings));
    }

    #[test]
    fn blank_rules_never_match() {
        let mut settings = settings();
        settings.whitelist = vec![String::new(), "   ".to_string(), "*".to_string()];
        assert!(!is_allowed_file("main.ts", &settings));

        settings.whitelist = vec![".ts".to_string()];
        settings.exclusions = vec![String::new(), "  ".to_string(), "*".to_string()];
        assert!(is_allowed_file("main.ts", &settings));
    }

    #[test]
    fn trailing_slash_scopes_an_exclusion_to_directories() {
        let settings = settings();
        let (ignored, _, excluded, _) = directory_block_reason("node_modules", &settings);
        assert!(!ignored);
        assert!(excluded);

        assert!(is_allowed_file("node_modules.ts", &settings));

        let (ignored, _, excluded, _) = directory_block_reason("node_modules_extra", &settings);
        assert!(!ignored);
        assert!(excluded);
    }

    #[test]
    fn ignored_directories_match_the_whole_name_only() {
        let settings = settings();
        let (ignored, reason, excluded, _) = directory_block_reason("target", &settings);
        assert!(ignored);
        assert!(!excluded);
        assert_eq!(reason.as_deref(), Some("规则忽略目录 (target)"));

        let (ignored, _, _, _) = directory_block_reason("target_debug", &settings);
        assert!(!ignored);

        let (ignored, _, _, _) = directory_block_reason("TARGET", &settings);
        assert!(ignored);
    }

    #[test]
    fn ignored_directory_wins_over_directory_exclusion() {
        let mut settings = settings();
        settings.ignored_directories = vec!["build".to_string()];
        settings.exclusions = vec!["build/".to_string()];
        let (ignored, _, excluded, excluded_reason) = directory_block_reason("build", &settings);
        assert!(ignored);
        assert!(!excluded);
        assert!(excluded_reason.is_none());
    }

    #[test]
    fn default_and_custom_shortcut_parsing() {
        assert!(PALETTE_SHORTCUT_DEFAULT.parse::<Shortcut>().is_ok());
        assert!("Ctrl+Shift+P".parse::<Shortcut>().is_ok());
        assert!("Alt+Space".parse::<Shortcut>().is_ok());
        assert!("invalid-shortcut-string".parse::<Shortcut>().is_err());
    }
}
