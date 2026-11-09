import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { FolderCopyPage } from "./App";

const rootRoute = createRootRoute({ component: Outlet });

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
