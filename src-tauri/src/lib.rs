use serde::Serialize;
use tauri::{Emitter, Manager, State};

const DEFAULT_ROUTE: &str = "/folder-copy";

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ActivationRequest {
    route: Option<String>,
    error: Option<String>,
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let initial_request = parse_activation_args(std::env::args().skip(1));

    tauri::Builder::default()
        .manage(initial_request)
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
        .invoke_handler(tauri::generate_handler![initial_activation])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
