import { ThemeProvider } from "./context/ThemeContext";
import PlaygroundFolderCopyApp from "./FolderCopyApp";
import "./index.css";

/**
 * The playground UI stays isolated behind this page entry point. Its data and
 * clipboard behavior are mock implementations that later Rust tickets replace.
 */
export function FolderCopyPage() {
  return (
    <ThemeProvider>
      <PlaygroundFolderCopyApp />
    </ThemeProvider>
  );
}
