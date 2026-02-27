// ── Team Member ──────────────────────────────────────────────────────────────
export type Department =
  | 'engineering' | 'product' | 'design' | 'data'
  | 'devops' | 'security' | 'marketing' | 'sales'
  | 'finance' | 'people' | 'leadership' | 'customer-success';

export type Seniority =
  | 'intern' | 'junior' | 'mid' | 'senior'
  | 'lead' | 'principal' | 'staff' | 'director' | 'vp' | 'c-level';

export type MCPDomain =
  | 'engineering' | 'sales' | 'customer-success' | 'marketing'
  | 'people' | 'finance' | 'data' | 'executive';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role_title: string;
  department: Department;
  seniority: Seniority;
  salary_gbp: number;
  hire_date: string;           // ISO date
  status: 'active' | 'invited' | 'on_leave' | 'departed';
  mcp_domain: MCPDomain;       // primary domain for Sheri routing
  github_handle?: string;
  reports_to?: string;         // team member id
  location: string;            // "London, UK" | "Remote"
  hire_stage: 'seed' | 'series-a' | 'series-b' | 'growth';
}

// ── Tool / SaaS Subscription ─────────────────────────────────────────────────
export type ToolCategory =
  | 'version-control' | 'ci-cd' | 'project-management'
  | 'monitoring' | 'infrastructure' | 'communication'
  | 'design' | 'documentation' | 'security' | 'analytics'
  | 'ai-ml' | 'hr' | 'finance' | 'crm';

export interface TeamTool {
  id: string;
  name: string;
  vendor: string;
  category: ToolCategory;
  plan_name: string;            // "Team", "Pro", "Enterprise"
  cost_per_seat_gbp: number;    // 0 if flat rate
  seat_count: number;
  flat_monthly_gbp: number;     // 0 if per-seat
  billing_cycle: 'monthly' | 'annual';
  annual_total_gbp: number;     // computed
  is_essential: boolean;
  free_tier_available: boolean;
  renewal_date?: string;        // ISO date
  owner_email?: string;         // who manages the subscription
  team_departments: Department[];
  notes?: string;
  alternatives?: string[];
}

// ── DORA Metric Snapshot ─────────────────────────────────────────────────────
export type DORALevel = 'low' | 'medium' | 'high' | 'elite';

export interface DORASnapshot {
  period: string;               // "2026-02"
  deployment_frequency: {
    value: number;
    unit: 'per_day' | 'per_week' | 'per_month';
    level: DORALevel;
  };
  lead_time_hours: {
    p50: number;
    p95: number;
    level: DORALevel;
  };
  change_failure_rate_pct: {
    value: number;
    level: DORALevel;
  };
  mttr_hours: {
    p50: number;
    p95: number;
    level: DORALevel;
  };
  overall_level: DORALevel;
}

// ── Engineering KPI Snapshot ─────────────────────────────────────────────────
export interface EngineeringKPIs {
  period: string;
  code_coverage_pct: number;       // target: ≥80%
  pr_cycle_time_hours: number;     // target: <24
  sprint_velocity: number;         // story points
  velocity_trend: 'up' | 'down' | 'stable';
  incident_count: number;          // sev1 + sev2
  open_bugs_p0_p1: number;
  build_time_minutes: number;      // target: <10
  test_flakiness_pct: number;      // target: <1%
  security_critical_vulns: number; // target: 0
  uptime_pct: number;              // target: 99.9
  api_p95_latency_ms: number;      // target: <500
  error_rate_pct: number;          // target: <0.1
}

// ── Project ──────────────────────────────────────────────────────────────────
export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
export type Priority = 'critical' | 'high' | 'medium' | 'low';

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: Priority;
  team_department: Department;
  owner_id: string;
  start_date?: string;
  target_date?: string;
  completed_date?: string;
  budget_gbp?: number;
  spent_gbp?: number;
  github_repo?: string;
  deployment_url?: string;
  tasks_total: number;
  tasks_done: number;
  mcp_domain: MCPDomain;
  created_at: string;
}

// ── Roadmap Item ─────────────────────────────────────────────────────────────
export type RoadmapPhase = 'now' | 'next' | 'later' | 'backlog';
export type RoadmapArea = 'auth' | 'billing' | 'cli' | 'dashboard' | 'mcp' | 'infra' | 'dx' | 'ai';

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  area: RoadmapArea;
  phase: RoadmapPhase;
  priority: Priority;
  effort: 'xs' | 's' | 'm' | 'l' | 'xl';  // XS=hours, S=1-2d, M=1w, L=2-3w, XL=1mo+
  dependencies: string[];   // other item ids
  status: 'todo' | 'in_progress' | 'done' | 'cancelled';
  owner?: string;
  milestone?: string;
  github_issue?: number;
  notes?: string;
}
