use clap::Parser;
use deepdeps::analyzer;
use deepdeps::cli::{Cli, Commands};
use deepdeps::db::Database;
use deepdeps::models::{DiffChange, DiffEntry, DiffResult};
use deepdeps::report;
use deepdeps::server;
use deepdeps::tree;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Analyze {
            path,
            name: _,
            format,
        } => {
            let target = path.unwrap_or_else(|| ".".to_string());
            println!("Analyzing dependencies in: {}", target);

            match analyzer::run_analysis(&target).await {
                Ok(result) => {
                    let db_path = Database::default_db_path();
                    if let Ok(db) = Database::new(&db_path) {
                        let _ = db.save_analysis(&result);
                    }

                    let fmt = format.as_deref().unwrap_or("table");
                    match fmt {
                        "json" => {
                            println!("{}", serde_json::to_string_pretty(&result)?);
                        }
                        _ => {
                            let explosion = result.dependency_explosion_factor();
                            println!();
                            println!("  {}: {}", "Project", result.project_name);
                            println!("  {}: {}", "Ecosystem", result.ecosystem.as_str());
                            println!("  {}: {}", "Timestamp", result.timestamp);
                            println!();
                            println!("  ┌─ Dependency Explosion ─────────────────────┐");
                            println!("  │                                            │");
                            println!(
                                "  │    {} installed → {} actually installed   │",
                                format_num(result.direct_deps),
                                format_num(result.total_deps)
                            );
                            println!("  │    Explosion factor: {:.1}x", explosion);
                            println!("  │                                            │");
                            println!("  └────────────────────────────────────────────┘");
                            println!();
                            println!("  {}: {}", "Total LOC", format_num(result.total_loc));
                            println!("  {}: {}", "Total Files", format_num(result.total_files));
                            println!("  {}: {}", "Total Size", format_size(result.total_size));
                            println!("  {}: {:.0}", "Health Score", result.health_score);
                            println!("  {}: {}", "Known CVEs", result.cve_count);
                            println!("  {}: {}", "High Risk Packages", result.high_risk_packages);
                            println!(
                                "  {}: {:.0}%",
                                "Unused Code Estimate", result.unused_code_percentage
                            );
                            println!();
                            println!(
                                "  Dependencies: {} direct, {} total, max depth {}",
                                result.direct_deps, result.total_deps, result.max_depth
                            );
                            println!();

                            if result.cve_count > 0 {
                                println!("  ⚠  {} known vulnerabilities found", result.cve_count);
                            }
                            if result.high_risk_packages > 0 {
                                println!(
                                    "  ⚠  {} high-risk packages detected",
                                    result.high_risk_packages
                                );
                            }

                            // Show top 10 packages by size if we have data
                            let mut sized: Vec<_> = result
                                .packages
                                .iter()
                                .filter(|p| p.installed_size.is_some())
                                .collect();
                            sized.sort_by(|a, b| b.installed_size.cmp(&a.installed_size));
                            if !sized.is_empty() {
                                println!();
                                println!("  Largest packages:");
                                for pkg in sized.iter().take(10) {
                                    let size = format_size(pkg.installed_size.unwrap());
                                    let direct = if pkg.direct { "●" } else { "○" };
                                    println!(
                                        "    {} {} v{} ({})",
                                        direct, pkg.name, pkg.version, size
                                    );
                                }
                            }

                            println!();
                            println!("  Run `deepdeps ui` to open interactive dashboard");
                            println!("  Run `deepdeps report` to generate a report");
                        }
                    }
                }
                Err(e) => {
                    eprintln!("Error: {}", e);
                    std::process::exit(1);
                }
            }
        }

        Commands::Security { target } => {
            let db_path = Database::default_db_path();
            let db = Database::new(&db_path)?;

            let analysis = if let Some(id) = target {
                db.get_analysis_by_id(&id)?
            } else {
                db.get_latest_analysis()?
            };

            match analysis {
                Some(a) => {
                    let packages = db.get_packages_for_analysis(&a.id)?;
                    let vuln_pkgs: Vec<_> = packages
                        .iter()
                        .filter(|p| {
                            p.risk_level.as_deref() == Some("High")
                                || p.risk_level.as_deref() == Some("Critical")
                        })
                        .collect();

                    println!("  Security Report: {}", a.project_name);
                    println!();
                    println!("  Total CVEs: {}", a.cve_count);
                    println!("  High Risk:  {}", a.high_risk_packages);

                    if vuln_pkgs.is_empty() && a.cve_count == 0 {
                        println!();
                        println!("  ✓ No vulnerabilities found");
                    } else {
                        println!();
                        for pkg in &vuln_pkgs {
                            println!(
                                "  ⚠  {} v{} ({})",
                                pkg.name,
                                pkg.version,
                                pkg.risk_level.as_deref().unwrap_or("Unknown")
                            );
                        }
                    }
                }
                None => {
                    println!("No analysis found. Run `deepdeps analyze` first.");
                }
            }
        }

        Commands::Report {
            target,
            format,
            output,
        } => {
            let db_path = Database::default_db_path();
            let db = Database::new(&db_path)?;

            let analysis = if let Some(id) = target {
                db.get_analysis_by_id(&id)?
            } else {
                db.get_latest_analysis()?
            };

            match analysis {
                Some(_) => {
                    // We need to rerun analysis to get full data
                    let path = ".";
                    match analyzer::run_analysis(path).await {
                        Ok(result) => {
                            let fmt = format.as_deref().unwrap_or("html");
                            let out = output.unwrap_or_default();
                            match report::write_report(&result, fmt, &out) {
                                Ok(path) => {
                                    println!("Report generated: {}", path);
                                }
                                Err(e) => {
                                    eprintln!("Error generating report: {}", e);
                                    std::process::exit(1);
                                }
                            }
                        }
                        Err(e) => {
                            eprintln!("Error: {}", e);
                            std::process::exit(1);
                        }
                    }
                }
                None => {
                    println!("No analysis found. Run `deepdeps analyze` first.");
                }
            }
        }

        Commands::Tree { target } => {
            let path = target.unwrap_or_else(|| ".".to_string());
            match analyzer::run_analysis_fast(&path).await {
                Ok(result) => {
                    let db_path = Database::default_db_path();
                    if let Ok(db) = Database::new(&db_path) {
                        let _ = db.save_analysis(&result);
                    }
                    println!("Dependency tree for: {}", result.project_name);
                    println!();
                    let tree_out = tree::render(&result);
                    if tree_out.is_empty() {
                        println!("  (no dependencies found)");
                    } else {
                        println!("{}", tree_out);
                    }
                }
                Err(e) => {
                    eprintln!("Error: {}", e);
                    std::process::exit(1);
                }
            }
        }

        Commands::Diff { id1, id2 } => {
            let db_path = Database::default_db_path();
            let db = Database::new(&db_path)?;

            let a1 = db.get_analysis_by_id(&id1)?;
            let a2 = db.get_analysis_by_id(&id2)?;

            match (a1, a2) {
                (Some(a1), Some(a2)) => {
                    let p1 = db.get_packages_for_analysis(&a1.id)?;
                    let p2 = db.get_packages_for_analysis(&a2.id)?;

                    let mut diff = DiffResult {
                        old_analysis_id: a1.id.clone(),
                        new_analysis_id: a2.id.clone(),
                        added: Vec::new(),
                        removed: Vec::new(),
                        changed: Vec::new(),
                    };

                    let map1: std::collections::HashMap<_, _> =
                        p1.iter().map(|p| (p.name.clone(), p)).collect();
                    let map2: std::collections::HashMap<_, _> =
                        p2.iter().map(|p| (p.name.clone(), p)).collect();

                    for pkg in &p2 {
                        if !map1.contains_key(&pkg.name) {
                            diff.added.push(DiffEntry {
                                change: DiffChange::Added,
                                name: pkg.name.clone(),
                                old_version: None,
                                new_version: Some(pkg.version.clone()),
                                old_size: None,
                                new_size: pkg.installed_size.map(|s| s as u64),
                            });
                        } else if let Some(old) = map1.get(&pkg.name) {
                            if old.version != pkg.version {
                                diff.changed.push(DiffEntry {
                                    change: DiffChange::Upgraded,
                                    name: pkg.name.clone(),
                                    old_version: Some(old.version.clone()),
                                    new_version: Some(pkg.version.clone()),
                                    old_size: old.installed_size.map(|s| s as u64),
                                    new_size: pkg.installed_size.map(|s| s as u64),
                                });
                            }
                        }
                    }

                    for pkg in &p1 {
                        if !map2.contains_key(&pkg.name) {
                            diff.removed.push(DiffEntry {
                                change: DiffChange::Removed,
                                name: pkg.name.clone(),
                                old_version: Some(pkg.version.clone()),
                                new_version: None,
                                old_size: pkg.installed_size.map(|s| s as u64),
                                new_size: None,
                            });
                        }
                    }

                    println!("Comparison: {} vs {}", a1.project_name, a2.project_name);
                    println!();

                    if !diff.added.is_empty() {
                        println!("  Added ({})", diff.added.len());
                        for e in &diff.added {
                            let size = e.new_size.map(|s| format_size(s)).unwrap_or_default();
                            println!(
                                "    + {}@{} ({})",
                                e.name,
                                e.new_version.as_deref().unwrap_or("?"),
                                size
                            );
                        }
                        println!();
                    }

                    if !diff.removed.is_empty() {
                        println!("  Removed ({})", diff.removed.len());
                        for e in &diff.removed {
                            let size = e.old_size.map(|s| format_size(s)).unwrap_or_default();
                            println!(
                                "    - {}@{} ({})",
                                e.name,
                                e.old_version.as_deref().unwrap_or("?"),
                                size
                            );
                        }
                        println!();
                    }

                    if !diff.changed.is_empty() {
                        println!("  Updated ({})", diff.changed.len());
                        for e in &diff.changed {
                            let size = e.old_size.map(|s| format_size(s)).unwrap_or_default();
                            println!(
                                "    ~ {}: {} → {} ({})",
                                e.name,
                                e.old_version.as_deref().unwrap_or("?"),
                                e.new_version.as_deref().unwrap_or("?"),
                                size
                            );
                        }
                        println!();
                    }

                    if diff.added.is_empty() && diff.removed.is_empty() && diff.changed.is_empty() {
                        println!("  No changes detected");
                    }
                }
                _ => {
                    println!("Could not find both analyses. Check the IDs.");
                }
            }
        }

        Commands::Ui {
            port,
            path: ui_path,
        } => {
            let ui_dir = find_ui_dir();
            let analyze_path = ui_path.unwrap_or_else(|| ".".to_string());

            println!("Running initial analysis (fast mode)...");
            let analyze_path2 = analyze_path.clone();
            match analyzer::run_analysis_fast(&analyze_path).await {
                Ok(result) => {
                    let db_path = Database::default_db_path();
                    if let Ok(db) = Database::new(&db_path) {
                        let _ = db.save_analysis(&result);
                    }
                    println!(
                        "Analysis complete: {} dependencies found",
                        result.total_deps
                    );
                }
                Err(e) => {
                    eprintln!("Warning: initial analysis failed: {}", e);
                }
            }

            server::start(port, ui_dir, Some(analyze_path2)).await?;
        }
    }

    Ok(())
}

fn find_ui_dir() -> String {
    // Check several locations for the UI build
    let candidates = [
        "./ui/dist",
        "../ui/dist",
        "/usr/share/deepdeps/ui",
        "/usr/local/share/deepdeps/ui",
    ];

    for c in &candidates {
        let path = std::path::Path::new(c);
        if path.join("index.html").exists() {
            return c.to_string();
        }
    }

    // Default fallback
    "./ui/dist".to_string()
}

fn format_num(n: impl Into<u64>) -> String {
    let n: u64 = n.into();
    if n >= 1_000_000 {
        format!("{:.1}M", n as f64 / 1_000_000.0)
    } else if n >= 1_000 {
        format!("{:.1}K", n as f64 / 1_000.0)
    } else {
        format!("{}", n)
    }
}

fn format_size(bytes: u64) -> String {
    if bytes >= 1_000_000_000 {
        format!("{:.1} GB", bytes as f64 / 1_000_000_000.0)
    } else if bytes >= 1_000_000 {
        format!("{:.1} MB", bytes as f64 / 1_000_000.0)
    } else if bytes >= 1_000 {
        format!("{:.1} KB", bytes as f64 / 1_000.0)
    } else {
        format!("{} B", bytes)
    }
}
