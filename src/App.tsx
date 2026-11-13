import { ThemeProvider } from "./context/ThemeContext";
import FolderCopyApp from "./FolderCopyApp";
import "./index.css";

export function FolderCopyPage() {
  return (
    <ThemeProvider>
      <FolderCopyApp />
    </ThemeProvider>
  );
}
