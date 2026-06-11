import { AnalysisResult } from '../types';

interface Props {
  data: AnalysisResult;
}

export default function UsageAnalysis({ data }: Props) {
  const sorted = [...data.packages]
    .filter((p) => p.installed_size !== null)
    .sort((a, b) => (b.installed_size ?? 0) - (a.installed_size ?? 0));

  const totalSize = data.total_size;

  return (
    <div className="max-w-5xl">
      <h2 className="text-2xl font-bold text-white mb-6">Usage Analysis</h2>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-300 mb-2">Code Usage Estimate</h3>
        <div className="flex items-end gap-3 mb-2">
          <div className="text-4xl font-bold text-yellow-400">{data.unused_code_percentage.toFixed(0)}%</div>
          <div className="text-gray-500 mb-1">estimated unused code</div>
        </div>
        <p className="text-gray-500 text-sm">
          Of the {data.total_loc.toLocaleString()} lines of code installed across {data.total_deps} packages,
          most projects only use a small fraction of available APIs.
        </p>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="font-semibold">Package Weight Breakdown</h3>
          <span className="text-xs text-gray-500">Sorted by size</span>
        </div>
        <div className="p-4 space-y-2">
          {sorted.slice(0, 20).map((pkg) => {
            const pct = totalSize > 0 ? ((pkg.installed_size ?? 0) / totalSize) * 100 : 0;
            return (
              <div key={pkg.name} className="flex items-center gap-3">
                <div className="w-40 truncate text-sm text-gray-300">
                  <span className={pkg.direct ? 'text-blue-400' : ''}>{pkg.name}</span>
                </div>
                <div className="flex-1 h-4 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${Math.max(pct, 0.5)}%` }}
                  />
                </div>
                <div className="w-20 text-right text-xs text-gray-500">
                  {formatSize(pkg.installed_size ?? 0)}
                </div>
                <div className="w-12 text-right text-xs text-gray-600">
                  {pct.toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-300 mb-4">Dead Weight Detector</h3>
        {sorted.filter((p) => p.installed_size !== null && p.installed_size! > 500000).length === 0 ? (
          <p className="text-gray-500 text-sm">No oversized packages detected</p>
        ) : (
          <div className="space-y-3">
            {sorted.filter((p) => p.installed_size !== null && p.installed_size! > 500000).slice(0, 10).map((pkg) => (
              <div key={pkg.name} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <div>
                  <span className="text-white">{pkg.name}</span>
                  <span className="text-gray-500 ml-2">v{pkg.version}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-yellow-400">{formatSize(pkg.installed_size ?? 0)}</div>
                  <div className="text-xs text-gray-600">Consider lighter alternatives</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} KB`;
  return `${bytes} B`;
}
