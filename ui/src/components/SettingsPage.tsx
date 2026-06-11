export default function SettingsPage() {
  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-4">
        <h3 className="font-semibold text-white mb-4">Analysis</h3>
        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-200">Auto-detect manifest</div>
              <div className="text-xs text-gray-500">Automatically find package.json, Cargo.toml, etc.</div>
            </div>
            <div className="w-10 h-5 bg-blue-600 rounded-full relative cursor-pointer">
              <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5" />
            </div>
          </label>

          <label className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-200">Security checks</div>
              <div className="text-xs text-gray-500">Check for CVEs during analysis</div>
            </div>
            <div className="w-10 h-5 bg-blue-600 rounded-full relative cursor-pointer">
              <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5" />
            </div>
          </label>
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-4">
        <h3 className="font-semibold text-white mb-4">Display</h3>
        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-200">Dark mode</div>
              <div className="text-xs text-gray-500">Always enabled in this version</div>
            </div>
            <div className="w-10 h-5 bg-blue-600 rounded-full relative cursor-pointer">
              <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5" />
            </div>
          </label>
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h3 className="font-semibold text-white mb-4">About</h3>
        <div className="text-sm text-gray-400 space-y-1">
          <p>DeepDeps v0.1.0</p>
          <p>See what you're really installing.</p>
          <p className="text-gray-600 mt-2">Built for Hack Club Stardance.</p>
        </div>
      </div>
    </div>
  );
}
