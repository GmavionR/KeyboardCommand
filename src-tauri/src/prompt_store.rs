use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptItem {
    pub id: String,
    pub title: String,
    pub command: Option<String>,
    pub content: String,
    pub file_path: String,
    pub updated_at: Option<String>,
    pub has_error: bool,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavePromptPayload {
    pub original_file_path: Option<String>,
    pub title: String,
    pub command: Option<String>,
    pub content: String,
    pub overwrite: Option<bool>,
}

/// 清洗文件名中 Windows 不允许的字符: < > : " / \ | ? *
pub fn sanitize_filename(name: &str) -> String {
    let sanitized: String = name
        .chars()
        .map(|c| match c {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '_',
            c if c.is_control() => '_',
            other => other,
        })
        .collect();

    let trimmed = sanitized.trim().trim_matches('.');
    if trimmed.is_empty() {
        "未命名提示词".to_string()
    } else {
        trimmed.to_string()
    }
}

/// 获取提示词存储目录路径
pub fn get_prompts_directory(app: &AppHandle) -> PathBuf {
    if let Ok(app_data_dir) = app.path().app_data_dir() {
        let config_file = app_data_dir.join("prompts_dir.txt");
        if let Ok(custom_path_str) = fs::read_to_string(&config_file) {
            let custom_path = PathBuf::from(custom_path_str.trim());
            if custom_path.is_dir() {
                return custom_path;
            }
        }
        let default_dir = app_data_dir.join("prompts");
        let _ = fs::create_dir_all(&default_dir);
        default_dir
    } else {
        PathBuf::from("prompts")
    }
}

/// 保存自定义提示词存储目录路径
pub fn set_prompts_directory(app: &AppHandle, new_dir: &str) -> Result<String, String> {
    let path = PathBuf::from(new_dir.trim());
    if !path.exists() {
        fs::create_dir_all(&path).map_err(|e| format!("创建目录失败: {e}"))?;
    }
    if !path.is_dir() {
        return Err("指定路径不是有效的文件夹".to_string());
    }

    if let Ok(app_data_dir) = app.path().app_data_dir() {
        let config_file = app_data_dir.join("prompts_dir.txt");
        fs::write(&config_file, path.to_string_lossy().as_bytes())
            .map_err(|e| format!("写入配置失败: {e}"))?;
    }

    // 确保有种子文件
    ensure_default_presets(&path);

    Ok(path.to_string_lossy().to_string())
}

/// 解析单份 Markdown 文件的 YAML FrontMatter 与正文
pub fn parse_prompt_file(path: &Path) -> Result<PromptItem, String> {
    let raw = fs::read_to_string(path).map_err(|e| format!("读取文件失败: {e}"))?;
    let file_stem = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("未命名")
        .to_string();

    let file_path = path.to_string_lossy().to_string();
    let updated_at = fs::metadata(path)
        .ok()
        .and_then(|m| m.modified().ok())
        .map(|t| chrono::DateTime::<chrono::Local>::from(t).format("%Y-%m-%d %H:%M").to_string());

    // 检查是否以 --- 开头
    let lines: Vec<&str> = raw.lines().collect();
    if lines.first().map(|l| l.trim()) == Some("---") {
        // 查找闭合的 ---
        let mut closing_idx = None;
        for (i, line) in lines.iter().enumerate().skip(1) {
            if line.trim() == "---" {
                closing_idx = Some(i);
                break;
            }
        }

        if let Some(close_i) = closing_idx {
            let mut title = None;
            let mut command = None;
            let mut has_error = false;
            let mut error_message = None;

            for line in &lines[1..close_i] {
                let trimmed = line.trim();
                if trimmed.is_empty() || trimmed.starts_with('#') {
                    continue;
                }
                if let Some((k, v)) = trimmed.split_once(':') {
                    let key = k.trim().to_lowercase();
                    let val = v.trim().trim_matches('"').trim_matches('\'').trim().to_string();
                    match key.as_str() {
                        "title" => title = Some(val),
                        "command" | "keyword" => {
                            if !val.is_empty() {
                                command = Some(val);
                            }
                        }
                        _ => {}
                    }
                } else {
                    has_error = true;
                    error_message = Some(format!("FrontMatter 行语法警告: {trimmed}"));
                }
            }

            let content = lines[close_i + 1..].join("\n").trim_start_matches('\n').to_string();
            let final_title = title.unwrap_or_else(|| file_stem.clone());

            return Ok(PromptItem {
                id: file_stem,
                title: final_title,
                command,
                content,
                file_path,
                updated_at,
                has_error,
                error_message,
            });
        }
    }

    // 无 FrontMatter 或格式不规范：优雅降级
    Ok(PromptItem {
        id: file_stem.clone(),
        title: file_stem,
        command: None,
        content: raw.trim().to_string(),
        file_path,
        updated_at,
        has_error: false,
        error_message: None,
    })
}

/// 格式化为带有 YAML FrontMatter 的 Markdown
pub fn format_prompt_markdown(title: &str, command: Option<&str>, content: &str) -> String {
    let mut out = String::new();
    out.push_str("---\n");
    out.push_str(&format!("title: {}\n", title.trim()));
    if let Some(cmd) = command {
        let trimmed_cmd = cmd.trim();
        if !trimmed_cmd.is_empty() {
            out.push_str(&format!("command: {}\n", trimmed_cmd));
        }
    }
    out.push_str("---\n\n");
    out.push_str(content.trim());
    out.push('\n');
    out
}

/// 首次初始化时，如果目录内没有 .md 文件，写入内置默认预设
pub fn ensure_default_presets(dir: &Path) {
    if !dir.is_dir() {
        return;
    }

    let has_md = fs::read_dir(dir).map(|mut entries| {
        entries.any(|e| {
            e.ok()
                .map(|de| de.path().extension().and_then(|ext| ext.to_str()) == Some("md"))
                .unwrap_or(false)
        })
    }).unwrap_or(false);

    if has_md {
        return;
    }

    let presets = [
        (
            "详细解释",
            Some("eid"),
            "请使用中文详细、有条理、逻辑推理清晰地解释/拆解背景、原理、核心底层逻辑、使用方式与最佳实践、典型应用场景、注意事项及常见误解，并举例说明。并在回复中显示引用链接。"
        ),
        (
            "总结归纳成md",
            Some("summary"),
            "这个会话要结束了。请写一份交接文档存到 summary.md：详细说明我们讨论了什么内容、在做什么任务、已经完成了什么、当前卡在哪、下一步计划是什么、有哪些踩过的坑绝对不要再踩。写给一个完全没有上下文的新会话看。"
        ),
        (
            "代码重构优化",
            None,
            "仔细拆解分析审查这段代码（包括变量命名、函数职责等），判断逻辑上和技术上是否存在 bug 漏洞或边界异常，是否存在进一步重构优化的空间，并给出重构后的完整代码和修改理由。"
        ),
        (
            "生成变量名或函数名",
            Some("varName"),
            "根据上述业务含义和上下文，给出 3-5 个符合业界最佳规范、命名清晰精准、无歧义的英文变量名或函数名，并标注各选项的细微侧重点。"
        ),
        (
            "面试口语化回答",
            Some("interview"),
            "假设你是一位资深高级工程师，面对面试官提出这个问题，请给出结构严谨（总-分-总）、口语化自然、表达精准且突显技术深度的回答策略与口语表述。"
        ),
        (
            "给出demo验证观点",
            Some("demo"),
            "请给出一套最小可运行（Minimal Reproducible）的切实可行代码 Demo，条理清晰地验证上述观点和结论。"
        ),
        (
            "使用中文回答",
            Some("ancn"),
            "English is my mother tongue, but I'm working on my Chinese skills, so please stick to Chinese in your replies. 请保持全程使用中文回答。"
        ),
    ];

    for (title, cmd, content) in presets {
        let filename = format!("{}.md", sanitize_filename(title));
        let path = dir.join(filename);
        let text = format_prompt_markdown(title, cmd, content);
        let _ = fs::write(path, text);
    }
}

/// 扫描读取所有提示词
pub fn list_all_prompts(dir: &Path) -> Vec<PromptItem> {
    ensure_default_presets(dir);

    let mut items = Vec::new();
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("md") {
                if let Ok(item) = parse_prompt_file(&path) {
                    items.push(item);
                }
            }
        }
    }

    // 默认按标题排序
    items.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));
    items
}

