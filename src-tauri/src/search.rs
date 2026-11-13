use crate::{directory_block_reason, is_allowed_file, TreeSettings};
use serde::Serialize;
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::Path;
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};

pub(crate) const DISPLAY_LIMIT: usize = 10;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SearchMatch {
    pub(crate) name: String,
    pub(crate) relative_path: String,
    #[serde(rename = "type")]
    pub(crate) node_type: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) size: Option<u64>,
}

// 查询统一按 `/` 比较；用户可能输入 Windows 反斜杠
fn normalize_query(query: &str) -> String {
    query.trim().to_lowercase().replace('\\', "/")
}

// fd --full-path 按平台原生分隔符匹配，--path-separator 只改输出不改匹配，
// 所以预筛参数必须把 `/` 转成原生分隔符，否则跨目录查询恒为空
fn fd_query_arg(query: &str) -> String {
    normalize_query(query).replace('/', std::path::MAIN_SEPARATOR_STR)
}

fn accept_match(
    relative_path: &str,
    is_directory: bool,
    query: &str,
    settings: &TreeSettings,
) -> bool {
    let query = normalize_query(query);
    if query.is_empty() {
        return false;
    }
    if !relative_path.to_lowercase().contains(&query) {
        return false;
    }

    let mut segments = relative_path.split('/');
    let name = segments.next_back().unwrap_or("");
    for ancestor in segments {
        let (ignored, _, excluded, _) = directory_block_reason(ancestor, settings);
        if ignored || excluded {
            return false;
        }
    }

    if is_directory {
        let (ignored, _, excluded, _) = directory_block_reason(name, settings);
        return !ignored && !excluded;
    }
    is_allowed_file(name, settings)
}

pub(crate) struct CollectedMatches {
    pub(crate) matches: Vec<SearchMatch>,
    pub(crate) has_more: bool,
}

// fd 以 `./相对路径` 输出，目录带尾随 `/`
fn parse_fd_entry(line: &str) -> Option<(String, bool)> {
    let trimmed = line.trim_end_matches(['\r', '\n']);
    let is_directory = trimmed.ends_with('/');
    let without_slash = trimmed.trim_end_matches('/');
    let relative = without_slash.strip_prefix("./").unwrap_or(without_slash);
    if relative.is_empty() {
        return None;
    }
    Some((relative.to_string(), is_directory))
}

fn collect_matches<I>(lines: I, query: &str, settings: &TreeSettings) -> CollectedMatches
where
    I: IntoIterator<Item = String>,
{
    let target = DISPLAY_LIMIT + 1;
    let mut valid: Vec<SearchMatch> = Vec::new();

    for line in lines {
        let Some((relative_path, is_directory)) = parse_fd_entry(&line) else {
            continue;
        };
        if !accept_match(&relative_path, is_directory, query, settings) {
            continue;
        }
        valid.push(SearchMatch {
            name: relative_path.rsplit('/').next().unwrap_or("").to_string(),
            relative_path,
            node_type: if is_directory { "directory" } else { "file" },
            size: None,
        });
        if valid.len() >= target {
            break;
        }
    }

    valid.sort_by(|left, right| left.relative_path.cmp(&right.relative_path));
    let has_more = valid.len() > DISPLAY_LIMIT;
    valid.truncate(DISPLAY_LIMIT);
    CollectedMatches {
        matches: valid,
        has_more,
    }
}

const FD_INSTALL_HINT: &str = "未找到 fd，搜索已停用。请安装后重试：winget install sharkdp.fd";
const STDERR_SAMPLE_LIMIT: usize = 20;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SearchOutcome {
    results: Vec<SearchMatch>,
    has_more: bool,
    incomplete: bool,
    warning: Option<String>,
}

// GUI 进程拉起控制台程序时不要闪出黑窗
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[cfg(windows)]
fn hide_console_window(command: &mut Command) {
    use std::os::windows::process::CommandExt;
    command.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(windows))]
fn hide_console_window(_command: &mut Command) {}

#[tauri::command]
pub(crate) async fn fd_available() -> bool {
    tauri::async_runtime::spawn_blocking(|| {
        let mut command = Command::new("fd");
        hide_console_window(&mut command);
        command
            .arg("--version")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map(|status| status.success())
            .unwrap_or(false)
    })
    .await
    .unwrap_or(false)
}

fn fd_search_command(root: &Path, query: &str, settings: &TreeSettings) -> Command {
    let mut command = Command::new("fd");
    hide_console_window(&mut command);
    command.current_dir(root).args([
        "--unrestricted",
        "--fixed-strings",
        "--ignore-case",
        "--full-path",
        "--show-errors",
        "--color",
        "never",
        "--path-separator",
        "/",
    ]);

    // 只把目录规则交给 fd：--exclude 会连带剪枝同名文件夹，文件规则必须由应用筛选
    for name in &settings.ignored_directories {
        command.arg("--exclude").arg(name);
    }
    for rule in &settings.exclusions {
        if let Some(directory_rule) = rule.strip_suffix('/') {
            if !directory_rule.is_empty() {
                command.arg("--exclude").arg(directory_rule);
            }
        }
    }

    command.arg("--").arg(fd_query_arg(query)).arg(".");
    command
}

