import { View, AnalysisResult } from "../types";

interface Props {
  view: View;
  onViewChange: (v: View) => void;
  data: AnalysisResult | null;
}

const navItems: { id: View; label: string; icon: string; shortcut?: string }[] =
  [
    { id: "dashboard", label: "Dashboard", icon: "⊞", shortcut: "1" },
    { id: "galaxy", label: "Galaxy", icon: "✦", shortcut: "2" },
    { id: "security", label: "Security", icon: "◈", shortcut: "3" },
    { id: "usage", label: "Usage", icon: "▣", shortcut: "4" },
    { id: "licenses", label: "Licenses", icon: "©", shortcut: "5" },
    { id: "reports", label: "Reports", icon: "📄", shortcut: "6" },
    { id: "settings", label: "Settings", icon: "⚙", shortcut: "7" },
  ];

export default function Sidebar({ view, onViewChange, data }: Props) {
  return (
    <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-lg font-bold">
          <span className="text-blue-400">Deep</span>
          <span className="text-gray-300">Deps</span>
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">Dependency Analysis</p>
      </div>

      <nav className="flex-1 py-2">
        {navItems.map((item) => {
          const active = view === item.id;
          const isDanger = item.id === "security" && data && data.cve_count > 0;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all ${
                active
                  ? "bg-blue-600/10 text-blue-400 border-r-2 border-blue-400"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
              }`}
            >
              <span className="w-5 text-center">{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
              {isDanger && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse-dot" />
              )}
              {item.shortcut && (
                <span className="text-[10px] text-gray-600 border border-gray-700 rounded px-1">
                  {item.shortcut}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {data && (
        <div className="p-4 border-t border-gray-800">
          <p className="text-xs text-gray-500 truncate">{data.project_name}</p>
          <p className="text-xs text-gray-600">
            {data.total_deps} deps · {data.ecosystem}
          </p>
        </div>
      )}
    </aside>
  );
}
