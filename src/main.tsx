import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  setActivationNotice,
  ActivationRequest,
} from "./activation";
import { installBrowserMenuPolicy } from "./data/browserMenuPolicy";
import { router } from "./router";
import { ThemeProvider } from "./context/ThemeContext";
import { initMainWindowDispatcher } from "./commands/dispatcher";
import { configureIdleDestroyDelay } from "./data/systemStatus";

const supportedRoutes = new Set(["/folder-copy", "/prompts"]);

installBrowserMenuPolicy();

async function applyActivationRequest(request: ActivationRequest) {
  if (request.route && supportedRoutes.has(request.route)) {
    await router.navigate({ to: request.route as "/folder-copy" | "/prompts" });
    setActivationNotice(request.error);
    return;
  }

  if (request.error) setActivationNotice(request.error);
}

// 立即同步挂载 React 根节点，避免因任何异步 IPC 阻塞导致窗口白屏
const rootEl = document.getElementById("root");
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </React.StrictMode>,
  );
}

async function bootstrap() {
  const currentWindow = getCurrentWindow();
  const isMainWindow = currentWindow.label === "main";

  if (isMainWindow) {
    void configureIdleDestroyDelay().catch((error) => {
      console.error("Failed to configure idle destroy delay:", error);
    });

    let isBooting = true;
    const pendingRequests: ActivationRequest[] = [];

    try {
      await listen<ActivationRequest>("activation-request", ({ payload }) => {
        if (isBooting) {
          pendingRequests.push(payload);
        } else {
          void applyActivationRequest(payload);
        }
      });
    } catch (err) {
      console.error("Failed to listen for activation-request:", err);
    }

    // 初始化主窗口专属事件调度器（路由跳转、打开文件夹对话框、打开系统/功能设置）
    try {
      await initMainWindowDispatcher();
    } catch (err) {
      console.error("Failed to initMainWindowDispatcher:", err);
    }

    // 记录最新访问的功能路由，以便 WebView 空闲重建后无缝恢复
    router.subscribe("onResolved", ({ toLocation }) => {
      if (toLocation.pathname !== "/palette" && toLocation.pathname !== "/") {
        try {
          localStorage.setItem("kbc_last_route", toLocation.pathname);
        } catch (_) {}
      }
    });

    try {
      const initialRequest = await invoke<ActivationRequest>("initial_activation");
      await applyActivationRequest(initialRequest);
    } catch (err) {
      console.error("Failed to fetch initial_activation:", err);
    }

    for (const request of pendingRequests) {
      await applyActivationRequest(request);
    }
    isBooting = false;
  }
}

void bootstrap();
