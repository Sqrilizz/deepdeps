# DeepDeps 🔍

**See what you're really installing.**

DeepDeps is a dependency analysis tool that shows you not just what you declared in your manifest, but everything that actually gets installed — the full dependency tree, sizes, known CVEs, health scores, and more.

```bash
npm install -g deepdeps
# or
cargo install --git https://github.com/Sqrilizz/deepdeps
```

---

## Features

### 📊 Dependency Analysis
```bash
deepdeps analyze           # current directory
deepdeps analyze ./my-app  # specific path
deepdeps analyze --format json  # machine-readable output
```

Shows total dependency count, explosion factor, largest packages, health score, CVEs, and more.

### 🌳 Dependency Tree (fast path, < 1 sec)
```bash
deepdeps tree
```

Recursive ASCII tree with full nesting. No HTTP calls — runs instantly.

### 🔒 Security
```bash
deepdeps security                 # latest analysis
deepdeps security <analysis_id>   # specific analysis
```

Checks packages against **OSV API** (Open Source Vulnerabilities) and **GitHub Advisory Database**.

### 📄 Reports
```bash
deepdeps report                # HTML report (~/.deepdeps/reports/)
deepdeps report --format md    # Markdown
deepdeps report --format json  # JSON
deepdeps report --output report.html
```

### ↔️ Diff
```bash
deepdeps diff <id1> <id2>
```

Compare two analyses — see added, removed, and updated packages.

### 🖥️ Web UI
```bash
deepdeps ui
# => http://localhost:3030
```

Interactive dashboard with D3 force-directed dependency graph, security center, license analysis, and settings.

---

## Supported Ecosystems

| Ecosystem | Manifests | Resolver |
|---|---|---|
| **Node.js** | `package.json` + `package-lock.json` | npm registry |
| **Python** | `pyproject.toml`, `requirements.txt` | pip |
| **Rust** | `Cargo.toml` + `Cargo.lock` | crates.io |
| **Go** | `go.mod` + `go.sum` | Go modules |
| **Maven** | `pom.xml` | Maven Central |
| **NuGet** | `*.csproj`, `packages.lock.json` | NuGet |

---

## CLI

```
Usage: deepdeps <COMMAND>

Commands:
  analyze   Analyze dependencies in a project
  tree      Show dependency tree (fast, no HTTP)
  diff      Compare two analyses
  security  Show security vulnerabilities
  report    Generate a dependency report
  ui        Open the interactive web UI
  help      Print help
```

---

## Example Output

```
$ deepdeps analyze

  Project: my-awesome-app
  Ecosystem: Node.js
  Timestamp: 2025-06-11T10:00:00Z

  ┌─ Dependency Explosion ─────────────────────┐
  │                                             │
  │     5 installed → 243 actually installed    │
  │     Explosion factor: 48.6x                 │
  │                                             │
  └─────────────────────────────────────────────┘

  Total LOC:         845000
  Total Files:       5670
  Total Size:        42.5 MB
  Health Score:      72
  Known CVEs:        3
  High Risk Packages: 1
  Unused Code Estimate: 96%

  Dependencies: 5 direct, 243 total, max depth 7

  ⚠  3 known vulnerabilities found
  ⚠  1 high-risk packages detected

  Largest packages:
    ● next 14.0.4 (25.0 MB)
    ○ @swc/core 1.3.100 (8.5 MB)
    ○ typescript 5.3.0 (4.5 MB)
```

```
$ deepdeps tree

  └── next@14.0.4
      ├── @swc/helpers@0.5.2
      ├── caniuse-lite@1.0.300015 (already listed)
      ├── postcss@8.4.33
      │   ├── nanoid@3.3.7
      │   └── source-map-js@1.0.2
      ├── react@18.2.0
      └── styled-jsx@5.1.1
          └── client-only@0.0.1
```

---

## Per-Package Metrics

- **Health Score** (0–100): security + maintenance + bus factor + stability
- **Risk Level**: Low / Medium / High / Critical
- **Bus Factor**: number of maintainers
- **Installed Size**: disk footprint
- **License**: license type
- **CVE**: known vulnerabilities
- **LOC**: estimated lines of code

---

## Architecture

```
deepdeps/
├── src/
│   ├── main.rs          # CLI entry point
│   ├── cli.rs           # Command definitions (clap)
│   ├── analyzer.rs      # Analysis orchestration
│   ├── resolver.rs      # Ecosystem-specific resolvers
│   ├── models.rs        # Data models
│   ├── db.rs            # SQLite storage
│   ├── server.rs        # Axum API server
│   ├── tree.rs          # ASCII tree renderer
│   ├── report.rs        # HTML/MD/JSON report generator
│   ├── security.rs      # CVE checking (OSV + GitHub)
│   ├── weight.rs        # Package size & metadata
│   ├── health.rs        # Health score calculation
│   └── risk.rs          # Risk assessment
├── npm/
│   ├── package.json     # npm publish config
│   ├── install.js       # Platform-specific binary downloader
│   ├── platforms.json   # OS/arch mapping
│   └── bin/deepdeps.js  # JS wrapper for binary
├── ui/
│   ├── src/             # React + TypeScript
│   └── ...              # Vite + Tailwind
└── .github/workflows/
    └── release.yml      # Multi-platform release + npm publish
```

---

## Development

```bash
# Build
cargo build --release

# UI
cd ui && npm install && npm run build

# Full cycle
cargo build --release && ./target/release/deepdeps analyze
```

---

## License

MIT
