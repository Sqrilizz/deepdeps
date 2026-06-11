import { AnalysisResult } from '../types';

interface Props {
  data: AnalysisResult;
}

export default function SecurityCenter({ data }: Props) {
  const vulnPackages = data.packages.filter((p) => p.vulnerabilities.length > 0);
  const highRisk = data.packages.filter(
    (p) => p.risk_level === 'High' || p.risk_level === 'Critical'
  );

  return (
    <div className="max-w-5xl">
      <h2 className="text-2xl font-bold text-white mb-6">Security Center</h2>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <div className={`text-3xl font-bold ${data.cve_count > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {data.cve_count}
          </div>
          <div className="text-sm text-gray-500 mt-1">Known Vulnerabilities</div>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <div className={`text-3xl font-bold ${highRisk.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {highRisk.length}
          </div>
          <div className="text-sm text-gray-500 mt-1">High Risk Packages</div>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <div className="text-3xl font-bold text-blue-400">{vulnPackages.length}</div>
          <div className="text-sm text-gray-500 mt-1">Affected Packages</div>
        </div>
      </div>

      {vulnPackages.length === 0 ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 text-center">
          <p className="text-green-400 text-lg">✓ No known vulnerabilities found</p>
          <p className="text-gray-500 text-sm mt-1">All packages appear to be secure</p>
        </div>
      ) : (
        vulnPackages.map((pkg) => (
          <div key={pkg.name} className="bg-gray-900 rounded-xl border border-gray-800 mb-4 overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white">{pkg.name}</span>
                <span className="text-gray-500 ml-2">v{pkg.version}</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                pkg.risk_level === 'Critical' ? 'bg-red-950 text-red-200' :
                pkg.risk_level === 'High' ? 'bg-red-900 text-red-300' :
                'bg-yellow-900 text-yellow-300'
              }`}>
                {pkg.risk_level}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs uppercase tracking-wider">
                    <th className="text-left p-3">CVE</th>
                    <th className="text-left p-3">Severity</th>
                    <th className="text-left p-3">Summary</th>
                    <th className="text-left p-3">Fixed In</th>
                  </tr>
                </thead>
                <tbody>
                  {pkg.vulnerabilities.map((v) => (
                    <tr key={v.id} className="border-t border-gray-800">
                      <td className="p-3 font-mono text-red-400 text-xs">{v.id}</td>
                      <td className="p-3">
                        <SeverityBadge severity={v.severity} />
                      </td>
                      <td className="p-3 text-gray-300 max-w-md truncate">{v.summary}</td>
                      <td className="p-3 text-gray-400">{v.patched_versions || 'None'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {highRisk.filter((p) => p.vulnerabilities.length === 0).length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-white mb-4">Other Risk Factors</h3>
          {highRisk.filter((p) => p.vulnerabilities.length === 0).map((pkg) => (
            <div key={pkg.name} className="bg-gray-900 rounded-xl border border-gray-800 p-4 mb-2 flex justify-between items-center">
              <div>
                <span className="text-white">{pkg.name}</span>
                <span className="text-gray-500 ml-2">v{pkg.version}</span>
                <span className="text-gray-600 ml-2 text-xs">
                  Bus factor: {pkg.bus_factor ?? '?'} ·
                  Score: {pkg.health_score ? Math.round(pkg.health_score) : '?'}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-900 text-red-300">
                {pkg.risk_level}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    Critical: 'bg-red-950 text-red-200',
    High: 'bg-red-900 text-red-300',
    Medium: 'bg-yellow-900 text-yellow-300',
    Low: 'bg-blue-900 text-blue-300',
    None: 'bg-gray-800 text-gray-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[severity] || colors.None}`}>
      {severity}
    </span>
  );
}
