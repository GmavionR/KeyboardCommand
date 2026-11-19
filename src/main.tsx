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

async function bootstrap() {
  const currentWindow = getCurrentWindow();
  const isMainWindow = currentWindow.label === "main";

  if (isMainWindow) {
    let isBooting = true;
    const pendingRequests: ActivationRequest[] = [];

    await listen<ActivationRequest>("activation-request", ({ payload }) => {
      if (isBooting) {
        pendingRequests.push(payload);
      } else {
        void applyActivationRequest(payload);
      }
    });

    // 初始化主窗口专属事件调度器（路由跳转、打开文件夹对话框、打开系统/功能设置）
    await initMainWindowDispatcher();

    const initialRequest = await invoke<ActivationRequest>("initial_activation");
    await applyActivationRequest(initialRequest);
    for (const request of pendingRequests) {
      await applyActivationRequest(request);
    }
    isBooting = false;
  }

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </React.StrictMode>,
  );
}

void bootstrap();