/// 保存或更新提示词
pub fn save_prompt_file(dir: &Path, payload: SavePromptPayload) -> Result<PromptItem, String> {
    let sanitized_title = sanitize_filename(&payload.title);
    let target_filename = format!("{}.md", sanitized_title);
    let target_path = dir.join(&target_filename);

    let is_rename = if let Some(ref orig) = payload.original_file_path {
        let orig_path = PathBuf::from(orig);
        orig_path != target_path
    } else {
        false
    };

    // 检查目标文件是否冲突
    if target_path.exists() {
        let overwrite = payload.overwrite.unwrap_or(false);
        if is_rename && !overwrite {
            return Err(format!("已存在同名提示词文件：{}", target_filename));
        }
        if payload.original_file_path.is_none() && !overwrite {
            return Err(format!("已存在同名提示词文件：{}", target_filename));
        }
    }

    let markdown = format_prompt_markdown(
        &payload.title,
        payload.command.as_deref(),
        &payload.content,
    );

    // 如果是重命名，先写入新文件再删除旧文件
    fs::write(&target_path, markdown).map_err(|e| format!("写入文件失败: {e}"))?;

    if is_rename {
        if let Some(orig) = payload.original_file_path {
            let orig_path = PathBuf::from(orig);
            if orig_path.exists() && orig_path != target_path {
                let _ = fs::remove_file(orig_path);
            }
        }
    }

    parse_prompt_file(&target_path)
}

