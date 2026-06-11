import { useState, useEffect } from 'react';
import { AnalysisResult, View } from './types';
import { getLatestAnalysis, triggerAnalyze } from './api';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Galaxy from './components/Galaxy';
import SecurityCenter from './components/SecurityCenter';
import UsageAnalysis from './components/UsageAnalysis';
import LicenseAnalysis from './components/LicenseAnalysis';
import ReportsPage from './components/ReportsPage';
import SettingsPage from './components/SettingsPage';

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      let result = await getLatestAnalysis();
      if (!result) {
        result = await triggerAnalyze();
      }
      setData(result);
    } catch (e) {
      setError('Failed to load analysis data');
    }
    setLoading(false);
  }

  async function handleReanalyze() {
    setLoading(true);
    setError(null);
    try {
      const result = await triggerAnalyze();
      setData(result);
    } catch (e) {
      setError('Analysis failed');
    }
    setLoading(false);
  }

  function renderView() {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4" />
            <p className="text-gray-400">Analyzing dependencies...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <button onClick={loadData} className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">
              Retry
            </button>
          </div>
        </div>
      );
    }

    if (!data) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-400">No analysis data available</p>
        </div>
      );
    }

    switch (view) {
      case 'dashboard':
        return <Dashboard data={data} onReanalyze={handleReanalyze} />;
      case 'galaxy':
        return <Galaxy data={data} />;
      case 'security':
        return <SecurityCenter data={data} />;
      case 'usage':
        return <UsageAnalysis data={data} />;
      case 'licenses':
        return <LicenseAnalysis data={data} />;
      case 'reports':
        return <ReportsPage data={data} />;
      case 'settings':
        return <SettingsPage />;
    }
  }

  return (
    <div className="flex h-screen bg-gray-950">
      <Sidebar view={view} onViewChange={setView} data={data} />
      <main className="flex-1 overflow-auto p-6">
        {renderView()}
      </main>
    </div>
  );
}