fn run_fd_search(
    root_path: &str,
    query: &str,
    settings: &TreeSettings,
) -> Result<SearchOutcome, String> {
    let query = query.trim();
    if query.is_empty() {
        return Ok(SearchOutcome {
            results: Vec::new(),
            has_more: false,
            incomplete: false,
            warning: None,
        });
    }

    let (root, _) = crate::validated_directory(root_path, "", settings)?;
    let mut command = fd_search_command(&root, query, settings);
    let mut child = command
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| format!("{FD_INSTALL_HINT}（{error}）"))?;

    let stdout = child.stdout.take().ok_or("无法读取 fd 输出")?;
    let stderr = child.stderr.take().ok_or("无法读取 fd 错误输出")?;

    // 独立线程排空 stderr：错误写满管道会让 fd 阻塞，stdout 随之停住
    let errors: Arc<Mutex<Vec<String>>> = Arc::new(Mutex::new(Vec::new()));
    let sink = Arc::clone(&errors);
    let stderr_reader = std::thread::spawn(move || {
        for line in BufReader::new(stderr).lines().map_while(Result::ok) {
            let mut guard = sink.lock().unwrap();
            if guard.len() < STDERR_SAMPLE_LIMIT {
                guard.push(line);
            }
        }
    });

    let collected = collect_matches(
        BufReader::new(stdout).lines().map_while(Result::ok),
        query,
        settings,
    );

    // 取够 11 条有效匹配即停，不必遍历完整目录
    let _ = child.kill();
    let _ = child.wait();
    let _ = stderr_reader.join();

    let mut results = collected.matches;
    for item in &mut results {
        if item.node_type == "file" {
            item.size = fs::metadata(root.join(&item.relative_path))
                .ok()
                .map(|metadata| metadata.len());
        }
    }

    let messages = errors.lock().unwrap();
    // 错误样本上限为 STDERR_SAMPLE_LIMIT，超出时计数失真，只报首条
    let warning = messages
        .first()
        .map(|first| format!("部分路径无法访问，搜索不完整（首条错误：{first}）"));

    Ok(SearchOutcome {
        results,
        has_more: collected.has_more,
        incomplete: !messages.is_empty(),
        warning,
    })
}

#[tauri::command]
pub(crate) async fn search_paths(
    root_path: String,
    query: String,
    settings: TreeSettings,
) -> Result<SearchOutcome, String> {
    tauri::async_runtime::spawn_blocking(move || run_fd_search(&root_path, &query, &settings))
        .await
        .map_err(|error| error.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    fn settings() -> TreeSettings {
        TreeSettings {
            whitelist: vec![".ts".to_string(), ".md".to_string()],
            exclusions: vec!["*.lock".to_string(), "node_modules/".to_string()],
            ignored_directories: vec![".git".to_string()],
            large_dir_threshold: 50,
        }
    }

    #[test]
    fn matches_relative_path_as_case_insensitive_plain_text() {
        assert!(accept_match(
            "src/Utils/treeUtils.ts",
            false,
            "utils/tree",
            &settings()
        ));
    }

    #[test]
    fn normalizes_backslash_queries_to_match_slash_relative_paths() {
        assert!(accept_match(
            "src/utils/treeUtils.ts",
            false,
            "utils\\tree",
            &settings()
        ));
        assert!(accept_match(
            "src/utils/treeUtils.ts",
            false,
            "UTILS/TREE",
            &settings()
        ));
    }

    #[test]
    fn fd_query_uses_platform_separator_for_full_path_prefilter() {
        // fd --full-path 在 Windows 上按原生 \ 匹配，--path-separator 只改输出不改匹配
        let expected = format!("utils{}tree", std::path::MAIN_SEPARATOR);
        assert_eq!(fd_query_arg("utils/tree"), expected);
        assert_eq!(fd_query_arg("utils\\tree"), expected);
        assert_eq!(fd_query_arg("  Utils/Tree  "), expected);
    }

    #[test]
    fn rejects_entries_under_ignored_directories() {
        assert!(!accept_match(".git/config", false, "config", &settings()));
        assert!(!accept_match("src/.git/HEAD", false, "head", &settings()));
    }

    #[test]
    fn applies_file_rules_to_files_only_and_keeps_matching_directories() {
        assert!(!accept_match("Cargo.lock", false, "cargo", &settings()));
        assert!(accept_match("cargo.lock", true, "cargo", &settings()));
        assert!(!accept_match("notes.txt", false, "notes", &settings()));
        assert!(accept_match("src/main.ts", false, "main", &settings()));
        assert!(!accept_match("node_modules", true, "node_modules", &settings()));
        assert!(!accept_match("src/node_modules", true, "node_modules", &settings()));
    }

    #[test]
    fn keeps_collecting_until_eleven_valid_matches_instead_of_first_ten_raw_lines() {
        let mut lines: Vec<String> = (0..15).map(|i| format!("./bad{i:02}.lock")).collect();
        lines.extend((1..=12).map(|i| format!("./good{i:02}.ts")));

        let collected = collect_matches(lines, "o", &settings());

        assert!(collected.has_more);
        assert_eq!(collected.matches.len(), DISPLAY_LIMIT);
        assert_eq!(collected.matches[0].relative_path, "good01.ts");
        assert_eq!(collected.matches[9].relative_path, "good10.ts");
    }

    #[test]
    fn recognizes_directories_and_sorts_results_by_full_path() {
        let lines = vec![
            "./src/zeta/".to_string(),
            "./src/alpha.ts".to_string(),
            "./README.md".to_string(),
            "./src/".to_string(),
        ];

        let collected = collect_matches(lines, "s", &settings());

        assert!(!collected.has_more);
        let paths: Vec<&str> = collected
            .matches
            .iter()
            .map(|item| item.relative_path.as_str())
            .collect();
        assert_eq!(paths, vec!["src", "src/alpha.ts", "src/zeta"]);
        assert_eq!(collected.matches[0].node_type, "directory");
        assert_eq!(collected.matches[0].name, "src");
        assert_eq!(collected.matches[1].node_type, "file");
        assert_eq!(collected.matches[2].node_type, "directory");
    }
}