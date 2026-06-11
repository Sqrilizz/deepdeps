import { AnalysisResult } from '../types';

interface Props {
  data: AnalysisResult;
}

export default function LicenseAnalysis({ data }: Props) {
  const total = data.licenses.reduce((s, l) => s + l.count, 0);
  const hasGpl = data.licenses.some((l) => l.name.includes('GPL'));

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold text-white mb-6">License Analysis</h2>

      {hasGpl && (
        <div className="bg-red-950 border border-red-500 rounded-xl p-4 mb-6">
          <p className="font-semibold text-red-300">⚠ GPL dependency detected</p>
          <p className="text-red-400 text-sm mt-1">Review license compatibility before using this project commercially</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {data.licenses.map((lic) => (
          <div key={lic.name} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="text-2xl font-bold text-blue-400">{lic.count}</div>
            <div className="text-sm text-gray-300 mt-1">{lic.name}</div>
            <div className="text-xs text-gray-600 mt-0.5">
              {total > 0 ? ((lic.count / total) * 100).toFixed(1) : 0}% of packages
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h3 className="font-semibold">License Distribution</h3>
        </div>
        <div className="p-4 space-y-3">
          {data.licenses.map((lic) => {
            const pct = total > 0 ? (lic.count / total) * 100 : 0;
            return (
              <div key={lic.name} className="flex items-center gap-4">
                <div className="w-24 text-sm text-gray-300">{lic.name}</div>
                <div className="flex-1 h-5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: lic.name.includes('GPL')
                        ? 'linear-gradient(90deg, #f85149, #b91c1c)'
                        : lic.name === 'MIT'
                        ? 'linear-gradient(90deg, #58a6ff, #1d4ed8)'
                        : 'linear-gradient(90deg, #3fb950, #15803d)',
                    }}
                  />
                </div>
                <div className="w-16 text-right text-sm text-gray-400">{lic.count}</div>
                <div className="w-12 text-right text-xs text-gray-600">{pct.toFixed(0)}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {data.licenses.length === 0 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 text-center">
          <p className="text-gray-400">No license information available</p>
          <p className="text-gray-600 text-sm mt-1">Package metadata did not include license data</p>
        </div>
      )}
    </div>
  );
}
