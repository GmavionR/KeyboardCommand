use std::sync::atomic::{AtomicIsize, Ordering};
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

static LAST_FOREGROUND_WINDOW: AtomicIsize = AtomicIsize::new(0);

#[repr(C)]
pub struct COPYDATASTRUCT {
    pub dw_data: usize,
    pub cb_data: u32,
    pub lp_data: *mut std::ffi::c_void,
}

/// 记录当前系统前台活动窗口句柄（在悬浮窗获取焦点前调用）
pub fn capture_current_foreground_window() {
    #[cfg(windows)]
    unsafe {
        let hwnd = windows_sys::Win32::UI::WindowsAndMessaging::GetForegroundWindow();
        if !hwnd.is_null() {
            LAST_FOREGROUND_WINDOW.store(hwnd as isize, Ordering::SeqCst);
        }
    }
}

/// 模拟发送 Ctrl+V 按键
#[cfg(windows)]
unsafe fn simulate_ctrl_v() {
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
        keybd_event, KEYEVENTF_KEYUP, VK_CONTROL,
    };
    const VK_V: u8 = 0x56;

    unsafe {
        // 按下 Ctrl
        keybd_event(VK_CONTROL as u8, 0, 0, 0);
        // 按下 V
        keybd_event(VK_V, 0, 0, 0);
        // 释放 V
        keybd_event(VK_V, 0, KEYEVENTF_KEYUP, 0);
        // 释放 Ctrl
        keybd_event(VK_CONTROL as u8, 0, KEYEVENTF_KEYUP, 0);
    }
}

/// 恢复原窗口焦点、写入剪贴板、模拟 Ctrl+V 粘贴、并在 400ms 后自动还原原剪贴板内容
pub fn paste_snippet_to_active_window(
    app: &AppHandle,
    content: &str,
    restore_clipboard: bool,
) -> Result<(), String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;

    let target_hwnd_isize = LAST_FOREGROUND_WINDOW.load(Ordering::SeqCst);

    // 备份原有剪贴板文本
    let original_clipboard_text = if restore_clipboard {
        app.clipboard().read_text().ok()
    } else {
        None
    };

    // 写入新提示词到剪贴板
    app.clipboard()
        .write_text(content.to_string())
        .map_err(|e| format!("写入剪贴板失败: {e}"))?;

    // 切回目标前台窗口
    #[cfg(windows)]
    if target_hwnd_isize != 0 {
        unsafe {
            use windows_sys::Win32::Foundation::HWND;
            use windows_sys::Win32::UI::WindowsAndMessaging::{
                BringWindowToTop, SetForegroundWindow,
            };
            let hwnd: HWND = target_hwnd_isize as HWND;
            SetForegroundWindow(hwnd);
            BringWindowToTop(hwnd);
        }
    }

    // 稍作微小延迟以确保目标窗口已经获得输入焦点，然后触发 Ctrl+V
    let content_to_send = content.to_string();
    let app_handle = app.clone();

    std::thread::spawn(move || {
        // 等待 80ms 确保窗口焦点与上下文切换就绪
        std::thread::sleep(Duration::from_millis(80));

        #[cfg(windows)]
        unsafe {
            simulate_ctrl_v();
        }

        // 如果需要还原原剪贴板，等待 400ms（等待目标应用消化完 WM_PASTE）后还原
        if let Some(prev_text) = original_clipboard_text {
            std::thread::sleep(Duration::from_millis(400));
            // 只有当剪贴板仍然是我们刚才写入的内容时才还原，避免冲掉用户在这 400ms 期间的新复制
            if let Ok(current_text) = app_handle.clipboard().read_text() {
                if current_text == content_to_send {
                    let _ = app_handle.clipboard().write_text(prev_text);
                }
            }
        }
    });

    Ok(())
}

