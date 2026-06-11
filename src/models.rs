use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum Ecosystem {
    Node,
    Python,
    Rust,
    Go,
    Maven,
    NuGet,
}

impl Ecosystem {
    pub fn as_str(&self) -> &'static str {
        match self {
            Ecosystem::Node => "Node.js",
            Ecosystem::Python => "Python",
            Ecosystem::Rust => "Rust",
            Ecosystem::Go => "Go",
            Ecosystem::Maven => "Maven",
            Ecosystem::NuGet => "NuGet",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Severity {
    Critical,
    High,
    Medium,
    Low,
    None,
}

impl Severity {
    pub fn score(&self) -> u8 {
        match self {
            Severity::Critical => 10,
            Severity::High => 7,
            Severity::Medium => 4,
            Severity::Low => 1,
            Severity::None => 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RiskLevel {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Vulnerability {
    pub id: String,
    pub severity: Severity,
    pub summary: String,
    pub affected_versions: String,
    pub patched_versions: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Package {
    pub name: String,
    pub version: String,
    pub ecosystem: Ecosystem,
    pub direct: bool,
    pub depth: u32,
    pub dependencies: Vec<String>,
    pub loc: Option<u64>,
    pub file_count: Option<u64>,
    pub installed_size: Option<u64>,
    pub health_score: Option<f64>,
    pub vulnerabilities: Vec<Vulnerability>,
    pub maintainers: Vec<String>,
    pub license: Option<String>,
    pub last_release_days: Option<u64>,
    pub bus_factor: Option<u32>,
    pub used_apis: Option<u32>,
    pub total_apis: Option<u32>,
    pub risk_level: Option<RiskLevel>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseSummary {
    pub name: String,
    pub count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisResult {
    pub id: String,
    pub project_name: String,
    pub project_path: String,
    pub ecosystem: Ecosystem,
    pub timestamp: String,
    pub direct_deps: u32,
    pub total_deps: u32,
    pub max_depth: u32,
    pub total_loc: u64,
    pub total_files: u64,
    pub total_size: u64,
    pub packages: Vec<Package>,
    pub health_score: f64,
    pub cve_count: u32,
    pub high_risk_packages: u32,
    pub unused_code_percentage: f64,
    pub licenses: Vec<LicenseSummary>,
}

impl AnalysisResult {
    pub fn dependency_explosion_factor(&self) -> f64 {
        if self.direct_deps == 0 {
            return 0.0;
        }
        self.total_deps as f64 / self.direct_deps as f64
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalyzeRequest {
    pub path: Option<String>,
    pub project_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiffEntry {
    pub change: DiffChange,
    pub name: String,
    pub old_version: Option<String>,
    pub new_version: Option<String>,
    pub old_size: Option<u64>,
    pub new_size: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DiffChange {
    Added,
    Removed,
    Upgraded,
    Downgraded,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiffResult {
    pub old_analysis_id: String,
    pub new_analysis_id: String,
    pub added: Vec<DiffEntry>,
    pub removed: Vec<DiffEntry>,
    pub changed: Vec<DiffEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DbPackage {
    pub analysis_id: String,
    pub name: String,
    pub version: String,
    pub ecosystem: String,
    pub direct: bool,
    pub depth: i64,
    pub loc: Option<i64>,
    pub file_count: Option<i64>,
    pub installed_size: Option<i64>,
    pub health_score: Option<f64>,
    pub license: Option<String>,
    pub last_release_days: Option<i64>,
    pub bus_factor: Option<i64>,
    pub risk_level: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DbAnalysis {
    pub id: String,
    pub project_name: String,
    pub project_path: String,
    pub ecosystem: String,
    pub timestamp: String,
    pub direct_deps: i64,
    pub total_deps: i64,
    pub max_depth: i64,
    pub total_loc: i64,
    pub total_files: i64,
    pub total_size: i64,
    pub health_score: f64,
    pub cve_count: i64,
    pub high_risk_packages: i64,
    pub unused_code_percentage: f64,
}
