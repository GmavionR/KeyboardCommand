use crate::{directory_block_reason, is_allowed_file, user_error, TreeSettings};
use chrono::Local;
use serde::Serialize;
use std::fs;
use std::io::ErrorKind;
use std::path::{Component, Path, PathBuf};

const KNOWN_LANGUAGES: [&str; 10] = [
    "ts", "tsx", "js", "jsx", "json", "css", "html", "md", "py", "rs",
];

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageFailure {
    file_path: String,
    reason: String,
    code: &'static str,
    detail: String,
}

#[derive(Serialize)]
pub struct PackageError {
    pub failures: Vec<PackageFailure>,
}

fn failure(
    file_path: String,
    reason: String,
    code: &'static str,
    detail: String,
) -> PackageError {
    PackageError {
        failures: vec![PackageFailure {
            file_path,
            reason,
            code,
            detail,
        }],
    }
}

fn io_code(error: &std::io::Error) -> &'static str {
    // Windows: 32 = 文件被占用，5 = 拒绝访问
    match error.raw_os_error() {
        Some(32) => "EBUSY",
        Some(5) => "EACCES",
        _ => match error.kind() {
            ErrorKind::NotFound => "ENOENT",
            ErrorKind::PermissionDenied => "EACCES",
            _ => "ENOPERM",
        },
    }
}

fn language_tag(name: &str) -> String {
    let extension = match name.rsplit_once('.') {
        Some((_, extension)) if !extension.is_empty() => extension.to_lowercase(),
        _ => return String::new(),
    };
    if KNOWN_LANGUAGES.contains(&extension.as_str()) {
        extension
    } else {
        String::new()
    }
}

fn fence_length(content: &str) -> usize {
    let longest_run = content
        .bytes()
        .scan(0usize, |run, byte| {
            *run = if byte == b'`' { *run + 1 } else { 0 };
            Some(*run)
        })
        .max()
        .unwrap_or(0);
    longest_run.max(2) + 1
}

fn strip_utf8_bom(bytes: Vec<u8>) -> Vec<u8> {
    if bytes.starts_with(&[0xEF, 0xBB, 0xBF]) {
        bytes.into_iter().skip(3).collect()
    } else {
        bytes
    }
}

fn read_package_file(
    canonical_root: &Path,
    relative_path: &str,
    settings: &TreeSettings,
) -> Result<String, PackageError> {
    let supplied = Path::new(relative_path);
    let segments: Vec<&std::ffi::OsStr> = match supplied
        .components()
        .map(|component| match component {
            Component::Normal(segment) => Some(segment),
            _ => None,
        })
        .collect::<Option<Vec<_>>>()
    {
        Some(segments) if !segments.is_empty() => segments,
        _ => {
            return Err(failure(
                relative_path.to_string(),
                "相对路径包含越界片段，不在所选文件夹内。".to_string(),
                "EINVAL",
                format!("拒绝的路径片段：{relative_path}"),
            ))
        }
    };

    for directory in &segments[..segments.len() - 1] {
        let name = directory.to_string_lossy();
        let (ignored, ignored_reason, excluded, excluded_reason) =
            directory_block_reason(&name, settings);
        if ignored || excluded {
            let reason = ignored_reason.or(excluded_reason).unwrap_or_default();
            return Err(failure(
                relative_path.to_string(),
                format!("所在目录已被规则屏蔽：{name}（{reason}）"),
                "ENOPERM",
                format!("祖先目录 {name} 命中忽略或排除规则"),
            ));
        }
    }

    let file_name = segments[segments.len() - 1].to_string_lossy().into_owned();
    if !is_allowed_file(&file_name, settings) {
        return Err(failure(
            relative_path.to_string(),
            "该文件按当前白名单与排除规则不可复制。".to_string(),
            "ENOPERM",
            format!("文件名 {file_name} 未命中白名单或命中排除规则"),
        ));
    }

    let mut target = canonical_root.to_path_buf();
    for segment in &segments {
        target.push(segment);
    }

    let canonical_target = match fs::canonicalize(&target) {
        Ok(path) => path,
        Err(error) => {
            return Err(failure(
                relative_path.to_string(),
                user_error("读取文件", &target, &error),
                io_code(&error),
                format!("{error:?}"),
            ))
        }
    };
    if !canonical_target.starts_with(canonical_root) || !canonical_target.is_file() {
        return Err(failure(
            relative_path.to_string(),
            "目标不在所选文件夹内或不是普通文件。".to_string(),
            "ENOPERM",
            format!("解析后的真实路径：{}", canonical_target.display()),
        ));
    }

    let bytes = match fs::read(&canonical_target) {
        Ok(bytes) => bytes,
        Err(error) => {
            return Err(failure(
                relative_path.to_string(),
                user_error("读取文件", &canonical_target, &error),
                io_code(&error),
                format!("{error:?}"),
            ))
        }
    };
    let content = match String::from_utf8(strip_utf8_bom(bytes)) {
        Ok(content) => content,
        Err(error) => {
            return Err(failure(
                relative_path.to_string(),
                "文件不是 UTF-8 编码的文本，无法生成文件上下文包。".to_string(),
                "EENCODING",
                format!("UTF-8 解码失败：{}", error.utf8_error()),
            ))
        }
    };

    let fence = "`".repeat(fence_length(&content));
    let mut block = format!(
        "#### [FILE: {relative_path}]\n{fence}{lang}\n",
        lang = language_tag(&file_name)
    );
    block.push_str(&content);
    block.push('\n');
    block.push_str(&fence);
    Ok(block)
}

