use glob::{MatchOptions, Pattern};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Component, Path, PathBuf};
use tauri::{Emitter, Manager, State};

const DEFAULT_ROUTE: &str = "/folder-copy";

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ActivationRequest {
    route: Option<String>,
    error: Option<String>,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TreeSettings {
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
struct SelectableFile {
    path: String,
    size: u64,
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
        }
    }

    fn invalid(message: impl Into<String>) -> Self {
        Self {
            route: None,
            error: Some(message.into()),
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

fn parse_activation_args(args: impl IntoIterator<Item = String>) -> ActivationRequest {
    let mut args = args.into_iter();
    let mut requested_route: Option<String> = None;

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
        }
    }

    let route = requested_route.as_deref().unwrap_or(DEFAULT_ROUTE);
    match validate_route(route) {
        Ok(route) => ActivationRequest::valid(route),
        Err(message) => {
            ActivationRequest::invalid(format!("{message} 默认功能页为 /folder-copy。"))
        }
    }
}

#[tauri::command]
fn initial_activation(request: State<'_, ActivationRequest>) -> ActivationRequest {
    request.inner().clone()
}

fn user_error(action: &str, path: &Path, error: impl std::fmt::Display) -> String {
    format!("{action}失败：{}（{error}）", path.display())
}

fn path_matches(pattern: &str, name: &str) -> bool {
    let pattern = pattern.trim_end_matches('/');
    Pattern::new(pattern)
        .map(|compiled| {
            compiled.matches_with(
                name,
                MatchOptions {
                    case_sensitive: false,
                    require_literal_separator: false,
                    require_literal_leading_dot: false,
                },
            )
        })
        .unwrap_or_else(|_| pattern.eq_ignore_ascii_case(name))
}

fn is_excluded_file(name: &str, settings: &TreeSettings) -> bool {
    settings
        .exclusions
        .iter()
        .filter(|rule| !rule.ends_with('/'))
        .any(|rule| path_matches(rule, name))
}

fn is_allowed_file(name: &str, settings: &TreeSettings) -> bool {
    if is_excluded_file(name, settings) {
        return false;
    }

    if settings
        .whitelist
        .iter()
        .any(|rule| rule.eq_ignore_ascii_case(name))
    {
        return true;
    }

    let Some((_, extension)) = name.rsplit_once('.') else {
        return false;
    };
    let extension = format!(".{extension}");
    settings
        .whitelist
        .iter()
        .any(|rule| rule.eq_ignore_ascii_case(&extension))
}

fn directory_block_reason(
    name: &str,
    settings: &TreeSettings,
) -> (bool, Option<String>, bool, Option<String>) {
    let ignored = settings
        .ignored_directories
        .iter()
        .find(|rule| rule.eq_ignore_ascii_case(name))
        .map(|rule| format!("规则忽略目录 ({rule})"));
    if ignored.is_some() {
        return (true, ignored, false, None);
    }

    let excluded = settings
        .exclusions
        .iter()
        .filter(|rule| rule.ends_with('/'))
        .find(|rule| path_matches(rule, name))
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
    let migrations = vec![tauri_plugin_sql::Migration {
        version: 1,
        description: "create_folder_copy_settings",
        sql: "CREATE TABLE IF NOT EXISTS folder_copy_settings (\
            id INTEGER PRIMARY KEY CHECK (id = 1),\
            settings_json TEXT NOT NULL\
        );",
        kind: tauri_plugin_sql::MigrationKind::Up,
    }];

    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(initial_request)
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:settings.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            let request = parse_activation_args(args.into_iter().skip(1));

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }

            let _ = app.emit("activation-request", request);
        }))
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            initial_activation,
            load_directory_tree,
            load_directory_page,
            list_selectable_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
