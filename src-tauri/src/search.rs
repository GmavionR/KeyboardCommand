use crate::{directory_block_reason, is_allowed_file, is_directory_rule, rule_text, TreeSettings};
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

// 查询只与文件/目录自身的名称比较，统一 trim + 转小写
fn normalize_query(query: &str) -> String {
    query.trim().to_lowercase()
}

// 名称里不含路径分隔符，这类查询必然无结果；fd 还会直接报错退出，
// 若不提前拦下，stderr 会被当成遍历失败而误报「搜索不完整」。
fn is_unmatchable_query(query: &str) -> bool {
    query.is_empty() || query.contains(std::path::is_separator)
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

    let mut segments = relative_path.split('/');
    let name = segments.next_back().unwrap_or("");
    // 只匹配自身名称：父目录命中不得把名称不相干的子项带出来
    if !name.to_lowercase().contains(&query) {
        return false;
    }

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
    // 仅 debug 构建下发，release 构建恒为 None，前端据此决定是否展示
    #[serde(skip_serializing_if = "Option::is_none")]
    command: Option<String>,
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

// 规则文本按字面量处理，glob 元字符必须转义。实测未转义的 `*a[b]c*/`
// 会把 `abxc/` 当成字符类匹配一并剪掉，转义后只剪 `a[b]c/`。
fn escape_glob(text: &str) -> String {
    let mut escaped = String::with_capacity(text.len());
    for ch in text.chars() {
        if matches!(ch, '\\' | '?' | '*' | '[' | ']' | '{' | '}') {
            escaped.push('\\');
        }
        escaped.push(ch);
    }
    escaped
}

fn fd_search_command(root: &Path, query: &str, settings: &TreeSettings) -> Command {
    let mut command = Command::new("fd");
    hide_console_window(&mut command);
    // 不用 --unrestricted：保留 fd 原生对 .gitignore 的尊重，只用 --hidden 放开隐藏项，
    // 让白名单里的 .env.example 之类仍可被搜到。
    // 不用 --full-path：它会把父目录路径纳入匹配，导致名称不相干的子文件被带出来。
    command.current_dir(root).args([
        "--hidden",
        "--fixed-strings",
        "--ignore-case",
        "--show-errors",
        "--color",
        "never",
        "--path-separator",
        "/",
    ]);

    // 目录规则下推给 fd 剪枝，文件规则由 accept_match 后筛选。
    // fd --exclude 是 glob，尾斜杠只匹配目录路径：`name/` 剪同名目录，
    // `*text*/` 剪名称含 text 的目录，两者都不会误伤同名文件，因此可以安全下推。
    for name in &settings.ignored_directories {
        let trimmed = name.trim();
        if trimmed.is_empty() {
            continue;
        }
        command
            .arg("--exclude")
            .arg(format!("{}/", escape_glob(trimmed)));
    }
    for rule in &settings.exclusions {
        if !is_directory_rule(rule) {
            continue;
        }
        let text = rule_text(rule);
        if text.is_empty() {
            continue;
        }
        command
            .arg("--exclude")
            .arg(format!("*{}*/", escape_glob(&text)));
    }

    command.arg("--").arg(normalize_query(query)).arg(".");
    command
}

// 仅 debug 构建渲染命令行，供前端开发面板展示；release 构建不编译此函数
#[cfg(debug_assertions)]
fn format_command(command: &Command) -> String {
    let mut parts = vec![command.get_program().to_string_lossy().into_owned()];
    for arg in command.get_args() {
        let text = arg.to_string_lossy();
        if text.is_empty() || text.contains(' ') {
            parts.push(format!("\"{text}\""));
        } else {
            parts.push(text.into_owned());
        }
    }
    parts.join(" ")
}

fn run_fd_search(
    root_path: &str,
    query: &str,
    settings: &TreeSettings,
) -> Result<SearchOutcome, String> {
    let query = query.trim();
    if is_unmatchable_query(query) {
        return Ok(SearchOutcome {
            results: Vec::new(),
            has_more: false,
            incomplete: false,
            warning: None,
            command: None,
        });
    }

    let (root, _) = crate::validated_directory(root_path, "", settings)?;
    let mut command = fd_search_command(&root, query, settings);
    #[cfg(debug_assertions)]
    let command_line = Some(format_command(&command));
    #[cfg(not(debug_assertions))]
    let command_line = None;
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
        command: command_line,
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
            exclusions: vec![".lock".to_string(), "node_modules/".to_string()],
            ignored_directories: vec![".git".to_string()],
            large_dir_threshold: 50,
        }
    }

    #[test]
    fn matches_own_name_as_case_insensitive_plain_text() {
        assert!(accept_match(
            "src/utils/treeUtils.ts",
            false,
            "TREEUTILS",
            &settings()
        ));
        assert!(accept_match(
            "src/utils/treeUtils.ts",
            false,
            "  treeUtils  ",
            &settings()
        ));
    }

    #[test]
    fn rejects_entries_whose_own_name_misses_even_when_parent_path_matches() {
        // --full-path 的老毛病：父目录叫 components 就把里面所有文件都带出来
        assert!(!accept_match(
            "src/components/copier.ts",
            false,
            "components",
            &settings()
        ));
        assert!(!accept_match(
            "src/components/copier.ts",
            false,
            "src",
            &settings()
        ));
        assert!(accept_match(
            "src/components/copier.ts",
            false,
            "copier",
            &settings()
        ));
        // 带分隔符的查询不再被当作路径匹配，名称里没有分隔符
        assert!(!accept_match(
            "src/components/copier.ts",
            false,
            "components/copier",
            &settings()
        ));
        assert!(!accept_match(
            "src/components/copier.ts",
            false,
            "components\\copier",
            &settings()
        ));
    }

    #[test]
    fn keeps_matching_directories_by_their_own_name() {
        assert!(accept_match("src/components", true, "components", &settings()));
        assert!(!accept_match(
            "src/components/copier.ts",
            false,
            "components",
            &settings()
        ));
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
            "./src/zetas/".to_string(),
            "./src/notes.md".to_string(),
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
        // README.md 只是父目录命中才有的老结果，名称本身没有 s，不该出现
        assert_eq!(paths, vec!["src", "src/notes.md", "src/zetas"]);
        assert_eq!(collected.matches[0].node_type, "directory");
        assert_eq!(collected.matches[0].name, "src");
        assert_eq!(collected.matches[1].node_type, "file");
        assert_eq!(collected.matches[2].node_type, "directory");
    }

    fn args_of(command: &Command) -> Vec<String> {
        command
            .get_args()
            .map(|arg| arg.to_string_lossy().into_owned())
            .collect()
    }

    fn exclude_values(args: &[String]) -> Vec<String> {
        args.windows(2)
            .filter(|pair| pair[0] == "--exclude")
            .map(|pair| pair[1].clone())
            .collect()
    }

    #[test]
    fn keeps_native_gitignore_filtering_and_only_opens_hidden_entries() {
        let args = args_of(&fd_search_command(Path::new("."), "main", &settings()));
        assert!(args.iter().any(|arg| arg == "--hidden"));
        // --unrestricted 等价于 --no-ignore --hidden，会关掉 gitignore 过滤
        assert!(!args.iter().any(|arg| arg == "--unrestricted"));
        assert!(!args.iter().any(|arg| arg == "--no-ignore"));
    }

    #[test]
    fn pushes_ignored_directories_as_exact_directory_globs() {
        let mut config = settings();
        config.ignored_directories = vec![".git".to_string(), " target ".to_string()];
        let args = args_of(&fd_search_command(Path::new("."), "main", &config));
        let excludes = exclude_values(&args);
        assert!(excludes.contains(&".git/".to_string()));
        assert!(excludes.contains(&"target/".to_string()));
    }

    #[test]
    fn pushes_directory_exclusions_as_contains_globs_and_never_file_rules() {
        let mut config = settings();
        config.exclusions = vec![
            ".lock".to_string(),
            ".min.js".to_string(),
            "node_modules/".to_string(),
            "*dist*/".to_string(),
        ];
        let args = args_of(&fd_search_command(Path::new("."), "main", &config));
        let excludes = exclude_values(&args);
        assert!(excludes.contains(&"*node_modules*/".to_string()));
        // 规则里的 `*` 无特殊含义，先丢弃再包成包含 glob
        assert!(excludes.contains(&"*dist*/".to_string()));
        // 文件规则不下推，交给 accept_match 后筛选
        assert!(!excludes.iter().any(|value| value.contains(".lock")));
        assert!(!excludes.iter().any(|value| value.contains(".min.js")));
    }

    #[test]
    fn escapes_glob_metacharacters_in_pushed_rules() {
        let mut config = settings();
        config.exclusions = vec!["a[b]c/".to_string()];
        config.ignored_directories = vec!["x{y}".to_string()];
        let args = args_of(&fd_search_command(Path::new("."), "main", &config));
        let excludes = exclude_values(&args);
        // 未转义时 fd 会把 [b] 当字符类，连带剪掉 abxc/
        assert!(excludes.contains(&"*a\\[b\\]c*/".to_string()));
        assert!(excludes.contains(&"x\\{y\\}/".to_string()));
    }

    #[test]
    fn skips_blank_directory_rules() {
        let mut config = settings();
        config.ignored_directories = vec![String::new(), "   ".to_string()];
        config.exclusions = vec!["/".to_string(), "*/".to_string(), "  /  ".to_string()];
        let args = args_of(&fd_search_command(Path::new("."), "main", &config));
        assert!(exclude_values(&args).is_empty());
    }

    #[test]
    fn never_passes_full_path_and_sends_trimmed_lowercase_query() {
        let args = args_of(&fd_search_command(Path::new("."), "  Utils  ", &settings()));
        // --full-path 会把父目录纳入匹配，必须缺席
        assert!(!args.iter().any(|arg| arg == "--full-path"));
        assert_eq!(args.last().map(String::as_str), Some("."));
        assert!(args.windows(2).any(|pair| pair[0] == "--" && pair[1] == "utils"));
    }

    #[test]
    fn short_circuits_queries_that_can_never_match_a_name() {
        // fd 对含分隔符的 pattern 直接报错退出，必须在调用前拦下
        assert!(is_unmatchable_query(""));
        assert!(is_unmatchable_query("utils/tree"));
        assert!(is_unmatchable_query("utils\\tree"));
        assert!(!is_unmatchable_query("tree.ts"));
        assert!(!is_unmatchable_query("copier"));
    }

    #[cfg(debug_assertions)]
    #[test]
    fn format_command_quotes_empty_and_space_bearing_args() {
        let mut command = Command::new("fd");
        command.arg("--exclude").arg("my dir/").arg("");
        assert_eq!(
            format_command(&command),
            "fd --exclude \"my dir/\" \"\""
        );
    }
}