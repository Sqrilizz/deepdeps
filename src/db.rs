use anyhow::Result;
use rusqlite::Connection;
use crate::models::*;

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new(path: &str) -> Result<Self> {
        let conn = Connection::open(path)?;
        let db = Database { conn };
        db.init()?;
        Ok(db)
    }

    fn init(&self) -> Result<()> {
        self.conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS analyses (
                id TEXT PRIMARY KEY,
                project_name TEXT NOT NULL,
                project_path TEXT NOT NULL,
                ecosystem TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                direct_deps INTEGER NOT NULL,
                total_deps INTEGER NOT NULL,
                max_depth INTEGER NOT NULL,
                total_loc INTEGER NOT NULL,
                total_files INTEGER NOT NULL,
                total_size INTEGER NOT NULL,
                health_score REAL NOT NULL,
                cve_count INTEGER NOT NULL,
                high_risk_packages INTEGER NOT NULL,
                unused_code_percentage REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS packages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                analysis_id TEXT NOT NULL,
                name TEXT NOT NULL,
                version TEXT NOT NULL,
                ecosystem TEXT NOT NULL,
                direct INTEGER NOT NULL,
                depth INTEGER NOT NULL,
                loc INTEGER,
                file_count INTEGER,
                installed_size INTEGER,
                health_score REAL,
                license TEXT,
                last_release_days INTEGER,
                bus_factor INTEGER,
                risk_level TEXT,
                FOREIGN KEY (analysis_id) REFERENCES analyses(id)
            );

            CREATE TABLE IF NOT EXISTS vulnerabilities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                analysis_id TEXT NOT NULL,
                package_name TEXT NOT NULL,
                vuln_id TEXT NOT NULL,
                severity TEXT NOT NULL,
                summary TEXT,
                affected_versions TEXT,
                patched_versions TEXT,
                FOREIGN KEY (analysis_id) REFERENCES analyses(id)
            );

            CREATE INDEX IF NOT EXISTS idx_analyses_timestamp ON analyses(timestamp);
            CREATE INDEX IF NOT EXISTS idx_packages_analysis ON packages(analysis_id);
            CREATE INDEX IF NOT EXISTS idx_vulns_analysis ON vulnerabilities(analysis_id);"
        )?;
        Ok(())
    }

    pub fn save_analysis(&self, result: &AnalysisResult) -> Result<()> {
        self.conn.execute(
            "INSERT INTO analyses (id, project_name, project_path, ecosystem, timestamp,
             direct_deps, total_deps, max_depth, total_loc, total_files, total_size,
             health_score, cve_count, high_risk_packages, unused_code_percentage)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
            rusqlite::params![
                result.id,
                result.project_name,
                result.project_path,
                serde_json::to_string(&result.ecosystem).unwrap_or_default(),
                result.timestamp,
                result.direct_deps,
                result.total_deps,
                result.max_depth,
                result.total_loc,
                result.total_files,
                result.total_size,
                result.health_score,
                result.cve_count,
                result.high_risk_packages,
                result.unused_code_percentage,
            ],
        )?;

        for pkg in &result.packages {
            self.conn.execute(
                "INSERT INTO packages (analysis_id, name, version, ecosystem, direct, depth,
                 loc, file_count, installed_size, health_score, license, last_release_days,
                 bus_factor, risk_level)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
                rusqlite::params![
                    result.id,
                    pkg.name,
                    pkg.version,
                    serde_json::to_string(&pkg.ecosystem).unwrap_or_default(),
                    pkg.direct,
                    pkg.depth,
                    pkg.loc.map(|v| v as i64),
                    pkg.file_count.map(|v| v as i64),
                    pkg.installed_size.map(|v| v as i64),
                    pkg.health_score,
                    pkg.license,
                    pkg.last_release_days.map(|v| v as i64),
                    pkg.bus_factor.map(|v| v as i32),
                    pkg.risk_level.as_ref().map(|r| serde_json::to_string(r).unwrap_or_default()),
                ],
            )?;

            for vuln in &pkg.vulnerabilities {
                self.conn.execute(
                    "INSERT INTO vulnerabilities (analysis_id, package_name, vuln_id, severity, summary, affected_versions, patched_versions)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                    rusqlite::params![
                        result.id,
                        pkg.name,
                        vuln.id,
                        serde_json::to_string(&vuln.severity).unwrap_or_default(),
                        vuln.summary,
                        vuln.affected_versions,
                        vuln.patched_versions,
                    ],
                )?;
            }
        }

        Ok(())
    }

    pub fn get_latest_analysis(&self) -> Result<Option<DbAnalysis>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, project_name, project_path, ecosystem, timestamp,
             direct_deps, total_deps, max_depth, total_loc, total_files, total_size,
             health_score, cve_count, high_risk_packages, unused_code_percentage
             FROM analyses ORDER BY timestamp DESC LIMIT 1"
        )?;

        let result = stmt.query_row([], |row| {
            Ok(DbAnalysis {
                id: row.get(0)?,
                project_name: row.get(1)?,
                project_path: row.get(2)?,
                ecosystem: row.get(3)?,
                timestamp: row.get(4)?,
                direct_deps: row.get(5)?,
                total_deps: row.get(6)?,
                max_depth: row.get(7)?,
                total_loc: row.get(8)?,
                total_files: row.get(9)?,
                total_size: row.get(10)?,
                health_score: row.get(11)?,
                cve_count: row.get(12)?,
                high_risk_packages: row.get(13)?,
                unused_code_percentage: row.get(14)?,
            })
        });

        match result {
            Ok(analysis) => Ok(Some(analysis)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    pub fn get_analysis_by_id(&self, id: &str) -> Result<Option<DbAnalysis>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, project_name, project_path, ecosystem, timestamp,
             direct_deps, total_deps, max_depth, total_loc, total_files, total_size,
             health_score, cve_count, high_risk_packages, unused_code_percentage
             FROM analyses WHERE id = ?1"
        )?;

        let result = stmt.query_row(rusqlite::params![id], |row| {
            Ok(DbAnalysis {
                id: row.get(0)?,
                project_name: row.get(1)?,
                project_path: row.get(2)?,
                ecosystem: row.get(3)?,
                timestamp: row.get(4)?,
                direct_deps: row.get(5)?,
                total_deps: row.get(6)?,
                max_depth: row.get(7)?,
                total_loc: row.get(8)?,
                total_files: row.get(9)?,
                total_size: row.get(10)?,
                health_score: row.get(11)?,
                cve_count: row.get(12)?,
                high_risk_packages: row.get(13)?,
                unused_code_percentage: row.get(14)?,
            })
        });

        match result {
            Ok(analysis) => Ok(Some(analysis)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    pub fn get_all_analyses(&self) -> Result<Vec<DbAnalysis>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, project_name, project_path, ecosystem, timestamp,
             direct_deps, total_deps, max_depth, total_loc, total_files, total_size,
             health_score, cve_count, high_risk_packages, unused_code_percentage
             FROM analyses ORDER BY timestamp DESC"
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(DbAnalysis {
                id: row.get(0)?,
                project_name: row.get(1)?,
                project_path: row.get(2)?,
                ecosystem: row.get(3)?,
                timestamp: row.get(4)?,
                direct_deps: row.get(5)?,
                total_deps: row.get(6)?,
                max_depth: row.get(7)?,
                total_loc: row.get(8)?,
                total_files: row.get(9)?,
                total_size: row.get(10)?,
                health_score: row.get(11)?,
                cve_count: row.get(12)?,
                high_risk_packages: row.get(13)?,
                unused_code_percentage: row.get(14)?,
            })
        })?;

        let mut analyses = Vec::new();
        for row in rows {
            analyses.push(row?);
        }
        Ok(analyses)
    }

    pub fn get_packages_for_analysis(&self, analysis_id: &str) -> Result<Vec<DbPackage>> {
        let mut stmt = self.conn.prepare(
            "SELECT analysis_id, name, version, ecosystem, direct, depth,
             loc, file_count, installed_size, health_score, license, last_release_days,
             bus_factor, risk_level
             FROM packages WHERE analysis_id = ?1 ORDER BY depth, name"
        )?;

        let rows = stmt.query_map(rusqlite::params![analysis_id], |row| {
            Ok(DbPackage {
                analysis_id: row.get(0)?,
                name: row.get(1)?,
                version: row.get(2)?,
                ecosystem: row.get(3)?,
                direct: row.get(4)?,
                depth: row.get(5)?,
                loc: row.get(6)?,
                file_count: row.get(7)?,
                installed_size: row.get(8)?,
                health_score: row.get(9)?,
                license: row.get(10)?,
                last_release_days: row.get(11)?,
                bus_factor: row.get(12)?,
                risk_level: row.get(13)?,
            })
        })?;

        let mut packages = Vec::new();
        for row in rows {
            packages.push(row?);
        }
        Ok(packages)
    }

    pub fn get_home_dir() -> String {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        let dir = format!("{}/.deepdeps", home);
        let _ = std::fs::create_dir_all(&dir);
        dir
    }

    pub fn default_db_path() -> String {
        format!("{}/deepdeps.db", Self::get_home_dir())
    }
}
