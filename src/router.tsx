import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
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

const routeTree = rootRoute.addChildren([indexRoute, folderCopyRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
