import { AnalysisResult } from './types';

const BASE = '/api';

export async function getLatestAnalysis(): Promise<AnalysisResult | null> {
  const res = await fetch(`${BASE}/analysis`);
  const data = await res.json();
  if (data.error) return null;
  return data;
}

export async function triggerAnalyze(path?: string): Promise<AnalysisResult> {
  const res = await fetch(`${BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: path || '.' }),
  });
  return res.json();
}
