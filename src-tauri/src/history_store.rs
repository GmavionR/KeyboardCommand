use crate::user_error;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

// 复制历史为全局 FIFO 列表，条数上限 20（issue 15）
const HISTORY_LIMIT: usize = 20;
const HISTORY_SUBDIR: &str = "history";
const META_SUFFIX: &str = ".meta.json";
const BODY_SUFFIX: &str = ".md";
const TMP_SUFFIX: &str = ".tmp";

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct HistoryRecord {
    id: String,
    created_at: i64,
    source_folder: String,
    file_count: usize,
    file_paths: Vec<String>,
    // 正文文件名按 issue 48 保留在元数据中，日后改命名规则无需迁移旧记录
    body_file_name: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct HistoryList {
    records: Vec<HistoryRecord>,
    warning: Option<String>,
}

fn history_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("无法定位应用数据目录：{error}"))?;
    Ok(data_dir.join(HISTORY_SUBDIR))
}

// 记录标识 = 毫秒时间戳 + 6 位十六进制后缀（issue 48）。后缀取纳秒并混入进程内
// 计数，避免为几十字节的去重引入随机数依赖。
fn new_record_id() -> String {
    static COUNTER: AtomicU64 = AtomicU64::new(0);
    let elapsed = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    let millis = elapsed.as_millis() as i64;
    let nonce = (u64::from(elapsed.subsec_nanos()) ^ (COUNTER.fetch_add(1, Ordering::Relaxed) << 13))
        & 0x00ff_ffff;
    format!("{millis}-{nonce:06x}")
}

fn is_valid_record_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= 64
        && id
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-' || byte == b'_')
}

fn write_atomic(path: &Path, bytes: &[u8], action: &str) -> Result<(), String> {
    let name = path
        .file_name()
        .map(|value| value.to_string_lossy().into_owned())
        .unwrap_or_default();
    let temp = path.with_file_name(format!("{name}{TMP_SUFFIX}"));
    fs::write(&temp, bytes).map_err(|error| user_error(action, &temp, error))?;
    fs::rename(&temp, path).map_err(|error| {
        let _ = fs::remove_file(&temp);
        user_error(action, path, error)
    })
}

fn meta_path(directory: &Path, id: &str) -> PathBuf {
    directory.join(format!("{id}{META_SUFFIX}"))
}

fn read_meta(path: &Path) -> Result<HistoryRecord, String> {
    let bytes = fs::read(path).map_err(|error| user_error("读取历史元数据", path, error))?;
    serde_json::from_slice::<HistoryRecord>(&bytes)
        .map_err(|error| format!("历史元数据格式无效：{}（{error}）", path.display()))
}

fn list_metas(directory: &Path) -> Result<Vec<HistoryRecord>, String> {
    let entries = fs::read_dir(directory).map_err(|error| user_error("读取历史目录", directory, error))?;
    let mut records = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|error| user_error("读取历史目录项", directory, error))?;
        let path = entry.path();
        if !path.is_file() || !path.file_name().is_some_and(|name| name.to_string_lossy().ends_with(META_SUFFIX)) {
            continue;
        }
        match read_meta(&path) {
            Ok(record) => records.push(record),
            // 坏元数据不该连带吃掉整份历史，交由调用方汇总提示
            Err(_) => continue,
        }
    }
    records.sort_by(|left, right| {
        right
            .created_at
            .cmp(&left.created_at)
            .then_with(|| right.id.cmp(&left.id))
    });
    Ok(records)
}

fn count_unreadable_metas(directory: &Path) -> usize {
    let Ok(entries) = fs::read_dir(directory) else {
        return 0;
    };
    entries
        .filter_map(|entry| entry.ok())
        .filter(|entry| {
            entry.path().is_file()
                && entry
                    .path()
                    .file_name()
                    .is_some_and(|name| name.to_string_lossy().ends_with(META_SUFFIX))
        })
        .filter(|entry| read_meta(&entry.path()).is_err())
        .count()
}

