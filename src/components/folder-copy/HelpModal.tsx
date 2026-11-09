import React from 'react';
import { X, BookOpen, Monitor, Settings, Copy } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh] text-slate-800 dark:text-slate-100">
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-amber-100 dark:bg-amber-600/20 text-amber-600 dark:text-amber-400 rounded-lg border border-amber-200 dark:border-amber-500/30">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                确定文件夹复制页面的控件布局（最终决议对照）
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                对应 issue 32 决议与 UI 绘制标准
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-3.5 text-xs text-slate-600 dark:text-slate-300">
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50 dark:bg-slate-950/40 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-blue-600 dark:text-blue-400">
              <Monitor className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              <span>1. 主页面布局与 1280×800 画布</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              • 页面标题统一使用“<strong className="text-slate-900 dark:text-slate-200">文件夹内容复制</strong>”，搜索输入框单独占一行。<br />
              • 主工作区采用左右分栏：<strong className="text-slate-900 dark:text-slate-200">文件树约占 2/3</strong>，<strong className="text-slate-900 dark:text-slate-200">辅助面板约占 1/3</strong>。<br />
              • 辅助面板提供“<strong className="text-slate-900 dark:text-slate-200">当前选择</strong>”和“<strong className="text-slate-900 dark:text-slate-200">复制历史</strong>”两个视图，首次进入时默认显示“当前选择”。<br />
              • 窗口变窄无法舒适分栏时，工作区自动/可切换为“<strong className="text-slate-900 dark:text-slate-200">文件树 / 当前选择 / 复制历史</strong>”单面板切换；底部复制操作始终固定可见。
            </p>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50 dark:bg-slate-950/40 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-emerald-600 dark:text-emerald-400">
              <Copy className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <span>2. 选择、空状态与复制按钮</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              • 页面底部固定显示已选文件数量及复制按钮，文案确定为“<strong className="text-slate-900 dark:text-slate-200">复制文件上下文包</strong>”。<br />
              • 没有选中文件时严格禁用复制按钮。<br />
              • 当前选择列表中每个文件项均提供直接移除按钮 <code className="text-slate-800 dark:text-slate-200 bg-slate-200 dark:bg-slate-800 px-1 rounded">✕</code>，移除后同步更新树与已选数量。<br />
              • 为“空文件夹/无符合规则文件”、“无选择文件”和“无历史记录”视图提供明确的空状态指引。<br />
              • 复制失败整次取消，弹窗列出失败路径和原因，保留原有勾选。
            </p>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50 dark:bg-slate-950/40 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-cyan-600 dark:text-cyan-400">
              <Settings className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
              <span>3. 设置弹窗与阈值输入校验</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              • 设置使用单一可滚动弹窗，按“<strong className="text-slate-900 dark:text-slate-200">文件白名单</strong>”“<strong className="text-slate-900 dark:text-slate-200">文件排除规则</strong>”“<strong className="text-slate-900 dark:text-slate-200">忽略目录</strong>”“<strong className="text-slate-900 dark:text-slate-200">大目录阈值</strong>”纵向分区。<br />
              • <strong className="text-amber-700 dark:text-amber-300">每个分区提供独立的“恢复默认值”操作</strong>，只恢复该分区，不影响其他设置。<br />
              • <strong className="text-rose-700 dark:text-rose-300">大目录阈值只接受正整数</strong>：空值、零、负数或小数在输入框旁实时显示错误提示，并禁用保存按钮，直至输入有效。<br />
              • 保持 SQLite 读写失败模拟反馈（issue 34）。
            </p>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50 dark:bg-slate-950/40 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-purple-600 dark:text-purple-400">
              <Copy className="w-4 h-4 text-purple-500 dark:text-purple-400" />
              <span>4. 树中右键菜单“仅复制当前文件”规则（最新决议）</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              • <strong className="text-slate-900 dark:text-slate-200">仅对可选文件节点显示</strong>右键菜单“仅复制当前文件”，目录与忽略节点不显示。<br />
              • 执行后，<strong className="text-slate-900 dark:text-slate-200">只读取并复制右键所在文件</strong>，生成单文件文件上下文包，沿用现有格式。<br />
              • 按普通复制流程<strong className="text-slate-900 dark:text-slate-200">新增一条历史记录</strong>并复制到剪贴板。<br />
              • <strong className="text-emerald-700 dark:text-emerald-300 font-medium">操作绝对不改变当前已有的文件或文件夹选择勾选状态</strong>。
            </p>
          </div>
        </div>

        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-medium cursor-pointer transition-colors"
          >
            返回界面
          </button>
        </div>
      </div>
    </div>
  );
};
