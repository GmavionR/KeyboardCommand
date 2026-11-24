use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryStats {
    pub main_process_bytes: u64,
    pub child_processes_bytes: u64,
    pub total_bytes: u64,
    pub process_count: usize,
    pub timestamp: String,
}

#[cfg(windows)]
pub fn get_application_memory_stats() -> MemoryStats {
    use std::mem::size_of;
    use windows_sys::Win32::Foundation::{CloseHandle, INVALID_HANDLE_VALUE};
    use windows_sys::Win32::System::Diagnostics::ToolHelp::{
        CreateToolhelp32Snapshot, Process32First, Process32Next, PROCESSENTRY32, TH32CS_SNAPPROCESS,
    };
    use windows_sys::Win32::System::ProcessStatus::{GetProcessMemoryInfo, PROCESS_MEMORY_COUNTERS};
    use windows_sys::Win32::System::Threading::{
        GetCurrentProcess, GetCurrentProcessId, OpenProcess, PROCESS_QUERY_INFORMATION,
        PROCESS_VM_READ,
    };

    unsafe {
        let current_pid = GetCurrentProcessId();

        // 1. 主进程物理内存占用（WorkingSetSize）
        let mut main_bytes: u64 = 0;
        let main_handle = GetCurrentProcess();
        let mut pmc: PROCESS_MEMORY_COUNTERS = std::mem::zeroed();
        pmc.cb = size_of::<PROCESS_MEMORY_COUNTERS>() as u32;

        if GetProcessMemoryInfo(
            main_handle,
            &mut pmc,
            size_of::<PROCESS_MEMORY_COUNTERS>() as u32,
        ) != 0
        {
            main_bytes = pmc.WorkingSetSize as u64;
        }

        // 2. 统计 WebView2 渲染/工作子进程内存
        let mut child_bytes: u64 = 0;
        let mut process_count: usize = 1;

        let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if snapshot != INVALID_HANDLE_VALUE {
            let mut entry: PROCESSENTRY32 = std::mem::zeroed();
            entry.dwSize = size_of::<PROCESSENTRY32>() as u32;

            if Process32First(snapshot, &mut entry) != 0 {
                loop {
                    if entry.th32ParentProcessID == current_pid {
                        let child_handle = OpenProcess(
                            PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
                            0,
                            entry.th32ProcessID,
                        );
                        if !child_handle.is_null() {
                            let mut child_pmc: PROCESS_MEMORY_COUNTERS = std::mem::zeroed();
                            child_pmc.cb = size_of::<PROCESS_MEMORY_COUNTERS>() as u32;
                            if GetProcessMemoryInfo(
                                child_handle,
                                &mut child_pmc,
                                size_of::<PROCESS_MEMORY_COUNTERS>() as u32,
                            ) != 0
                            {
                                child_bytes += child_pmc.WorkingSetSize as u64;
                                process_count += 1;
                            }
                            CloseHandle(child_handle);
                        }
                    }
                    if Process32Next(snapshot, &mut entry) == 0 {
                        break;
                    }
                }
            }
            CloseHandle(snapshot);
        }

        let total_bytes = main_bytes + child_bytes;
        let timestamp = chrono::Local::now().format("%H:%M:%S").to_string();

        MemoryStats {
            main_process_bytes: main_bytes,
            child_processes_bytes: child_bytes,
            total_bytes,
            process_count,
            timestamp,
        }
    }
}

#[cfg(not(windows))]
pub fn get_application_memory_stats() -> MemoryStats {
    MemoryStats {
        main_process_bytes: 0,
        child_processes_bytes: 0,
        total_bytes: 0,
        process_count: 1,
        timestamp: chrono::Local::now().format("%H:%M:%S").to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_memory_stats_retrieval() {
        let stats = get_application_memory_stats();
        #[cfg(windows)]
        {
            assert!(stats.main_process_bytes > 0, "主进程内存必须大于0");
            assert!(stats.total_bytes >= stats.main_process_bytes);
            assert!(stats.process_count >= 1);
        }
    }
}
