use crate::models::{Ecosystem, Package};
use anyhow::{Context, Result};
use serde::Deserialize;
use std::collections::{HashMap, HashSet};
use std::path::Path;

#[derive(Debug, Deserialize)]
struct PackageLock {
    packages: Option<HashMap<String, PackageLockEntry>>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct PackageLockEntry {
    version: Option<String>,
    dependencies: Option<HashMap<String, String>>,
    dev: Option<bool>,
    license: Option<String>,
    engines: Option<HashMap<String, String>>,
}

#[derive(Debug, Deserialize)]
struct CargoLock {
    package: Option<Vec<CargoLockPackage>>,
}

#[derive(Debug, Deserialize)]
struct CargoLockPackage {
    name: Option<String>,
    version: Option<String>,
    dependencies: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct NpmRegistryResponse {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub license: Option<String>,
    #[serde(default)]
    pub maintainers: Vec<Maintainer>,
    #[serde(default)]
    pub dist: Option<DistInfo>,
}

#[derive(Debug, Deserialize)]
pub struct Maintainer {
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct DistInfo {
    #[serde(default)]
    pub unpacked_size: Option<u64>,
}

#[derive(Debug, Deserialize)]
pub struct CratesIoResponse {
    #[serde(default, rename = "crate")]
    pub crate_data: Option<CrateInfo>,
}

#[derive(Debug, Deserialize)]
pub struct CrateInfo {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub license: Option<String>,
    #[serde(default)]
    pub downloads: u64,
    #[serde(default)]
    pub recent_downloads: Option<u64>,
}

pub fn resolve(
    path: &str,
    ecosystem: &Ecosystem,
    direct_deps: &[(String, String)],
) -> Result<Vec<Package>> {
    match ecosystem {
        Ecosystem::Node => resolve_node(path, direct_deps),
        Ecosystem::Python => resolve_python(path, direct_deps),
        Ecosystem::Rust => resolve_rust(path, direct_deps),
        Ecosystem::Go => resolve_go(path, direct_deps),
        Ecosystem::Maven => resolve_maven(path, direct_deps),
        Ecosystem::NuGet => resolve_nuget(path, direct_deps),
    }
}

fn make_pkg(
    name: String,
    version: String,
    eco: Ecosystem,
    direct: bool,
    depth: u32,
    deps: Vec<String>,
) -> Package {
    Package {
        name,
        version,
        ecosystem: eco,
        direct,
        depth,
        dependencies: deps,
        loc: None,
        file_count: None,
        installed_size: None,
        health_score: None,
        vulnerabilities: Vec::new(),
        maintainers: Vec::new(),
        license: None,
        last_release_days: None,
        bus_factor: None,
        used_apis: None,
        total_apis: None,
        risk_level: None,
    }
}

// ── Node.js ──────────────────────────────────────────────────────────────────

fn resolve_node(project_path: &str, direct_deps: &[(String, String)]) -> Result<Vec<Package>> {
    let lock_path = find_lock_file(
        project_path,
        &["package-lock.json", "yarn.lock", "pnpm-lock.yaml"],
    );
    let direct_names: Vec<String> = direct_deps.iter().map(|(n, _)| n.clone()).collect();

    if let Some(lock) = lock_path {
        return resolve_from_npm_lock(&lock, &direct_names);
    }

    Ok(direct_deps
        .iter()
        .map(|(n, v)| make_pkg(n.clone(), v.clone(), Ecosystem::Node, true, 0, vec![]))
        .collect())
}

fn resolve_from_npm_lock(lock_path: &str, direct_names: &[String]) -> Result<Vec<Package>> {
    let content = std::fs::read_to_string(lock_path).context("Failed to read package-lock.json")?;
    let lock: PackageLock =
        serde_json::from_str(&content).context("Failed to parse package-lock.json")?;

    let packages = lock.packages.unwrap_or_default();
    let mut name_map: HashMap<String, (String, Vec<String>, u32)> = HashMap::new();

    // First pass: collect names, versions, and dependency names per path
    for (path_str, entry) in &packages {
        if path_str.is_empty() {
            continue;
        }
        let name = normalize_npm_path(path_str);
        let version = entry.version.clone().unwrap_or_default();
        let deps = entry
            .dependencies
            .as_ref()
            .map(|d| d.keys().cloned().collect())
            .unwrap_or_default();
        let depth = path_str.matches("node_modules").count() as u32 - 1;
        name_map.insert(name, (version, deps, depth));
    }

    // Determine direct packages by normalized name match
    let direct_set: HashSet<String> = direct_names.iter().map(|n| n.to_lowercase()).collect();

    let mut result = Vec::new();
    for (name, (version, deps, depth)) in &name_map {
        let is_direct = direct_set.contains(&name.to_lowercase());
        result.push(make_pkg(
            name.clone(),
            version.clone(),
            Ecosystem::Node,
            is_direct,
            *depth,
            deps.clone(),
        ));
    }

    Ok(result)
}

fn normalize_npm_path(path: &str) -> String {
    let parts: Vec<&str> = path.split("/node_modules/").collect();
    if let Some(last) = parts.last() {
        if last.starts_with('@') {
            let scoped: Vec<&str> = last.split('/').collect();
            if scoped.len() >= 2 {
                return format!("{}/{}", scoped[0], scoped[1]);
            }
        }
        last.to_string()
    } else {
        path.to_string()
    }
}

// ── Python ──────────────────────────────────────────────────────────────────

fn resolve_python(_project_path: &str, direct_deps: &[(String, String)]) -> Result<Vec<Package>> {
    Ok(direct_deps
        .iter()
        .map(|(n, v)| make_pkg(n.clone(), v.clone(), Ecosystem::Python, true, 0, vec![]))
        .collect())
}

// ── Rust ────────────────────────────────────────────────────────────────────

fn resolve_rust(project_path: &str, direct_deps: &[(String, String)]) -> Result<Vec<Package>> {
    let lock_path = find_lock_file(project_path, &["Cargo.lock"]);
    let direct_names: Vec<String> = direct_deps.iter().map(|(n, _)| n.clone()).collect();

    if let Some(lock) = lock_path {
        return resolve_from_cargo_lock(&lock, &direct_names);
    }

    Ok(direct_deps
        .iter()
        .map(|(n, v)| make_pkg(n.clone(), v.clone(), Ecosystem::Rust, true, 0, vec![]))
        .collect())
}

fn resolve_from_cargo_lock(lock_path: &str, direct_names: &[String]) -> Result<Vec<Package>> {
    let content = std::fs::read_to_string(lock_path).context("Failed to read Cargo.lock")?;
    let lock: CargoLock = toml::from_str(&content).context("Failed to parse Cargo.lock")?;

    let packages = lock.package.unwrap_or_default();
    let direct_set: HashSet<String> = direct_names.iter().cloned().collect();

    // Build name -> index map and collect all packages
    let mut pkg_map: HashMap<String, usize> = HashMap::new();
    let mut raw: Vec<(String, String, Vec<String>)> = Vec::new();

    for (i, pkg) in packages.iter().enumerate() {
        let name = pkg.name.clone().unwrap_or_default();
        let version = pkg.version.clone().unwrap_or_default();
        let deps = pkg
            .dependencies
            .clone()
            .unwrap_or_default()
            .into_iter()
            .map(|s| {
                // Cargo.lock format: "package version (source)" or "package version"
                s.split(' ').next().unwrap_or(&s).to_string()
            })
            .collect();
        pkg_map.insert(name.clone(), i);
        raw.push((name, version, deps));
    }

    // Compute depth via BFS from direct deps
    let mut depth: HashMap<usize, u32> = HashMap::new();
    let mut queue: Vec<(usize, u32)> = Vec::new();

    for (i, (name, _, _)) in raw.iter().enumerate() {
        if direct_set.contains(name) {
            depth.insert(i, 0);
            queue.push((i, 0));
        }
    }

    let mut visited: HashSet<usize> = depth.keys().cloned().collect();
    while let Some((idx, d)) = queue.pop() {
        let deps = &raw[idx].2;
        for dep_name in deps {
            if let Some(&dep_idx) = pkg_map.get(dep_name) {
                if !visited.contains(&dep_idx) {
                    visited.insert(dep_idx);
                    depth.insert(dep_idx, d + 1);
                    queue.push((dep_idx, d + 1));
                }
            }
        }
    }

    let mut result = Vec::new();
    for (i, (name, version, deps)) in raw.into_iter().enumerate() {
        let is_direct = direct_set.contains(&name);
        let d = depth.get(&i).copied().unwrap_or(1);
        result.push(make_pkg(name, version, Ecosystem::Rust, is_direct, d, deps));
    }

    Ok(result)
}

// ── Go ──────────────────────────────────────────────────────────────────────

fn resolve_go(project_path: &str, direct_deps: &[(String, String)]) -> Result<Vec<Package>> {
    // Try go.sum first for full transitive tree
    let sum_path = find_lock_file(project_path, &["go.sum"]);
    let mod_path = find_lock_file(project_path, &["go.mod"]);
    let direct_set: HashSet<String> = direct_deps.iter().map(|(n, _)| n.clone()).collect();

    if let Some(sum) = sum_path {
        return resolve_from_go_sum(&sum, &direct_set);
    }

    // Fallback to go.mod only
    if let Some(mod_path) = mod_path {
        let content = std::fs::read_to_string(&mod_path).ok();
        if let Some(c) = content {
            let mut result: Vec<Package> = Vec::new();
            for line in c.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with("require ") || trimmed.starts_with('\t') {
                    let parts: Vec<&str> = trimmed.split_whitespace().collect();
                    if parts.len() >= 2 {
                        let name = parts[0].trim();
                        let version = parts[1].trim();
                        if !name.is_empty() && !version.is_empty() {
                            let is_direct = direct_set.contains(name);
                            result.push(make_pkg(
                                name.to_string(),
                                version.to_string(),
                                Ecosystem::Go,
                                is_direct,
                                0,
                                vec![],
                            ));
                        }
                    }
                }
            }
            return Ok(result);
        }
    }

