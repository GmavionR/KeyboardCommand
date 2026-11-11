import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import {
  setActivationNotice,
  ActivationRequest,
} from "./activation";
import { installBrowserMenuPolicy } from "./data/browserMenuPolicy";
import { router } from "./router";

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
  let isBooting = true;
  const pendingRequests: ActivationRequest[] = [];

  await listen<ActivationRequest>("activation-request", ({ payload }) => {
    if (isBooting) {
      pendingRequests.push(payload);
    } else {
      void applyActivationRequest(payload);
    }
  });

  const initialRequest = await invoke<ActivationRequest>("initial_activation");
  await applyActivationRequest(initialRequest);
  for (const request of pendingRequests) {
    await applyActivationRequest(request);
  }
  isBooting = false;

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>,
  );
}

void bootstrap();
