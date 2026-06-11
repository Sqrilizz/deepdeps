import { AnalysisResult } from '../types';

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
  if (s >= 70) return 'text-green-400';
  if (s >= 40) return 'text-yellow-400';
  return 'text-red-400';
}

function healthBar(s: number): string {
  if (s >= 70) return 'bg-green-400';
  if (s >= 40) return 'bg-yellow-400';
  return 'bg-red-400';
}

export default function Dashboard({ data, onReanalyze }: Props) {
  const explosion = data.total_deps / Math.max(data.direct_deps, 1);

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Dashboard</h2>
          <p className="text-gray-500 text-sm mt-1">
            {data.project_name} · {data.ecosystem} ·{' '}
            {new Date(data.timestamp).toLocaleString()}
          </p>
        </div>
        <button
          onClick={onReanalyze}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
        >
          Re-analyze
        </button>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 mb-8">
        <h3 className="text-lg font-semibold text-gray-300 mb-4 text-center">
          Dependency Explosion
        </h3>
        <div className="flex items-center justify-center gap-6">
          <div className="text-center">
            <div className="text-5xl font-bold text-blue-400">{data.direct_deps}</div>
            <div className="text-sm text-gray-500 mt-1">Installed</div>
          </div>
          <div className="text-3xl text-gray-600">→</div>
          <div className="text-center">
            <div className="text-5xl font-bold text-red-400">{data.total_deps}</div>
            <div className="text-sm text-gray-500 mt-1">Actually Installed</div>
          </div>
        </div>
        <p className="text-center text-gray-500 text-sm mt-4">
          {explosion.toFixed(1)}x explosion factor · {data.max_depth} levels deep
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Lines of Code" value={formatNum(data.total_loc)} color="text-green-400" />
        <StatCard label="Total Files" value={formatNum(data.total_files)} />
        <StatCard label="Total Size" value={formatSize(data.total_size)} />
        <StatCard label="Max Depth" value={`${data.max_depth}`} />
        <HealthCard label="Health Score" value={Math.round(data.health_score)} color={healthColor(data.health_score)} bar={healthBar(data.health_score)} />
        <StatCard label="Unused Code" value={`${data.unused_code_percentage.toFixed(0)}%`} color="text-yellow-400" />
        <StatCard label="Known CVEs" value={`${data.cve_count}`} color={data.cve_count > 0 ? 'text-red-400' : 'text-green-400'} />
        <StatCard label="High Risk Packages" value={`${data.high_risk_packages}`} color={data.high_risk_packages > 0 ? 'text-red-400' : ''} />
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h3 className="font-semibold">Dependencies</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs uppercase tracking-wider">
                <th className="text-left p-3">Package</th>
                <th className="text-left p-3">Version</th>
                <th className="text-left p-3">Depth</th>
                <th className="text-left p-3">Size</th>
                <th className="text-left p-3">Health</th>
                <th className="text-left p-3">Risk</th>
              </tr>
            </thead>
            <tbody>
              {data.packages.map((pkg) => (
                <tr key={`${pkg.name}-${pkg.version}`} className="border-t border-gray-800 hover:bg-gray-800/50">
                  <td className="p-3">
                    <span className={pkg.direct ? 'text-blue-400' : 'text-gray-400'}>
                      {pkg.direct ? '● ' : '○ '}
                    </span>
                    {pkg.name}
                  </td>
                  <td className="p-3 text-gray-400">{pkg.version}</td>
                  <td className="p-3 text-gray-400">{pkg.depth}</td>
                  <td className="p-3 text-gray-400">
                    {pkg.installed_size ? formatSize(pkg.installed_size) : '-'}
                  </td>
                  <td className="p-3">
                    <span className={healthColor(pkg.health_score ?? 0)}>
                      {pkg.health_score ? `${Math.round(pkg.health_score)}` : '-'}
                    </span>
                  </td>
                  <td className="p-3">
                    <RiskBadge level={pkg.risk_level} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
      <div className={`text-2xl font-bold ${color || 'text-blue-400'}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

function HealthCard({ label, value, color, bar }: { label: string; value: number; color: string; bar: string }) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
      <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${bar}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function RiskBadge({ level }: { level: string | null }) {
  if (!level) return null;
  const colors: Record<string, string> = {
    Low: 'bg-green-900 text-green-300',
    Medium: 'bg-yellow-900 text-yellow-300',
    High: 'bg-red-900 text-red-300',
    Critical: 'bg-red-950 text-red-200',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[level] || 'bg-gray-800 text-gray-400'}`}>
      {level}
    </span>
  );
}