// ADR-0003：元数据是发布标记。删除先删元数据，再删正文。
fn remove_pair(directory: &Path, record: &HistoryRecord) {
    let _ = fs::remove_file(meta_path(directory, &record.id));
    let _ = fs::remove_file(directory.join(&record.body_file_name));
}

fn evict_oldest(directory: &Path, records: &mut Vec<HistoryRecord>) {
    while records.len() > HISTORY_LIMIT {
        let oldest = records
            .iter()
            .enumerate()
            .min_by(|(_, left), (_, right)| {
                left.created_at
                    .cmp(&right.created_at)
                    .then_with(|| left.id.cmp(&right.id))
            })
            .map(|(index, _)| index);
        let Some(index) = oldest else { break };
        let record = records.remove(index);
        remove_pair(directory, &record);
    }
}

fn write_record(
    directory: &Path,
    source_folder: &str,
    file_paths: &[String],
    markdown: &str,
) -> Result<HistoryRecord, String> {
    fs::create_dir_all(directory).map_err(|error| user_error("创建历史目录", directory, error))?;

    let id = new_record_id();
    let record = HistoryRecord {
        id: id.clone(),
        created_at: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|elapsed| elapsed.as_millis() as i64)
            .unwrap_or_default(),
        source_folder: source_folder.to_string(),
        file_count: file_paths.len(),
        file_paths: file_paths.to_vec(),
        body_file_name: format!("{id}{BODY_SUFFIX}"),
    };

    // 先写正文再发布元数据，保证不会出现只有元数据的半条记录
    write_atomic(
        &directory.join(&record.body_file_name),
        markdown.as_bytes(),
        "写入历史正文",
    )?;
    let meta_bytes =
        serde_json::to_vec_pretty(&record).map_err(|error| format!("序列化历史元数据失败：{error}"))?;
    match write_atomic(&meta_path(directory, &id), &meta_bytes, "写入历史元数据") {
        Ok(()) => Ok(record),
        Err(error) => {
            // 元数据没发布出去，这条正文就是孤儿，顺手回收
            let _ = fs::remove_file(directory.join(&record.body_file_name));
            Err(error)
        }
    }
}

fn file_name_of(path: &Path) -> String {
    path.file_name()
        .map(|value| value.to_string_lossy().into_owned())
        .unwrap_or_default()
}

fn modified_more_than(path: &Path, age: std::time::Duration) -> bool {
    let Ok(modified) = path.metadata().and_then(|meta| meta.modified()) else {
        return false;
    };
    SystemTime::now()
        .duration_since(modified)
        .is_ok_and(|elapsed| elapsed > age)
}

// ADR-0003 与 issue 48：清理没有配对元数据的正文。发布顺序是先写正文后写元数据，
// 所以正在写入的正文暂时看起来像孤儿；正文与临时文件都只在足够陈旧时才回收，
// 避免并发写入被误删。
const ORPHAN_AGE: std::time::Duration = std::time::Duration::from_secs(300);

fn clean_orphans(directory: &Path) {
    let Ok(entries) = fs::read_dir(directory) else {
        return;
    };
    let files: Vec<(PathBuf, String)> = entries
        .filter_map(|entry| entry.ok())
        .map(|entry| {
            let path = entry.path();
            (path.clone(), file_name_of(&path))
        })
        .filter(|(path, _)| path.is_file())
        .collect();
    let names: HashSet<String> = files.iter().map(|(_, name)| name.clone()).collect();

    for (path, name) in files {
        if let Some(stem) = name.strip_suffix(BODY_SUFFIX) {
            if !names.contains(&format!("{stem}{META_SUFFIX}"))
                && modified_more_than(&path, ORPHAN_AGE)
            {
                let _ = fs::remove_file(&path);
            }
        } else if name.ends_with(TMP_SUFFIX) && modified_more_than(&path, ORPHAN_AGE) {
            let _ = fs::remove_file(&path);
        }
    }
}