/// 为指定窗口挂载 WM_COPYDATA 消息拦截子类过程 (Subclass)
#[cfg(windows)]
pub fn setup_wm_copydata_listener(window: &tauri::WebviewWindow) {
    use windows_sys::Win32::Foundation::{HWND, LPARAM, LRESULT, WPARAM};
    use windows_sys::Win32::UI::Shell::{DefSubclassProc, SetWindowSubclass};
    use windows_sys::Win32::UI::WindowsAndMessaging::WM_COPYDATA;

    let hwnd_raw = match window.hwnd() {
        Ok(h) => h.0 as HWND,
        Err(_) => return,
    };

    unsafe extern "system" fn subclass_proc(
        hwnd: HWND,
        msg: u32,
        wparam: WPARAM,
        lparam: LPARAM,
        _uid_subclass: usize,
        dw_ref_data: usize,
    ) -> LRESULT {
        if msg == WM_COPYDATA {
            let p_copy_data = lparam as *const COPYDATASTRUCT;
            if !p_copy_data.is_null() {
                unsafe {
                    let data_ptr = (*p_copy_data).lp_data as *const u8;
                    let data_len = (*p_copy_data).cb_data as usize;
                    if !data_ptr.is_null() && data_len > 0 {
                        let slice = std::slice::from_raw_parts(data_ptr, data_len);
                        // 尝试以 UTF-8 解析 JSON
                        if let Ok(text) = std::str::from_utf8(slice) {
                            let trimmed = text.trim_end_matches('\0').trim();
                            // 调度应用处理
                            let app_ptr = dw_ref_data as *const AppHandle;
                            if !app_ptr.is_null() {
                                let app = &*app_ptr;
                                handle_wm_copydata_payload(app, trimmed);
                                return 1; // 成功处理
                            }
                        }
                    }
                }
            }
        }
        unsafe { DefSubclassProc(hwnd, msg, wparam, lparam) }
    }

    let app_handle = Box::into_raw(Box::new(window.app_handle().clone()));
    unsafe {
        SetWindowSubclass(
            hwnd_raw,
            Some(subclass_proc),
            1001, // unique subclass id
            app_handle as usize,
        );
    }
}

/// 解析并执行 WM_COPYDATA 发来的控制指令
fn handle_wm_copydata_payload(app: &AppHandle, payload_str: &str) {
    if let Ok(json) = serde_json::from_str::<serde_json::Value>(payload_str) {
        let action = json.get("action").and_then(|v| v.as_str()).unwrap_or("");
        let mode = json.get("mode").and_then(|v| v.as_str()).unwrap_or("command");

        match action {
            "show" | "open" | "show_picker" | "picker" => {
                let target_mode = match mode {
                    "prompts" | "snippets" => "prompts",
                    "blank" => "blank",
                    _ => "command",
                };
                let _ = app.emit("picker-mode-switch", target_mode);
                let _ = crate::show_palette_window_with_mode(app, target_mode);
            }
            "hide" | "close" => {
                if let Some(palette) = app.get_webview_window("command-palette") {
                    let _ = palette.hide();
                }
            }
            "toggle" => {
                if let Some(palette) = app.get_webview_window("command-palette") {
                    if palette.is_visible().unwrap_or(false) {
                        let _ = palette.hide();
                    } else {
                        let target_mode = match mode {
                            "prompts" | "snippets" => "prompts",
                            "blank" => "blank",
                            _ => "command",
                        };
                        let _ = app.emit("picker-mode-switch", target_mode);
                        let _ = crate::show_palette_window_with_mode(app, target_mode);
                    }
                }
            }
            "navigate" | "route" => {
                let route = json.get("route").and_then(|v| v.as_str()).unwrap_or("/folder-copy");
                if let Some(main_win) = app.get_webview_window("main") {
                    let _ = main_win.show();
                    let _ = main_win.unminimize();
                    let _ = main_win.set_focus();
                }
                let _ = app.emit("navigate-to-route", route);
            }
            _ => {
                let target_mode = match mode {
                    "prompts" | "snippets" => "prompts",
                    "blank" => "blank",
                    _ => "command",
                };
                let _ = app.emit("picker-mode-switch", target_mode);
                let _ = crate::show_palette_window_with_mode(app, target_mode);
            }
        }
    } else {
        // 如果不是 JSON，作为简易文本命令处理
        match payload_str {
            "prompts" | "prompt-picker" | "snippets" => {
                let _ = app.emit("picker-mode-switch", "prompts");
                let _ = crate::show_palette_window_with_mode(app, "prompts");
            }
            "blank" => {
                let _ = app.emit("picker-mode-switch", "blank");
                let _ = crate::show_palette_window_with_mode(app, "blank");
            }
            "palette" | "command" | "show" => {
                let _ = app.emit("picker-mode-switch", "command");
                let _ = crate::show_palette_window_with_mode(app, "command");
            }
            "hide" | "close" => {
                if let Some(palette) = app.get_webview_window("command-palette") {
                    let _ = palette.hide();
                }
            }
            "toggle" => {
                crate::handle_palette_toggle(app);
            }
            _ => {
                let _ = app.emit("picker-mode-switch", "command");
                let _ = crate::show_palette_window_with_mode(app, "command");
            }
        }
    }
}
