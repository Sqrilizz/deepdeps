import { useState, useEffect, useCallback } from "react";
import { AnalysisResult, View } from "./types";
import { getLatestAnalysis, triggerAnalyze } from "./api";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import Galaxy from "./components/Galaxy";
import SecurityCenter from "./components/SecurityCenter";
import UsageAnalysis from "./components/UsageAnalysis";
import LicenseAnalysis from "./components/LicenseAnalysis";
import ReportsPage from "./components/ReportsPage";
import SettingsPage from "./components/SettingsPage";

const VIEW_ORDER: View[] = [
  "dashboard",
  "galaxy",
  "security",
  "usage",
  "licenses",
  "reports",
  "settings",
];

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      const num = parseInt(e.key);
      if (num >= 1 && num <= 7) {
        setView(VIEW_ORDER[num - 1]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
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
      setError("Failed to load analysis data");
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
      setError("Analysis failed");
    }
    setLoading(false);
  }

  const renderView = useCallback(() => {
    if (loading) {
      return <LoadingSkeleton />;
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-4xl mb-4">⚠</div>
            <p className="text-red-400 mb-2">{error}</p>
            <p className="text-gray-500 text-sm mb-4">
              Make sure the DeepDeps server is running
            </p>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    if (!data) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-4xl mb-4">📦</div>
            <p className="text-gray-400">No analysis data available</p>
            <p className="text-gray-600 text-sm mt-1">
              Run a project analysis first
            </p>
            <button
              onClick={handleReanalyze}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
            >
              Analyze project
            </button>
          </div>
        </div>
      );
    }

    switch (view) {
      case "dashboard":
        return <Dashboard data={data} onReanalyze={handleReanalyze} />;
      case "galaxy":
        return <Galaxy data={data} />;
      case "security":
        return <SecurityCenter data={data} />;
      case "usage":
        return <UsageAnalysis data={data} />;
      case "licenses":
        return <LicenseAnalysis data={data} />;
      case "reports":
        return <ReportsPage data={data} />;
      case "settings":
        return <SettingsPage />;
    }
  }, [view, data, loading, error]);

  return (
    <div className="flex h-screen bg-gray-950 select-none">
      <Sidebar view={view} onViewChange={setView} data={data} />
      <main className="flex-1 overflow-auto p-6" key={view}>
        {renderView()}
      </main>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-6xl animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-8 w-48 bg-gray-800 rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-gray-800 rounded mt-2 animate-pulse" />
        </div>
        <div className="h-9 w-28 bg-gray-800 rounded-lg animate-pulse" />
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 mb-6">
        <div className="h-5 w-40 bg-gray-800 rounded mx-auto mb-6 animate-pulse" />
        <div className="flex justify-center gap-10">
          <div className="w-20 h-20 bg-gray-800 rounded-full animate-pulse" />
          <div className="flex items-center gap-10">
            <div className="text-center">
              <div className="h-12 w-16 bg-gray-800 rounded mx-auto animate-pulse" />
              <div className="h-3 w-12 bg-gray-800 rounded mx-auto mt-2 animate-pulse" />
            </div>
            <div className="h-8 w-8 bg-gray-800 rounded animate-pulse" />
            <div className="text-center">
              <div className="h-12 w-16 bg-gray-800 rounded mx-auto animate-pulse" />
              <div className="h-3 w-12 bg-gray-800 rounded mx-auto mt-2 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="bg-gray-900 rounded-xl border border-gray-800 p-4"
          >
            <div className="h-8 w-16 bg-gray-800 rounded animate-pulse" />
            <div className="h-3 w-20 bg-gray-800 rounded mt-2 animate-pulse" />
          </div>
        ))}
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <div className="h-5 w-32 bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-800 rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
