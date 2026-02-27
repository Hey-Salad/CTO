import chalk from 'chalk';
import { DORASnapshot, EngineeringKPIs, DORALevel } from '../types/team';
import { colors, symbols, BRAND_WITH_STRAWBERRY } from '../utils/colors';

const BRAND = BRAND_WITH_STRAWBERRY;

const SAMPLE_DORA: DORASnapshot = {
  period: '2026-02',
  deployment_frequency: { value: 3, unit: 'per_week', level: 'medium' },
  lead_time_hours: { p50: 18, p95: 72, level: 'medium' },
  change_failure_rate_pct: { value: 8, level: 'high' },
  mttr_hours: { p50: 2, p95: 8, level: 'high' },
  overall_level: 'high',
};

const SAMPLE_KPIS: EngineeringKPIs = {
  period: '2026-02',
  code_coverage_pct: 74,
  pr_cycle_time_hours: 19,
  sprint_velocity: 42,
  velocity_trend: 'up',
  incident_count: 1,
  open_bugs_p0_p1: 2,
  build_time_minutes: 7,
  test_flakiness_pct: 0.8,
  security_critical_vulns: 0,
  uptime_pct: 99.94,
  api_p95_latency_ms: 387,
  error_rate_pct: 0.07,
};

function levelColor(level: DORALevel): chalk.Chalk {
  return level === 'elite' ? colors.success
    : level === 'high' ? colors.peach
    : level === 'medium' ? colors.lightPeach
    : colors.cherryRed;
}

function levelBadge(level: DORALevel): string {
  const map: Record<DORALevel, string> = {
    elite: `${symbols.lightning} ELITE`, high: `${symbols.check} HIGH`, medium: `~ MEDIUM`, low: `${symbols.cross} LOW`,
  };
  return levelColor(level)(map[level]);
}

function kpiStatus(value: number, target: number, lowerIsBetter = false): string {
  const ok = lowerIsBetter ? value <= target : value >= target;
  const icon = ok ? colors.success(symbols.check) : colors.warning(symbols.warning);
  const val = ok ? colors.success(String(value)) : colors.warning(String(value));
  return `${icon} ${val}`;
}

export function metricsCommand(args: string[]) {
  const sub = args[0] || 'dora';
  if (sub === 'dora') showDORA();
  else if (sub === 'kpis' || sub === 'engineering') showKPIs();
  else if (sub === 'all') { showDORA(); showKPIs(); }
  else console.log(chalk.yellow(`\n  Unknown: metrics ${sub}. Try: dora | kpis | all\n`));
}

function showDORA() {
  const d = SAMPLE_DORA;
  console.log(colors.peach.bold(`\n  ${BRAND}  DORA Metrics  `) + colors.muted(`(${d.period})`) + '  ' + levelBadge(d.overall_level) + '\n');

  const rows = [
    ['Deployment Frequency', `${d.deployment_frequency.value}×/${d.deployment_frequency.unit.replace('per_', '')}`, d.deployment_frequency.level, 'Elite: multiple/day'],
    ['Lead Time for Changes', `p50: ${d.lead_time_hours.p50}h  p95: ${d.lead_time_hours.p95}h`, d.lead_time_hours.level, 'Elite: <1 hour'],
    ['Change Failure Rate', `${d.change_failure_rate_pct.value}%`, d.change_failure_rate_pct.level, 'Elite: <5%'],
    ['MTTR', `p50: ${d.mttr_hours.p50}h  p95: ${d.mttr_hours.p95}h`, d.mttr_hours.level, 'Elite: <1 hour'],
  ] as const;

  for (const [name, value, level, target] of rows) {
    console.log(
      `  ${colors.white(name.padEnd(28))} ${colors.white(value.padEnd(22))} ${levelBadge(level as DORALevel).padEnd(18)} ${colors.muted(target)}`
    );
  }
  console.log(colors.muted(`\n  Tip: sheri metrics kpis   |   sheri metrics all\n`));
}

function showKPIs() {
  const k = SAMPLE_KPIS;
  console.log(colors.peach.bold(`\n  ${BRAND}  Engineering KPIs  `) + colors.muted(`(${k.period})\n`));

  const rows: Array<[string, string, boolean]> = [
    ['Code Coverage', `${kpiStatus(k.code_coverage_pct, 80)}% (target ≥80%)`, false],
    ['PR Cycle Time', `${kpiStatus(k.pr_cycle_time_hours, 24, true)}h (target <24h)`, false],
    ['Sprint Velocity', `${colors.white(String(k.sprint_velocity))} pts  ${colors.success('↑')} ${k.velocity_trend}`, false],
    ['Incidents (Sev1/2)', `${kpiStatus(k.incident_count, 2, true)} this period`, false],
    ['Open Bugs P0/P1', `${kpiStatus(k.open_bugs_p0_p1, 3, true)} open`, false],
    ['Build Time', `${kpiStatus(k.build_time_minutes, 10, true)}min (target <10)`, false],
    ['Test Flakiness', `${kpiStatus(k.test_flakiness_pct, 1, true)}% (target <1%)`, false],
    ['Critical Vulns', `${kpiStatus(k.security_critical_vulns, 0, true)} open`, false],
    ['Uptime', `${kpiStatus(k.uptime_pct, 99.9)}% (SLA 99.9%)`, false],
    ['API P95 Latency', `${kpiStatus(k.api_p95_latency_ms, 500, true)}ms (target <500ms)`, false],
    ['Error Rate', `${kpiStatus(k.error_rate_pct, 0.1, true)}% (target <0.1%)`, false],
  ];

  for (const [name, value] of rows) {
    console.log(`  ${colors.muted(name.padEnd(26))} ${value}`);
  }
  console.log();
}
