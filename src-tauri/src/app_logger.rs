use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

const MAX_LOG_SIZE: u64 = 2 * 1024 * 1024; // 2MB
const LIFECYCLE_LOG_FILENAME: &str = "lifecycle.log";

/// 获取应用程序日志存储目录（若不存在则自动创建）
pub fn get_app_log_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_log_dir()
        .or_else(|_| {
            app.path()
                .app_data_dir()
                .map(|p| p.join("logs"))
        })
        .map_err(|e| format!("无法定位日志目录：{e}"))?;

    if !dir.exists() {
        let _ = fs::create_dir_all(&dir);
    }
    Ok(dir)
}

/// 格式化写入生命周期日志
pub fn log_lifecycle_event(app: &AppHandle, event: &str, details: &str) {
    let Ok(dir) = get_app_log_dir(app) else {
        return;
    };
    let log_file = dir.join(LIFECYCLE_LOG_FILENAME);

    // 检查并做简易轮转（>2MB 时重命名为 .1.log）
    if let Ok(metadata) = fs::metadata(&log_file) {
        if metadata.len() >= MAX_LOG_SIZE {
            let backup_file = dir.join("lifecycle.1.log");
            let _ = fs::remove_file(&backup_file);
            let _ = fs::rename(&log_file, &backup_file);
        }
    }

    let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f").to_string();
    let line = format!("[{timestamp}] [LIFECYCLE] [{event}] {details}\n");

    #[cfg(debug_assertions)]
    eprint!("{line}");

    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&log_file) {
        let _ = file.write_all(line.as_bytes());
    }
}

/// 查询日志目录绝对路径供前端展示
#[tauri::command]
pub fn get_log_dir(app: AppHandle) -> Result<String, String> {
    let dir = get_app_log_dir(&app)?;
    Ok(dir.display().to_string())
}

/// 在系统文件管理器中打开日志目录
#[tauri::command]
pub fn open_log_dir(app: AppHandle) -> Result<(), String> {
    let dir = get_app_log_dir(&app)?;
    #[cfg(windows)]
    {
        use std::process::Command;
        Command::new("explorer")
            .arg(dir.as_os_str())
            .spawn()
            .map_err(|e| format!("打开日志目录失败：{e}"))?;
        Ok(())
    }
    #[cfg(not(windows))]
    {
        let _ = dir;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn format_log_line_structure() {
        let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f").to_string();
        let event = "WINDOW_DESTROYED";
        let details = "WebView 已销毁释放工作集";
        let line = format!("[{timestamp}] [LIFECYCLE] [{event}] {details}\n");
        assert!(line.contains("[LIFECYCLE]"));
        assert!(line.contains("[WINDOW_DESTROYED]"));
        assert!(line.contains(details));
    }
}
