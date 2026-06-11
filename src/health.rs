use crate::models::{Package, Severity};

pub fn calculate(pkg: &Package) -> f64 {
    // Security score (35 points base)
    let mut security: f64 = 35.0;
    for vuln in &pkg.vulnerabilities {
        security -= match vuln.severity {
            Severity::Critical => 15.0,
            Severity::High => 10.0,
            Severity::Medium => 5.0,
            Severity::Low => 2.0,
            Severity::None => 0.0,
        };
    }
    let security = security.max(0.0);

    // Maintenance score (25 points)
    let mut maintenance: f64 = 25.0;
    if let Some(days) = pkg.last_release_days {
        if days > 365 {
            maintenance -= 15.0;
        } else if days > 180 {
            maintenance -= 8.0;
        } else if days > 90 {
            maintenance -= 3.0;
        }
    }
    let maintainer_count = pkg.maintainers.len() as f64;
    if maintainer_count == 0.0 {
        maintenance -= 5.0;
    } else if maintainer_count >= 3.0 {
        maintenance += 5.0;
    }
    let maintenance = maintenance.min(30.0).max(0.0);

    // Bus factor score (20 points)
    let bus_score: f64 = if let Some(bf) = pkg.bus_factor {
        match bf {
            0 | 1 => 5.0,
            2 => 12.0,
            3..=5 => 17.0,
            _ => 20.0,
        }
    } else {
        10.0
    };

    // Stability score (20 points)
    let mut stability: f64 = 20.0;
    if pkg.version.starts_with("0.") {
        stability -= 8.0;
    }
    if pkg.version.contains("-alpha") || pkg.version.contains("-beta") || pkg.version.contains("-rc") {
        stability -= 10.0;
    }
    if pkg.version.contains("-dev") || pkg.version.contains("-nightly") {
        stability -= 15.0;
    }
    let stability = stability.max(0.0);

    let total = security + maintenance + bus_score + stability;

    (total / 100.0 * 100.0).clamp(0.0, 100.0)
}
