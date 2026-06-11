import { useState, useEffect } from "react";

function useSetting<T>(key: string, defaultValue: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(`deepdeps:${key}`);
      return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(`deepdeps:${key}`, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

function Toggle({
  enabled,
  onChange,
  label,
  desc,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc: string;
}) {
  return (
    <label className="flex items-center justify-between py-2 group cursor-pointer">
      <div>
        <div className="text-sm text-gray-200 group-hover:text-white transition-colors">
          {label}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
      </div>
      <div
        onClick={() => onChange(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0 ml-4 ${
          enabled ? "bg-blue-600" : "bg-gray-700"
        }`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
            enabled ? "left-[22px]" : "left-0.5"
          }`}
        />
      </div>
    </label>
  );
}

function Input({
  value,
  onChange,
  label,
  desc,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  desc?: string;
  placeholder?: string;
}) {
  return (
    <div className="py-2">
      <div className="text-sm text-gray-200">{label}</div>
      {desc && <div className="text-xs text-gray-500 mt-0.5 mb-2">{desc}</div>}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors mt-1"
      />
    </div>
  );
}

export default function SettingsPage() {
  const [autoDetect, setAutoDetect] = useSetting("auto-detect", true);
  const [securityChecks, setSecurityChecks] = useSetting(
    "security-checks",
    true,
  );
  const [treeDepth, setTreeDepth] = useSetting("tree-depth", 10);
  const [defaultPath, setDefaultPath] = useSetting("default-path", ".");
  const [cleared, setCleared] = useState(false);

  const handleClearCache = () => {
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith("deepdeps:"),
    );
    keys.forEach((k) => localStorage.removeItem(k));
    setAutoDetect(true);
    setSecurityChecks(true);
    setTreeDepth(10);
    setDefaultPath(".");
    setCleared(true);
    setTimeout(() => setCleared(false), 2000);
  };

  return (
    <div className="max-w-4xl animate-fade-in">
      <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>

      <div className="space-y-4">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h3 className="font-semibold text-white mb-2">Analysis</h3>
          <p className="text-xs text-gray-500 mb-4">
            Preferences are saved to localStorage
          </p>
          <div className="divide-y divide-gray-800">
            <Toggle
              enabled={autoDetect}
              onChange={setAutoDetect}
              label="Auto-detect manifest"
              desc="Automatically find package.json, Cargo.toml, pyproject.toml, etc."
            />
            <Toggle
              enabled={securityChecks}
              onChange={setSecurityChecks}
              label="Security checks"
              desc="Check for CVEs during analysis (requires network)"
            />
            <Input
              value={String(treeDepth)}
              onChange={(v) => setTreeDepth(Number(v))}
              label="Default tree depth"
              desc="Maximum depth shown in the dependency tree"
              placeholder="10"
            />
            <Input
              value={defaultPath}
              onChange={setDefaultPath}
              label="Default analysis path"
              placeholder="."
            />
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h3 className="font-semibold text-white mb-4">Display</h3>
          <div className="divide-y divide-gray-800">
            <Toggle
              enabled={true}
              onChange={() => {}}
              label="Dark mode"
              desc="Always enabled in this version"
            />
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h3 className="font-semibold text-white mb-4">Cache</h3>
          <p className="text-xs text-gray-500 mb-4">
            Clear all locally stored settings
          </p>
          <button
            onClick={handleClearCache}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${
              cleared
                ? "bg-green-600 text-white"
                : "bg-red-600/20 text-red-400 border border-red-800 hover:bg-red-600/30"
            }`}
          >
            {cleared ? "✓ Settings cleared" : "Clear all settings"}
          </button>
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h3 className="font-semibold text-white mb-2">About</h3>
          <div className="text-sm text-gray-400 space-y-1">
            <p>DeepDeps v0.1.0</p>
            <p>See what you're really installing.</p>
            <p className="text-gray-600 mt-2">
              Built with Rust + React + D3 ·{" "}
              <a
                href="https://github.com/Sqrilizz/deepdeps"
                className="text-blue-400 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
