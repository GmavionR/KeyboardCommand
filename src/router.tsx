import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
  useLocation,
} from "@tanstack/react-router";
import { useSyncExternalStore } from "react";
import {
  getActivationNotice,
  subscribeActivationNotice,
} from "./activation";
import { FolderCopyPage } from "./App";

function RootLayout() {
  const notice = useSyncExternalStore(
    subscribeActivationNotice,
    getActivationNotice,
  );

  return (
    <>
      <Outlet />
      {notice && (
        <div
          role="alert"
          className="fixed bottom-16 left-1/2 z-[100] -translate-x-1/2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-xl"
        >
          {notice}
        </div>
      )}
    </>
  );
}

function PromptsPage() {
  const pathname = useLocation({ select: (location) => location.pathname });

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-8 text-slate-100">
      <section className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-2xl">
        <h1 className="text-2xl font-semibold">Prompts 页面路由验证</h1>
        <p className="mt-6 text-sm text-slate-400">当前页面 URL</p>
        <code className="mt-2 block rounded-lg bg-slate-950 px-4 py-3 font-mono text-lg text-cyan-300">
          {pathname}
        </code>
      </section>
    </main>
  );
}

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/folder-copy" });
  },
});

const folderCopyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/folder-copy",
  component: FolderCopyPage,
});

const promptsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/prompts",
  component: PromptsPage,
});

const routeTree = rootRoute.addChildren([indexRoute, folderCopyRoute, promptsRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
