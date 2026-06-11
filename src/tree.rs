use crate::models::AnalysisResult;
use std::collections::{HashMap, HashSet};

pub fn render(result: &AnalysisResult) -> String {
    let mut output = String::new();

    let pkg_map: HashMap<&str, &crate::models::Package> = result
        .packages
        .iter()
        .map(|p| (p.name.as_str(), p))
        .collect();

    let direct: Vec<&str> = result
        .packages
        .iter()
        .filter(|p| p.direct)
        .map(|p| p.name.as_str())
        .collect();

    // Track visited to handle cycles + dedup display under correct parents
    let mut displayed: HashSet<String> = HashSet::new();

    for (i, name) in direct.iter().enumerate() {
        let pkg = pkg_map.get(name).unwrap();
        let prefix = if i == direct.len() - 1 {
            "└── "
        } else {
            "├── "
        };
        let last = i == direct.len() - 1;
        output.push_str(&format!("{}{}@{}", prefix, pkg.name, pkg.version));
        if !pkg.dependencies.is_empty() {
            output.push('\n');
            render_children(
                &pkg.dependencies,
                &pkg_map,
                if last { "    " } else { "│   " },
                &mut displayed,
                &mut output,
                last,
            );
        } else {
            output.push('\n');
        }
        displayed.insert(pkg.name.clone());
    }

    output
}

fn render_children(
    deps: &[String],
    pkg_map: &HashMap<&str, &crate::models::Package>,
    indent: &str,
    displayed: &mut HashSet<String>,
    output: &mut String,
    _is_last: bool,
) {
    let count = deps.len();
    for (i, dep_name) in deps.iter().enumerate() {
        let is_last_child = i == count - 1;
        let conn = if is_last_child {
            "└── "
        } else {
            "├── "
        };

        if displayed.contains(dep_name) {
            output.push_str(&format!(
                "{}{}{} (already listed)\n",
                indent, conn, dep_name
            ));
            continue;
        }

        if let Some(pkg) = pkg_map.get(dep_name.as_str()) {
            output.push_str(&format!("{}{}{}@{}", indent, conn, pkg.name, pkg.version));
            displayed.insert(pkg.name.clone());

            if !pkg.dependencies.is_empty() {
                output.push('\n');
                let child_indent = if is_last_child {
                    format!("{}    ", indent)
                } else {
                    format!("{}│   ", indent)
                };
                render_children(
                    &pkg.dependencies,
                    pkg_map,
                    &child_indent,
                    displayed,
                    output,
                    is_last_child,
                );
            } else {
                output.push('\n');
            }
        } else {
            output.push_str(&format!("{}{}{}\n", indent, conn, dep_name));
        }
    }
}