fn canonical_root_of(root_path: &str) -> Result<PathBuf, PackageError> {
    let supplied_root = Path::new(root_path);
    fs::canonicalize(supplied_root).map_err(|error| {
        failure(
            root_path.to_string(),
            user_error("访问文件夹", supplied_root, &error),
            io_code(&error),
            format!("{error:?}"),
        )
    })
}

fn require_paths(relative_paths: &[String]) -> Result<(), PackageError> {
    if relative_paths.is_empty() {
        return Err(failure(
            String::new(),
            "未选择任何文件。".to_string(),
            "EINVAL",
            "复制请求的文件列表为空".to_string(),
        ));
    }
    Ok(())
}

fn generate(
    root_path: &str,
    relative_paths: &[String],
    settings: &TreeSettings,
) -> Result<String, PackageError> {
    require_paths(relative_paths)?;
    let canonical_root = canonical_root_of(root_path)?;

    let (entries, failures) = read_entries(&canonical_root, relative_paths, settings);

    // 规格：普通复制任一文件读取失败时全量取消，不产出半个包
    if !failures.is_empty() {
        return Err(PackageError { failures });
    }

    Ok(render(
        root_path.trim_end_matches(['/', '\\']),
        &entries,
    ))
}

fn read_entries(
    canonical_root: &Path,
    relative_paths: &[String],
    settings: &TreeSettings,
) -> (Vec<(String, String)>, Vec<PackageFailure>) {
    let mut entries = Vec::with_capacity(relative_paths.len());
    let mut failures = Vec::new();
    for relative_path in relative_paths {
        match read_package_file(canonical_root, relative_path, settings) {
            Ok(block) => entries.push((relative_path.clone(), block)),
            Err(error) => failures.extend(error.failures),
        }
    }
    (entries, failures)
}

fn render(display_root: &str, entries: &[(String, String)]) -> String {
    let mut doc = format!(
        "### 文件上下文包 ({} 个文件)\n生成时间: {}\n来源根目录: {display_root}\n\n#### 文件清单:\n",
        entries.len(),
        Local::now().format("%Y-%m-%d %H:%M:%S")
    );
    for (index, (relative_path, _)) in entries.iter().enumerate() {
        doc.push_str(&format!("{}. `{relative_path}`\n", index + 1));
    }
    doc.push_str("\n========================================\n\n");
    for (_, block) in entries {
        doc.push_str(block);
        doc.push_str("\n\n");
    }
    doc
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RefreshedPackage {
    markdown: Option<String>,
    paths: Vec<String>,
    failures: Vec<PackageFailure>,
}

// 历史“读取当前文件”按规格忽略失败项：有成功文件就出包，全部失败才保留旧记录
fn refresh(
    root_path: &str,
    relative_paths: &[String],
    settings: &TreeSettings,
) -> Result<RefreshedPackage, PackageError> {
    require_paths(relative_paths)?;
    let canonical_root = canonical_root_of(root_path)?;

    let (entries, failures) = read_entries(&canonical_root, relative_paths, settings);
    if entries.is_empty() {
        return Ok(RefreshedPackage {
            markdown: None,
            paths: Vec::new(),
            failures,
        });
    }

    let display_root = root_path.trim_end_matches(['/', '\\']);
    let paths = entries.iter().map(|(path, _)| path.clone()).collect();
    Ok(RefreshedPackage {
        markdown: Some(render(display_root, &entries)),
        paths,
        failures,
    })
}

#[tauri::command]
pub async fn refresh_context_package(
    root_path: String,
    relative_paths: Vec<String>,
    settings: TreeSettings,
) -> Result<RefreshedPackage, PackageError> {
    tauri::async_runtime::spawn_blocking(move || refresh(&root_path, &relative_paths, &settings))
        .await
        .map_err(|error| {
            failure(
                String::new(),
                "后台读取任务异常终止，请重试。".to_string(),
                "ENOPERM",
                error.to_string(),
            )
        })?
}

#[tauri::command]
pub async fn generate_context_package(
    root_path: String,
    relative_paths: Vec<String>,
    settings: TreeSettings,
) -> Result<String, PackageError> {
    tauri::async_runtime::spawn_blocking(move || generate(&root_path, &relative_paths, &settings))
        .await
        .map_err(|error| {
            failure(
                String::new(),
                "后台读取任务异常终止，请重试。".to_string(),
                "ENOPERM",
                error.to_string(),
            )
        })?
}
