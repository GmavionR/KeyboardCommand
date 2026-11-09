import "./App.css";

export function FolderCopyPage() {
  return (
    <main className="page">
      <header className="titlebar">
        <h1>文件夹内容复制</h1>
      </header>
      <section className="workspace" aria-label="文件夹内容复制工作区">
        <div className="toolbar">
          <button type="button">选择文件夹</button>
          <input aria-label="当前文件夹路径" readOnly placeholder="请选择一个文件夹" />
          <button type="button" aria-label="设置">设置</button>
        </div>
        <div className="panels">
          <section className="panel tree-panel">
            <h2>文件</h2>
            <p className="empty-state">选择文件夹后，这里会显示文件树。</p>
          </section>
          <section className="panel selection-panel">
            <h2>当前选择</h2>
            <p className="empty-state">尚未选择文件</p>
          </section>
        </div>
        <footer className="actionbar">
          <span>已选择 0 个文件</span>
          <button type="button" disabled>复制文件上下文包</button>
        </footer>
      </section>
    </main>
  );
}
