import React from 'react';
import {
  Sliders,
  CheckCircle2,
  XCircle,
  Search,
  FolderTree,
  Settings,
  History,
  HelpCircle,
  Monitor,
  Smartphone,
  FolderX,
  Copy,
} from 'lucide-react';

export type DesignStatePreset =
  | 'normal'
  | 'search_over10'
  | 'search_empty'
  | 'empty_selection'
  | 'empty_folder'
  | 'empty_history'
  | 'large_dir'
  | 'copy_failure_dialog'
  | 'history_partial_fail'
  | 'settings_open'
  | 'copy_single_file';

interface StatePresetBarProps {
  currentPreset: DesignStatePreset;
  onSelectPreset: (preset: DesignStatePreset) => void;
  showHelp: boolean;
  onToggleHelp: () => void;
  viewportMode: 'standard' | 'narrow';
  onToggleViewportMode: (mode: 'standard' | 'narrow') => void;
}

export const StatePresetBar: React.FC<StatePresetBarProps> = ({
  currentPreset,
  onSelectPreset,
  showHelp,
  onToggleHelp,
  viewportMode,
  onToggleViewportMode,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const presets: { id: DesignStatePreset; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'normal',
      label: '1. 正常状态',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
      desc: '基准状态：2/3 文件树 + 1/3 辅助面板 (当前选择与复制历史切换)',
    },
    {
      id: 'search_over10',
      label: '2. 搜索>10条',
      icon: <Search className="w-3.5 h-3.5 text-amber-400" />,
      desc: '搜索单占一行，真实 fd 结果过多时提示“结果过多，请输入更准确的路径”',
    },
    {
      id: 'search_empty',
      label: '3. 搜索无结果',
      icon: <Search className="w-3.5 h-3.5 text-slate-400" />,
      desc: '搜索词无匹配时提示“没有搜索到”',
    },
    {
      id: 'empty_selection',
      label: '4. 空选择',
      icon: <FolderTree className="w-3.5 h-3.5 text-indigo-400" />,
      desc: '没有选中文件时禁用复制按钮',
    },
    {
      id: 'empty_folder',
      label: '5. 空目录',
      icon: <FolderX className="w-3.5 h-3.5 text-slate-400" />,
      desc: '空文件夹/无符合规则文件的明确空状态',
    },
    {
      id: 'empty_history',
      label: '6. 无历史记录',
      icon: <History className="w-3.5 h-3.5 text-slate-400" />,
      desc: '无复制历史记录时的明确空状态视图',
    },
    {
      id: 'large_dir',
      label: '7. 大目录分页',
      icon: <FolderTree className="w-3.5 h-3.5 text-sky-400" />,
      desc: '展开超过阈值的大目录，首批30项分批追加',
    },
    {
      id: 'copy_failure_dialog',
      label: '8. 复制失败',
      icon: <XCircle className="w-3.5 h-3.5 text-rose-400" />,
      desc: '读取失败取消整次复制，弹窗列出失败路径和原因，保留勾选',
    },
    {
      id: 'history_partial_fail',
      label: '9. 历史重读',
      icon: <History className="w-3.5 h-3.5 text-purple-400" />,
      desc: '按磁盘当前内容重读首条历史，失败文件自动忽略并提示',
    },
    {
      id: 'settings_open',
      label: '10. 设置弹窗',
      icon: <Settings className="w-3.5 h-3.5 text-cyan-400" />,
      desc: '4个纵向分区、独立恢复默认值、大目录正整数校验与SQLite持久化',
    },
    {
      id: 'copy_single_file',
      label: '11. 右键复制单文件',
      icon: <Copy className="w-3.5 h-3.5 text-blue-400" />,
      desc: '树中右键可选文件点击“仅复制当前文件”，生成单文件包并存入历史，不改变已有勾选状态',
    },
  ];

  const currentPresetItem = presets.find((p) => p.id === currentPreset) || presets[0];

  if (isCollapsed) {
    return (
      <div className="bg-slate-100 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 px-3 py-1 flex items-center justify-between text-[11px] transition-colors">
        <div className="flex items-center space-x-2">
          <span className="flex items-center space-x-1 text-slate-500 dark:text-slate-400">
            <Sliders className="w-3 h-3 text-blue-500" />
            <span>当前状态:</span>
          </span>
          <span className="font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
            {currentPresetItem.icon}
            <span>{currentPresetItem.label}</span>
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:inline">
            · {viewportMode === 'standard' ? '1280×800 标准分栏 (2/3 : 1/3)' : '窄窗口单面板'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onToggleViewportMode(viewportMode === 'standard' ? 'narrow' : 'standard')}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 px-1.5 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="切换 1280x800 双栏 / 窄窗口单面板"
          >
            {viewportMode === 'standard' ? '切换窄窗口' : '切换标准双栏'}
          </button>
          <button
            onClick={() => setIsCollapsed(false)}
            className="flex items-center space-x-1 px-2 py-0.5 bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-700 text-[10px] font-medium transition-colors cursor-pointer shadow-2xs"
            title="展开 11 种状态快捷评测工具条"
          >
            <span>展开评测状态 (11)</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs transition-colors duration-150">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300 font-medium shrink-0">
          <Sliders className="w-4 h-4 text-blue-500 dark:text-blue-400" />
          <span className="text-slate-800 dark:text-slate-200">交互状态验证:</span>
        </div>

        {/* Viewport Layout Mode Switcher (1280x800 vs Narrow Window) */}
        <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 rounded-md p-0.5 text-[11px] shadow-2xs">
          <button
            onClick={() => onToggleViewportMode('standard')}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded transition-all cursor-pointer ${
              viewportMode === 'standard'
                ? 'bg-blue-600 text-white font-medium shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="基准模式：左右分栏 (文件树占 2/3，辅助面板占 1/3)"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>1280×800 标准左右分栏 (2/3 : 1/3)</span>
          </button>

          <button
            onClick={() => onToggleViewportMode('narrow')}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded transition-all cursor-pointer ${
              viewportMode === 'narrow'
                ? 'bg-blue-600 text-white font-medium shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="窄窗口自适应模式：单面板切换 (文件树 / 当前选择 / 复制历史)"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>窄窗口单面板切换</span>
          </button>
        </div>
      </div>

      <div className="flex items-center flex-wrap gap-1">
        {presets.map((preset) => {
          const isActive = currentPreset === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset.id)}
              title={preset.desc}
              className={`flex items-center space-x-1 px-2 py-1 rounded text-[11px] font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30 ring-1 ring-blue-400'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-800 shadow-2xs'
              }`}
            >
              {preset.icon}
              <span>{preset.label}</span>
            </button>
          );
        })}

        <button
          onClick={onToggleHelp}
          className={`flex items-center space-x-1 px-2 py-1 rounded text-[11px] border transition-colors shadow-2xs cursor-pointer ${
            showHelp
              ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700/80 text-amber-900 dark:text-amber-200'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          title="查看设计规范与规则依据"
        >
          <HelpCircle className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
          <span>布局决议</span>
        </button>

        <button
          onClick={() => setIsCollapsed(true)}
          className="px-2 py-1 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
          title="收起状态条以获得最纯粹的桌面应用体验"
        >
          收起
        </button>
      </div>
    </div>
  );
};

