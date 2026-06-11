#!/usr/bin/env node
const { join } = require('path');
const { spawnSync } = require('child_process');
const { existsSync } = require('fs');

const binaryName = process.platform === 'win32' ? 'deepdeps.exe' : 'deepdeps';
const binaryPath = join(__dirname, binaryName);

if (!existsSync(binaryPath)) {
  console.error('deepdeps binary not found. Run npm install to download it.');
  console.error('Or install from source: cargo install deepdeps');
  process.exit(1);
}

const result = spawnSync(binaryPath, process.argv.slice(2), {
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 1);