    Ok(direct_deps
        .iter()
        .map(|(n, v)| make_pkg(n.clone(), v.clone(), Ecosystem::Go, true, 0, vec![]))
        .collect())
}

fn resolve_from_go_sum(path: &str, direct_set: &HashSet<String>) -> Result<Vec<Package>> {
    let content = std::fs::read_to_string(path).context("Failed to read go.sum")?;
    let mut seen: HashMap<String, String> = HashMap::new();
    let mut module_to_deps: HashMap<String, Vec<String>> = HashMap::new();

    // go.sum lines: module version h1:hash
    // module version/go.mod h1:hash
    // We track all modules mentioned
    for line in content.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 2 {
            let name = parts[0].to_string();
            let version = parts[1].to_string();
            // Skip go.mod checksum lines
            if version.ends_with("/go.mod") {
                continue;
            }
            seen.entry(name).or_insert(version);
        }
    }

    let direct = direct_set.clone();
    let result: Vec<Package> = seen
        .into_iter()
        .map(|(name, version)| {
            let is_direct = direct.contains(&name);
            let deps = module_to_deps.remove(&name).unwrap_or_default();
            make_pkg(name, version, Ecosystem::Go, is_direct, 0, deps)
        })
        .collect();

    Ok(result)
}

// ── Maven ──────────────────────────────────────────────────────────────────

fn resolve_maven(project_path: &str, direct_deps: &[(String, String)]) -> Result<Vec<Package>> {
    // Simple pom.xml direct dep parsing
    let pom_path = find_lock_file(project_path, &["pom.xml"]);
    if let Some(path) = pom_path {
        let content = std::fs::read_to_string(&path).ok();
        if let Some(c) = content {
            return Ok(parse_pom_xml_deps(&c, direct_deps));
        }
    }
    Ok(direct_deps
        .iter()
        .map(|(n, v)| make_pkg(n.clone(), v.clone(), Ecosystem::Maven, true, 0, vec![]))
        .collect())
}

fn parse_pom_xml_deps(xml: &str, direct_deps: &[(String, String)]) -> Vec<Package> {
    let direct_set: HashSet<String> = direct_deps.iter().map(|(n, _)| n.clone()).collect();
    let mut result = Vec::new();

    // Simple extraction: look for <dependency> blocks
    for block in xml.split("</dependency>") {
        let group = extract_xml_tag(block, "groupId");
        let artifact = extract_xml_tag(block, "artifactId");
        let version = extract_xml_tag(block, "version");

        if let (Some(g), Some(a)) = (group, artifact) {
            let name = format!("{}:{}", g, a);
            let ver = version.unwrap_or_default();
            let is_direct = direct_set.contains(&name);
            result.push(make_pkg(name, ver, Ecosystem::Maven, is_direct, 0, vec![]));
        }
    }

    result
}

fn extract_xml_tag(s: &str, tag: &str) -> Option<String> {
    let open = format!("<{}>", tag);
    let close = format!("</{}>", tag);
    if let Some(start) = s.find(&open) {
        let content_start = start + open.len();
        if let Some(end) = s[content_start..].find(&close) {
            return Some(s[content_start..content_start + end].trim().to_string());
        }
    }
    None
}

// ── NuGet ──────────────────────────────────────────────────────────────────

fn resolve_nuget(project_path: &str, direct_deps: &[(String, String)]) -> Result<Vec<Package>> {
    // Try packages.lock.json first (full transitive tree)
    let lock_path = find_lock_file(project_path, &["packages.lock.json"]);
    if let Some(path) = lock_path {
        return resolve_from_nuget_lock(&path, direct_deps);
    }

    // Fallback: parse *.csproj for PackageReference
    let dir = Path::new(project_path);
    if dir.is_dir() {
        if let Ok(entries) = std::fs::read_dir(dir) {
            let mut result = Vec::new();
            for entry in entries.flatten() {
                let p = entry.path();
                if p.extension().map(|e| e == "csproj").unwrap_or(false) {
                    if let Ok(c) = std::fs::read_to_string(&p) {
                        result.extend(parse_csproj_refs(&c, direct_deps));
                    }
                }
            }
            if !result.is_empty() {
                return Ok(result);
            }
        }
    }

    Ok(direct_deps
        .iter()
        .map(|(n, v)| make_pkg(n.clone(), v.clone(), Ecosystem::NuGet, true, 0, vec![]))
        .collect())
}

fn resolve_from_nuget_lock(path: &str, direct_deps: &[(String, String)]) -> Result<Vec<Package>> {
    let content = std::fs::read_to_string(path).context("Failed to read packages.lock.json")?;
    let lock: serde_json::Value =
        serde_json::from_str(&content).context("Failed to parse packages.lock.json")?;
    let direct_set: HashSet<String> = direct_deps.iter().map(|(n, _)| n.clone()).collect();

    let mut result = Vec::new();
    // NuGet lock format: { "dependencies": { ".NETCoreApp,Version=v6.0": { "Package.Name": { ... } } } }
    if let Some(deps) = lock.get("dependencies").and_then(|d| d.as_object()) {
        for target in deps.values() {
            if let Some(pkgs) = target.as_object() {
                for (name, info) in pkgs {
                    let version = info
                        .get("resolved")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();
                    let is_direct = direct_set.contains(name);
                    result.push(make_pkg(
                        name.clone(),
                        version,
                        Ecosystem::NuGet,
                        is_direct,
                        0,
                        vec![],
                    ));
                }
            }
        }
    }

    Ok(result)
}

fn parse_csproj_refs(xml: &str, direct_deps: &[(String, String)]) -> Vec<Package> {
    let direct_set: HashSet<String> = direct_deps.iter().map(|(n, _)| n.clone()).collect();
    let mut result = Vec::new();

    for block in xml.split("</PackageReference>") {
        let include = extract_xml_tag(block, "Include");
        let version =
            extract_xml_tag(block, "Version").or_else(|| extract_xml_tag(block, "version"));
        if let Some(name) = include {
            let ver = version.unwrap_or_default();
            let is_direct = direct_set.contains(&name);
            result.push(make_pkg(name, ver, Ecosystem::NuGet, is_direct, 0, vec![]));
        }
    }

    result
}

// ── Shared helpers ─────────────────────────────────────────────────────────

fn find_lock_file(project_path: &str, candidates: &[&str]) -> Option<String> {
    let path = Path::new(project_path);
    let dir = if path.is_dir() { path } else { path.parent()? };

    for candidate in candidates {
        let lock = dir.join(candidate);
        if lock.exists() {
            return Some(lock.to_string_lossy().to_string());
        }
    }

    if let Some(parent) = dir.parent() {
        for candidate in candidates {
            let lock = parent.join(candidate);
            if lock.exists() {
                return Some(lock.to_string_lossy().to_string());
            }
        }
    }

    None
}

pub async fn fetch_npm_package(name: &str) -> Result<Option<NpmRegistryResponse>> {
    let url = format!("https://registry.npmjs.org/{}", name);
    let client = reqwest::Client::builder()
        .user_agent("deepdeps/0.1.0")
        .build()?;
    let resp = client.get(&url).send().await;
    match resp {
        Ok(r) if r.status().is_success() => {
            let data: NpmRegistryResponse = r.json().await?;
            Ok(Some(data))
        }
        _ => Ok(None),
    }
}

pub async fn fetch_crate_info(name: &str) -> Result<Option<CratesIoResponse>> {
    let url = format!("https://crates.io/api/v1/crates/{}", name);
    let client = reqwest::Client::builder()
        .user_agent("deepdeps/0.1.0")
        .build()?;
    let resp = client
        .get(&url)
        .header("Accept", "application/json")
        .send()
        .await;
    match resp {
        Ok(r) if r.status().is_success() => {
            let data: CratesIoResponse = r.json().await?;
            Ok(Some(data))
        }
        _ => Ok(None),
    }
}
