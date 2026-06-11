use crate::models::{Ecosystem, Severity, Vulnerability};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct OsvQuery {
    #[serde(default)]
    vulns: Vec<OsvVuln>,
}

#[derive(Debug, Deserialize)]
struct OsvVuln {
    id: Option<String>,
    summary: Option<String>,
    severity: Option<Vec<OsvSeverity>>,
    affected: Option<Vec<OsvAffected>>,
}

#[derive(Debug, Clone, Deserialize)]
#[allow(dead_code)]
struct OsvSeverity {
    #[serde(rename = "type")]
    stype: Option<String>,
    score: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OsvAffected {
    ranges: Option<Vec<OsvRange>>,
    versions: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct OsvRange {
    #[serde(rename = "type")]
    rtype: Option<String>,
    events: Option<Vec<OsvEvent>>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct OsvEvent {
    introduced: Option<String>,
    fixed: Option<String>,
}

fn map_severity(sev: &str) -> Severity {
    let s = sev.to_lowercase();
    if s.contains("critical") {
        Severity::Critical
    } else if s.contains("high") {
        Severity::High
    } else if s.contains("medium") {
        Severity::Medium
    } else if s.contains("low") {
        Severity::Low
    } else {
        Severity::None
    }
}

fn ecosystem_prefix(eco: &Ecosystem) -> &str {
    match eco {
        Ecosystem::Node => "npm",
        Ecosystem::Python => "PyPI",
        Ecosystem::Rust => "crates.io",
        Ecosystem::Go => "Go",
        Ecosystem::Maven => "Maven",
        Ecosystem::NuGet => "NuGet",
    }
}

fn ecosystem_osv(eco: &Ecosystem) -> &str {
    match eco {
        Ecosystem::Node => "npm",
        Ecosystem::Python => "PyPI",
        Ecosystem::Rust => "crates.io",
        Ecosystem::Go => "Go",
        Ecosystem::Maven => "Maven",
        Ecosystem::NuGet => "NuGet",
    }
}

pub async fn check_vulnerabilities(
    name: &str,
    version: &str,
    ecosystem: &Ecosystem,
) -> Vec<Vulnerability> {
    // Try OSV API
    let eco_str = ecosystem_osv(ecosystem);
    let url = "https://api.osv.dev/v1/query";

    let body = serde_json::json!({
        "package": {
            "name": name,
            "ecosystem": eco_str,
        },
        "version": version,
    });

    let client = match reqwest::Client::builder()
        .user_agent("deepdeps/0.1.0")
        .timeout(std::time::Duration::from_secs(5))
        .build()
    {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };

    match client.post(url).json(&body).send().await {
        Ok(resp) if resp.status().is_success() => match resp.json::<OsvQuery>().await {
            Ok(data) => {
                let mut vulns = Vec::new();
                for vuln in data.vulns {
                    let sev = vuln
                        .severity
                        .and_then(|s| s.first().cloned())
                        .and_then(|s| s.score)
                        .map(|s| {
                            if let Ok(val) = s.parse::<f64>() {
                                if val >= 9.0 {
                                    Severity::Critical
                                } else if val >= 7.0 {
                                    Severity::High
                                } else if val >= 4.0 {
                                    Severity::Medium
                                } else {
                                    Severity::Low
                                }
                            } else {
                                map_severity(&s)
                            }
                        })
                        .unwrap_or(Severity::None);

                    let affected_ver = vuln
                        .affected
                        .as_ref()
                        .and_then(|a| a.first())
                        .and_then(|a| a.versions.as_ref())
                        .and_then(|v| v.first())
                        .cloned()
                        .unwrap_or_default();

                    let patched_ver = vuln
                        .affected
                        .as_ref()
                        .and_then(|a| a.first())
                        .and_then(|a| a.ranges.as_ref())
                        .and_then(|r| r.first())
                        .and_then(|r| r.events.as_ref())
                        .and_then(|e| e.iter().find(|ev| ev.fixed.is_some()))
                        .and_then(|ev| ev.fixed.clone())
                        .unwrap_or_default();

                    vulns.push(Vulnerability {
                        id: vuln.id.unwrap_or_default(),
                        severity: sev,
                        summary: vuln.summary.unwrap_or_default(),
                        affected_versions: affected_ver,
                        patched_versions: patched_ver,
                    });
                }
                vulns
            }
            Err(_) => Vec::new(),
        },
        _ => {
            // Fallback: check GitHub Advisory Database
            let eco_prefix = ecosystem_prefix(ecosystem);
            let advisory_url = format!(
                "https://api.github.com/advisories?ecosystem={}&package={}&per_page=5",
                eco_prefix, name
            );

            match client
                .get(&advisory_url)
                .header("Accept", "application/vnd.github+json")
                .header("User-Agent", "deepdeps/0.1.0")
                .send()
                .await
            {
                Ok(adv_resp) if adv_resp.status().is_success() => {
                    #[derive(Debug, Deserialize)]
                    #[allow(dead_code)]
                    struct Advisory {
                        #[serde(default)]
                        ghsa_id: String,
                        #[serde(default)]
                        summary: String,
                        #[serde(default)]
                        severity: String,
                        #[serde(default)]
                        vulnerabilities: Vec<AdvisoryVuln>,
                    }
                    #[derive(Debug, Deserialize)]
                    #[allow(dead_code)]
                    struct AdvisoryVuln {
                        package: Option<AdvisoryPkg>,
                        vulnerable_version_range: Option<String>,
                        first_patched_version: Option<AdvisoryPatch>,
                    }
                    #[derive(Debug, Deserialize)]
                    #[allow(dead_code)]
                    struct AdvisoryPkg {
                        ecosystem: Option<String>,
                        name: Option<String>,
                    }
                    #[derive(Debug, Deserialize)]
                    struct AdvisoryPatch {
                        identifier: Option<String>,
                    }

                    match adv_resp.json::<Vec<Advisory>>().await {
                        Ok(advisories) => advisories
                            .into_iter()
                            .map(|a| Vulnerability {
                                id: a.ghsa_id,
                                severity: map_severity(&a.severity),
                                summary: a.summary,
                                affected_versions: a
                                    .vulnerabilities
                                    .first()
                                    .and_then(|v| v.vulnerable_version_range.clone())
                                    .unwrap_or_default(),
                                patched_versions: a
                                    .vulnerabilities
                                    .first()
                                    .and_then(|v| v.first_patched_version.as_ref())
                                    .and_then(|p| p.identifier.clone())
                                    .unwrap_or_default(),
                            })
                            .collect(),
                        Err(_) => Vec::new(),
                    }
                }
                _ => Vec::new(),
            }
        }
    }
}