#[tauri::command]
pub async fn list_history(app: tauri::AppHandle) -> Result<HistoryList, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let directory = history_dir(&app)?;
        if !directory.exists() {
            return Ok(HistoryList {
                records: Vec::new(),
                warning: None,
            });
        }

        let mut records = match list_metas(&directory) {
            Ok(records) => records,
            // issue 48：整个历史目录不可读时按空处理，只提示一次，不阻塞其他功能
            Err(error) => {
                return Ok(HistoryList {
                    records: Vec::new(),
                    warning: Some(format!("历史目录暂时无法读取，本次按空历史显示。{error}")),
                });
            }
        };

        clean_orphans(&directory);

        let broken = count_unreadable_metas(&directory);
        let warning = (broken > 0)
            .then(|| format!("有 {broken} 个历史元数据文件无法解析，未显示在列表中。"));

        // 超限淘汰只在写入新记录时发生；读取列表不删数据，只保证呈现上限
        records.truncate(HISTORY_LIMIT);
        Ok(HistoryList { records, warning })
    })
    .await
    .map_err(|error| format!("历史读取任务异常终止，请重试。（{error}）"))?
}

#[tauri::command]
pub async fn save_history(
    app: tauri::AppHandle,
    source_folder: String,
    file_paths: Vec<String>,
    markdown: String,
) -> Result<HistoryRecord, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let directory = history_dir(&app)?;
        let record = write_record(&directory, &source_folder, &file_paths, &markdown)?;
        evict_oldest(&directory, &mut list_metas(&directory).unwrap_or_default());
        Ok(record)
    })
    .await
    .map_err(|error| format!("历史保存任务异常终止，请重试。（{error}）"))?
}

// ADR-0001：重读成功后用新记录替换所选记录（新标识、新时间），先写新对再删旧对
#[tauri::command]
pub async fn replace_history(
    app: tauri::AppHandle,
    replaced_id: String,
    source_folder: String,
    file_paths: Vec<String>,
    markdown: String,
) -> Result<HistoryRecord, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let directory = history_dir(&app)?;
        if !is_valid_record_id(&replaced_id) {
            return Err("历史记录标识无效，无法替换。".to_string());
        }
        let record = write_record(&directory, &source_folder, &file_paths, &markdown)?;
        if let Ok(old) = read_meta(&meta_path(&directory, &replaced_id)) {
            remove_pair(&directory, &old);
        }
        evict_oldest(&directory, &mut list_metas(&directory).unwrap_or_default());
        Ok(record)
    })
    .await
    .map_err(|error| format!("历史替换任务异常终止，请重试。（{error}）"))?
}

#[tauri::command]
pub async fn delete_history(app: tauri::AppHandle, history_id: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let directory = history_dir(&app)?;
        if !is_valid_record_id(&history_id) {
            return Err("历史记录标识无效，无法删除。".to_string());
        }
        let path = meta_path(&directory, &history_id);
        if !path.exists() {
            return Ok(());
        }
        let record = read_meta(&path)?;
        remove_pair(&directory, &record);
        Ok(())
    })
    .await
    .map_err(|error| format!("历史删除任务异常终止，请重试。（{error}）"))?
}

#[tauri::command]
pub async fn read_history_body(app: tauri::AppHandle, history_id: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let directory = history_dir(&app)?;
        if !is_valid_record_id(&history_id) {
            return Err("历史记录标识无效，无法读取快照正文。".to_string());
        }
        let record = read_meta(&meta_path(&directory, &history_id))?;
        let body_path = directory.join(&record.body_file_name);
        let bytes = fs::read(&body_path)
            .map_err(|error| user_error("读取历史快照正文", &body_path, error))?;
        String::from_utf8(bytes).map_err(|error| {
            format!("历史快照正文不是 UTF-8 文本：{}（{error}）", body_path.display())
        })
    })
    .await
    .map_err(|error| format!("历史正文读取任务异常终止，请重试。（{error}）"))?
}

