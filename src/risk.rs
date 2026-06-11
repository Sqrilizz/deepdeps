use crate::models::{Package, RiskLevel, Severity};

pub fn assess(pkg: &Package) -> RiskLevel {
    let mut score: u32 = 0;

    // CVEs
    let has_critical = pkg.vulnerabilities.iter().any(|v| matches!(v.severity, Severity::Critical));
    let has_high = pkg.vulnerabilities.iter().any(|v| matches!(v.severity, Severity::High));

    if has_critical { score += 40; }
    if has_high { score += 25; }
    if pkg.vulnerabilities.len() > 2 { score += 15; }

    // Bus factor risk
    if let Some(bf) = pkg.bus_factor {
        if bf <= 1 {
            score += 20;
        } else if bf <= 2 {
            score += 10;
        }
    } else {
        score += 15;
    }

    // Abandonment risk
    if let Some(days) = pkg.last_release_days {
        if days > 365 { score += 20; }
        else if days > 180 { score += 10; }
        else if days > 90 { score += 5; }
    } else {
        score += 10;
    }

    // Pre-release risk
    if pkg.version.starts_with("0.") { score += 5; }
    if pkg.version.contains("-alpha") || pkg.version.contains("-beta") { score += 10; }

    match score {
        0..=20 => RiskLevel::Low,
        21..=40 => RiskLevel::Medium,
        41..=60 => RiskLevel::High,
        _ => RiskLevel::Critical,
    }
}
