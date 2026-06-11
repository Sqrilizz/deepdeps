export interface AnalysisResult {
  id: string;
  project_name: string;
  project_path: string;
  ecosystem: string;
  timestamp: string;
  direct_deps: number;
  total_deps: number;
  max_depth: number;
  total_loc: number;
  total_files: number;
  total_size: number;
  health_score: number;
  cve_count: number;
  high_risk_packages: number;
  unused_code_percentage: number;
  packages: Package[];
  licenses: LicenseSummary[];
  dependency_explosion_factor?: number;
}

export interface Package {
  name: string;
  version: string;
  ecosystem: string;
  direct: boolean;
  depth: number;
  dependencies: string[];
  loc: number | null;
  file_count: number | null;
  installed_size: number | null;
  health_score: number | null;
  vulnerabilities: Vulnerability[];
  maintainers: string[];
  license: string | null;
  last_release_days: number | null;
  bus_factor: number | null;
  used_apis: number | null;
  total_apis: number | null;
  risk_level: string | null;
}

export interface Vulnerability {
  id: string;
  severity: string;
  summary: string;
  affected_versions: string;
  patched_versions: string;
}

export interface LicenseSummary {
  name: string;
  count: number;
}

export type View =
  | 'dashboard'
  | 'galaxy'
  | 'security'
  | 'usage'
  | 'licenses'
  | 'reports'
  | 'settings';