// 设置数据库由 sql 插件落在 app_config_dir，历史落在 app_data_dir；
// Windows 上两者同为 %APPDATA%\{identifier}，但仍分别取真实路径下发，不靠假设。
const SETTINGS_DB_FILE: &str = "settings.db";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct StorageStats {
    database_path: String,
    database_bytes: u64,
    history_path: String,
    history_bytes: u64,
    history_count: usize,
    history_limit: usize,
}

// 历史目录平铺存放，只累加文件本身，不递归子目录
fn directory_bytes(directory: &Path) -> u64 {
    let Ok(entries) = fs::read_dir(directory) else {
        return 0;
    };
    entries
        .filter_map(|entry| entry.ok())
        .filter_map(|entry| entry.metadata().ok())
        .filter(|metadata| metadata.is_file())
        .map(|metadata| metadata.len())
        .sum()
}

// WAL 模式下 -wal/-shm 也真实占盘，漏掉它们会把占用报小
fn database_bytes(path: &Path) -> u64 {
    let mut total = 0;
    for suffix in ["", "-wal", "-shm"] {
        let mut name = path.as_os_str().to_os_string();
        name.push(suffix);
        if let Ok(metadata) = fs::metadata(&name) {
            total += metadata.len();
        }
    }
    total
}

#[tauri::command]
pub async fn storage_stats(app: tauri::AppHandle) -> Result<StorageStats, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let config_dir = app
            .path()
            .app_config_dir()
            .map_err(|error| format!("无法定位应用配置目录：{error}"))?;
        let database_path = config_dir.join(SETTINGS_DB_FILE);
        let history_path = history_dir(&app)?;
        Ok(StorageStats {
            database_path: database_path.display().to_string(),
            database_bytes: database_bytes(&database_path),
            history_path: history_path.display().to_string(),
            history_bytes: directory_bytes(&history_path),
            history_count: list_metas(&history_path).unwrap_or_default().len(),
            history_limit: HISTORY_LIMIT,
        })
    })
    .await
    .map_err(|error| format!("存储统计任务异常终止，请重试。（{error}）"))?
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(label: &str) -> PathBuf {
        let directory = std::env::temp_dir().join(format!("kbc-storage-{label}-{}", new_record_id()));
        fs::create_dir_all(&directory).expect("创建临时目录");
        directory
    }

    #[test]
    fn directory_bytes_sums_flat_files_and_ignores_subdirectories() {
        let directory = temp_dir("flat");
        fs::write(directory.join("a.md"), vec![0u8; 120]).unwrap();
        fs::write(directory.join("b.meta.json"), vec![0u8; 30]).unwrap();
        let nested = directory.join("nested");
        fs::create_dir(&nested).unwrap();
        fs::write(nested.join("big.md"), vec![0u8; 9_999]).unwrap();

        assert_eq!(directory_bytes(&directory), 150);

        let _ = fs::remove_dir_all(&directory);
    }

    #[test]
    fn directory_bytes_is_zero_when_the_directory_does_not_exist() {
        let missing = std::env::temp_dir().join(format!("kbc-storage-absent-{}", new_record_id()));
        assert_eq!(directory_bytes(&missing), 0);
    }

    #[test]
    fn database_bytes_counts_wal_and_shm_sidecars() {
        let directory = temp_dir("db");
        let database = directory.join(SETTINGS_DB_FILE);
        fs::write(&database, vec![0u8; 4_096]).unwrap();
        fs::write(database.with_file_name("settings.db-wal"), vec![0u8; 512]).unwrap();
        fs::write(database.with_file_name("settings.db-shm"), vec![0u8; 32]).unwrap();
        // 同名前缀的无关文件不该被算进来
        fs::write(database.with_file_name("settings.db-journal"), vec![0u8; 7_777]).unwrap();

        assert_eq!(database_bytes(&database), 4_640);

        let _ = fs::remove_dir_all(&directory);
    }

    #[test]
    fn database_bytes_is_zero_before_the_first_write() {
        let directory = temp_dir("empty");
        assert_eq!(database_bytes(&directory.join(SETTINGS_DB_FILE)), 0);
        let _ = fs::remove_dir_all(&directory);
    }
}
