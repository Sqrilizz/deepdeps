import { AnalysisResult } from '../types';

interface Props {
  data: AnalysisResult;
}

export default function ReportsPage({ data }: Props) {
  const reportUrl = `/report-${data.id.slice(0, 8)}.html`;

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold text-white mb-6">Reports</h2>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <a
          href={reportUrl}
          className="bg-gray-900 rounded-xl border border-gray-800 p-6 hover:border-blue-500 transition-colors block"
        >
          <div className="text-3xl mb-2">📄</div>
          <h3 className="font-semibold text-white mb-1">HTML Report</h3>
          <p className="text-xs text-gray-500">Full dependency analysis with visualizations</p>
        </a>

        <button
          onClick={() => downloadJson(data)}
          className="bg-gray-900 rounded-xl border border-gray-800 p-6 hover:border-blue-500 transition-colors text-left"
        >
          <div className="text-3xl mb-2">{'{ }'}</div>
          <h3 className="font-semibold text-white mb-1">JSON Export</h3>
          <p className="text-xs text-gray-500">Machine-readable analysis data</p>
        </button>

        <button
          onClick={() => downloadMarkdown(data)}
          className="bg-gray-900 rounded-xl border border-gray-800 p-6 hover:border-blue-500 transition-colors text-left"
        >
          <div className="text-3xl mb-2">#</div>
          <h3 className="font-semibold text-white mb-1">Markdown Report</h3>
          <p className="text-xs text-gray-500">Simple text-based summary</p>
        </button>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h3 className="font-semibold text-white mb-4">Project Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <InfoRow label="Project" value={data.project_name} />
          <InfoRow label="Ecosystem" value={data.ecosystem} />
          <InfoRow label="Analysis ID" value={data.id.slice(0, 8) + '...'} />
          <InfoRow label="Timestamp" value={new Date(data.timestamp).toLocaleString()} />
          <InfoRow label="Total Dependencies" value={`${data.total_deps}`} />
          <InfoRow label="Health Score" value={`${Math.round(data.health_score)}`} />
          <InfoRow label="Known CVEs" value={`${data.cve_count}`} />
          <InfoRow label="High Risk" value={`${data.high_risk_packages}`} />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-200">{value}</span>
    </div>
  );
}

function downloadJson(data: AnalysisResult) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `deepdeps-report-${data.id.slice(0, 8)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadMarkdown(data: AnalysisResult) {
  const lines: string[] = [];
  lines.push(`# DeepDeps Report: ${data.project_name}`);
  lines.push('');
  lines.push(`**Ecosystem:** ${data.ecosystem}`);
  lines.push(`**Timestamp:** ${data.timestamp}`);
  lines.push(`**Analysis ID:** ${data.id}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Direct Dependencies: ${data.direct_deps}`);
  lines.push(`- Total Dependencies: ${data.total_deps}`);
  lines.push(`- Max Depth: ${data.max_depth}`);
  lines.push(`- Total LOC: ${data.total_loc.toLocaleString()}`);
  lines.push(`- Health Score: ${Math.round(data.health_score)}`);
  lines.push(`- Known CVEs: ${data.cve_count}`);
  lines.push(`- High Risk Packages: ${data.high_risk_packages}`);

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `deepdeps-report-${data.id.slice(0, 8)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