/// 删除提示词
pub fn delete_prompt_file(file_path: &str) -> Result<(), String> {
    let path = PathBuf::from(file_path);
    if path.exists() {
        fs::remove_file(path).map_err(|e| format!("删除文件失败: {e}"))?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanitize_filename_replaces_illegal_windows_chars() {
        assert_eq!(sanitize_filename("详细:解释/代码*测试?"), "详细_解释_代码_测试_");
        assert_eq!(sanitize_filename("   ...  "), "未命名提示词");
        assert_eq!(sanitize_filename("valid_name"), "valid_name");
    }

    #[test]
    fn format_and_parse_prompt_markdown_roundtrip() {
        let temp_dir = std::env::temp_dir().join(format!("kbc_test_{}", std::process::id()));
        let _ = fs::create_dir_all(&temp_dir);
        let test_file = temp_dir.join("test_prompt.md");

        let text = format_prompt_markdown("测试标题", Some("eid"), "这是正文第一行\n这是正文第二行");
        fs::write(&test_file, text).unwrap();

        let item = parse_prompt_file(&test_file).unwrap();
        assert_eq!(item.title, "测试标题");
        assert_eq!(item.command.as_deref(), Some("eid"));
        assert_eq!(item.content, "这是正文第一行\n这是正文第二行");
        assert!(!item.has_error);

        let _ = fs::remove_dir_all(temp_dir);
    }

    #[test]
    fn parse_prompt_markdown_without_frontmatter_graceful_fallback() {
        let temp_dir = std::env::temp_dir().join(format!("kbc_test_fallback_{}", std::process::id()));
        let _ = fs::create_dir_all(&temp_dir);
        let test_file = temp_dir.join("普通文本.md");

        fs::write(&test_file, "这是一段没有 FrontMatter 的纯文本").unwrap();

        let item = parse_prompt_file(&test_file).unwrap();
        assert_eq!(item.title, "普通文本");
        assert_eq!(item.command, None);
        assert_eq!(item.content, "这是一段没有 FrontMatter 的纯文本");
        assert!(!item.has_error);

        let _ = fs::remove_dir_all(temp_dir);
    }
}

