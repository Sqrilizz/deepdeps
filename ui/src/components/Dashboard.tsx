import { useState, useMemo } from "react";
import { AnalysisResult, Package } from "../types";

interface Props {
  data: AnalysisResult;
  onReanalyze: () => void;
}

function formatSize(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

function healthColor(s: number): string {
  if (s >= 70) return "text-green-400";
  if (s >= 40) return "text-yellow-400";
  return "text-red-400";
}

function healthBar(s: number): string {
  if (s >= 70) return "bg-green-400";
  if (s >= 40) return "bg-yellow-400";
  return "bg-red-400";
}

type SortKey = "name" | "version" | "depth" | "size" | "health" | "risk";
type SortDir = "asc" | "desc";

export default function Dashboard({ data, onReanalyze }: Props) {
  const explosion = data.total_deps / Math.max(data.direct_deps, 1);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("depth");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortable = (key: SortKey, label: string) => (
    <th
      className={`p-3 text-left text-xs uppercase tracking-wider sortable ${sortKey === key ? sortDir : ""}`}
      onClick={() => toggleSort(key)}
    >
      {label}
    </th>
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let pkgs: Package[] = q
      ? data.packages.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.version.toLowerCase().includes(q),
        )
      : data.packages;

    pkgs.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "version":
          cmp = a.version.localeCompare(b.version);
          break;
        case "depth":
          cmp = a.depth - b.depth;
          break;
        case "size":
          cmp = (a.installed_size ?? 0) - (b.installed_size ?? 0);
          break;
        case "health":
          cmp = (a.health_score ?? 0) - (b.health_score ?? 0);
          break;
        case "risk": {
          const rank = { Critical: 4, High: 3, Medium: 2, Low: 1 };
          cmp =
            (rank[a.risk_level as keyof typeof rank] ?? 0) -
            (rank[b.risk_level as keyof typeof rank] ?? 0);
          break;
        }
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return pkgs;
  }, [data.packages, search, sortKey, sortDir]);

  const transitiveCount = data.total_deps - data.direct_deps;
  const donutPct =
    data.total_deps > 0 ? (data.direct_deps / data.total_deps) * 100 : 0;
  const donutCircumference = 2 * Math.PI * 40;
  const donutOffset =
    donutCircumference - (donutPct / 100) * donutCircumference;

  return (
    <div className="max-w-6xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Dashboard</h2>
          <p className="text-gray-500 text-sm mt-1">
            {data.project_name} · {data.ecosystem} ·{" "}
            {new Date(data.timestamp).toLocaleString()}
          </p>
        </div>
        <button
          onClick={onReanalyze}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg text-sm transition-all"
        >
          Re-analyze
        </button>
      </div>

      {/* Explosion Card */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 md:p-8 mb-6">
        <h3 className="text-lg font-semibold text-gray-300 mb-6 text-center">
          Dependency Explosion
        </h3>
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10">
          {/* Donut chart */}
          <div className="relative w-28 h-28 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#1f2937"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="8"
                strokeDasharray={donutCircumference}
                strokeDashoffset={donutOffset}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#ef4444"
                strokeWidth="8"
                strokeDasharray={donutCircumference}
                strokeDashoffset={0}
                strokeLinecap="round"
                opacity={0.15}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-blue-400">
                {data.total_deps}
              </span>
            </div>
          </div>

          {/* Numbers */}
          <div className="flex items-center gap-6 md:gap-10">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-blue-400">
                {data.direct_deps}
              </div>
              <div className="text-xs text-gray-500 mt-1">Direct</div>
            </div>
            <div className="text-2xl text-gray-600">→</div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-red-400">
                {transitiveCount}
              </div>
              <div className="text-xs text-gray-500 mt-1">Transitive</div>
            </div>
          </div>
        </div>
        <p className="text-center text-gray-500 text-sm mt-4">
          {explosion.toFixed(1)}x explosion factor · {data.max_depth} levels
          deep
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 stagger">
        <StatCard
          label="Total LOC"
          value={formatNum(data.total_loc)}
          color="text-green-400"
        />
        <StatCard label="Total Files" value={formatNum(data.total_files)} />
        <StatCard label="Total Size" value={formatSize(data.total_size)} />
        <StatCard label="Max Depth" value={`${data.max_depth}`} />
        <HealthCard
          label="Health Score"
          value={Math.round(data.health_score)}
          color={healthColor(data.health_score)}
          bar={healthBar(data.health_score)}
        />
        <StatCard
          label="Unused Code"
          value={`${data.unused_code_percentage.toFixed(0)}%`}
          color="text-yellow-400"
        />
        <StatCard
          label="Known CVEs"
          value={`${data.cve_count}`}
          color={data.cve_count > 0 ? "text-red-400" : "text-green-400"}
        />
        <StatCard
          label="High Risk"
          value={`${data.high_risk_packages}`}
          color={data.high_risk_packages > 0 ? "text-red-400" : ""}
        />
      </div>

      {/* Packages Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="font-semibold">
            Dependencies
            <span className="text-gray-500 font-normal ml-2">
              ({filtered.length})
            </span>
          </h3>
          <div className="relative w-full sm:w-64">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search packages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs uppercase tracking-wider">
                {sortable("name", "Package")}
                {sortable("version", "Version")}
                {sortable("depth", "Depth")}
                {sortable("size", "Size")}
                {sortable("health", "Health")}
                {sortable("risk", "Risk")}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    {search
                      ? `No packages matching "${search}"`
                      : "No dependencies found"}
                  </td>
                </tr>
              ) : (
                filtered.map((pkg) => (
                  <tr
                    key={`${pkg.name}-${pkg.version}`}
                    className="border-t border-gray-800 hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="p-3">
                      <span
                        className={
                          pkg.direct ? "text-blue-400" : "text-gray-400"
                        }
                      >
                        {pkg.direct ? "● " : "○ "}
                      </span>
                      {pkg.name}
                    </td>
                    <td className="p-3 text-gray-400 font-mono text-xs">
                      {pkg.version}
                    </td>
                    <td className="p-3">
                      <DepthBar depth={pkg.depth} maxDepth={data.max_depth} />
                    </td>
                    <td className="p-3 text-gray-400">
                      {pkg.installed_size
                        ? formatSize(pkg.installed_size)
                        : "-"}
                    </td>
                    <td className="p-3">
                      <span className={healthColor(pkg.health_score ?? 0)}>
                        {pkg.health_score
                          ? `${Math.round(pkg.health_score)}`
                          : "-"}
                      </span>
                    </td>
                    <td className="p-3">
                      <RiskBadge level={pkg.risk_level} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DepthBar({ depth, maxDepth }: { depth: number; maxDepth: number }) {
  const pct = maxDepth > 0 ? (depth / maxDepth) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-400 w-4 text-right">{depth}</span>
      <div className="flex-1 h-1 bg-gray-800 rounded-full max-w-16">
        <div
          className="h-full bg-gray-600 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
      <div className={`text-2xl font-bold ${color || "text-blue-400"}`}>
        {value}
      </div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

function HealthCard({
  label,
  value,
  color,
  bar,
}: {
  label: string;
  value: number;
  color: string;
  bar: string;
}) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
      <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${bar}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function RiskBadge({ level }: { level: string | null }) {
  if (!level) return null;
  const colors: Record<string, string> = {
    Low: "bg-green-900 text-green-300",
    Medium: "bg-yellow-900 text-yellow-300",
    High: "bg-red-900 text-red-300",
    Critical: "bg-red-950 text-red-200",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${colors[level] || "bg-gray-800 text-gray-400"}`}
    >
      {level}
    </span>
  );
}
