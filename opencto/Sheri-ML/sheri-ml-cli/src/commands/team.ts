import chalk from 'chalk';
import { TeamMember, TeamTool, Department, Seniority } from '../types/team';
import { colors, symbols, BRAND_WITH_STRAWBERRY, separator } from '../utils/colors';

const BRAND = BRAND_WITH_STRAWBERRY;

// ── Seed data ── (replace with API calls in production)
const SAMPLE_TEAM: TeamMember[] = [
  {
    id: 'tm_001', name: 'Peter Machona', email: 'peter@heysalad.io',
    role_title: 'CTO & Co-Founder', department: 'leadership', seniority: 'c-level',
    salary_gbp: 130000, hire_date: '2024-01-01', status: 'active',
    mcp_domain: 'executive', github_handle: 'peter-heysalad',
    location: 'London, UK', hire_stage: 'seed',
  },
  {
    id: 'tm_002', name: 'Senior Backend Engineer', email: 'eng1@heysalad.io',
    role_title: 'Senior Backend Engineer', department: 'engineering', seniority: 'senior',
    salary_gbp: 85000, hire_date: '2024-03-01', status: 'active',
    mcp_domain: 'engineering', location: 'Remote, UK', hire_stage: 'seed',
  },
];

const SAMPLE_TOOLS: TeamTool[] = [
  {
    id: 'tl_001', name: 'GitHub Team', vendor: 'GitHub', category: 'version-control',
    plan_name: 'Team', cost_per_seat_gbp: 3.60, seat_count: 5, flat_monthly_gbp: 0,
    billing_cycle: 'monthly', annual_total_gbp: 216, is_essential: true,
    free_tier_available: true, team_departments: ['engineering', 'devops'],
    alternatives: ['GitLab', 'Bitbucket'],
  },
  {
    id: 'tl_002', name: 'Linear', vendor: 'Linear Orbit', category: 'project-management',
    plan_name: 'Team', cost_per_seat_gbp: 8, seat_count: 5, flat_monthly_gbp: 0,
    billing_cycle: 'monthly', annual_total_gbp: 480, is_essential: true,
    free_tier_available: true, team_departments: ['engineering', 'product', 'design'],
    alternatives: ['Jira', 'Shortcut'],
  },
  {
    id: 'tl_003', name: 'Slack', vendor: 'Salesforce', category: 'communication',
    plan_name: 'Pro', cost_per_seat_gbp: 7.25, seat_count: 5, flat_monthly_gbp: 0,
    billing_cycle: 'monthly', annual_total_gbp: 435, is_essential: true,
    free_tier_available: true, team_departments: ['engineering','product','design','sales','marketing'],
    alternatives: ['Teams', 'Discord'],
  },
  {
    id: 'tl_004', name: 'Cloudflare Workers', vendor: 'Cloudflare', category: 'infrastructure',
    plan_name: 'Workers Paid', cost_per_seat_gbp: 0, seat_count: 0, flat_monthly_gbp: 5,
    billing_cycle: 'monthly', annual_total_gbp: 60, is_essential: true,
    free_tier_available: true, team_departments: ['engineering', 'devops'],
    alternatives: ['AWS Lambda', 'Vercel Edge'],
  },
  {
    id: 'tl_005', name: 'Sentry', vendor: 'Sentry', category: 'monitoring',
    plan_name: 'Team', cost_per_seat_gbp: 0, seat_count: 0, flat_monthly_gbp: 20,
    billing_cycle: 'monthly', annual_total_gbp: 240, is_essential: true,
    free_tier_available: true, team_departments: ['engineering'],
    alternatives: ['Rollbar', 'Bugsnag'],
  },
  {
    id: 'tl_006', name: 'Notion', vendor: 'Notion Labs', category: 'documentation',
    plan_name: 'Plus', cost_per_seat_gbp: 9.50, seat_count: 5, flat_monthly_gbp: 0,
    billing_cycle: 'monthly', annual_total_gbp: 570, is_essential: false,
    free_tier_available: true, team_departments: ['engineering','product','people'],
    alternatives: ['Confluence', 'Slab'],
  },
  {
    id: 'tl_007', name: '1Password Teams', vendor: '1Password', category: 'security',
    plan_name: 'Teams', cost_per_seat_gbp: 3.99, seat_count: 5, flat_monthly_gbp: 0,
    billing_cycle: 'monthly', annual_total_gbp: 239, is_essential: true,
    free_tier_available: false, team_departments: ['engineering','devops','people'],
    alternatives: ['Bitwarden', 'Keeper'],
  },
];

function calcMonthly(tool: TeamTool): number {
  return tool.flat_monthly_gbp > 0
    ? tool.flat_monthly_gbp
    : tool.cost_per_seat_gbp * tool.seat_count;
}

export function teamCommand(args: string[]) {
  const sub = args[0] || 'list';

  if (sub === 'list' || sub === 'members') {
    listTeam();
  } else if (sub === 'tools') {
    listTools();
  } else if (sub === 'cost') {
    showCosts();
  } else if (sub === 'help') {
    showHelp();
  } else {
    console.log(chalk.yellow(`\n  Unknown: team ${sub}. Try: team list | team tools | team cost\n`));
  }
}

function listTeam() {
  console.log(colors.peach.bold(`\n  ${BRAND}  Team Members\n`));
  console.log(
    colors.muted('  ') +
    colors.white('Name'.padEnd(26)) +
    colors.white('Role'.padEnd(30)) +
    colors.white('Dept'.padEnd(16)) +
    colors.white('Seniority'.padEnd(12)) +
    colors.white('Salary (GBP)'.padEnd(14)) +
    colors.white('Domain')
  );
  console.log('  ' + separator('─', 110));

  for (const m of SAMPLE_TEAM) {
    const salary = `£${(m.salary_gbp / 1000).toFixed(0)}K`;
    const seniorityColor = m.seniority === 'c-level' ? colors.cherryRed : colors.white;
    console.log(
      colors.muted('  ') +
      colors.white(m.name.padEnd(26)) +
      colors.muted(m.role_title.padEnd(30)) +
      colors.peach(m.department.padEnd(16)) +
      seniorityColor(m.seniority.padEnd(12)) +
      colors.success(salary.padEnd(14)) +
      colors.cherryRed(m.mcp_domain)
    );
  }

  const totalSalary = SAMPLE_TEAM.filter(m => m.status === 'active').reduce((s, m) => s + m.salary_gbp, 0);
  const totalMonthly = Math.round(totalSalary / 12);
  console.log('\n  ' + separator('─', 110));
  console.log(colors.muted(`  ${SAMPLE_TEAM.filter(m => m.status === 'active').length} people  ·  Annual: `) + colors.success(`£${totalSalary.toLocaleString()}`) + colors.muted('  ·  Monthly: ') + colors.success(`£${totalMonthly.toLocaleString()}`));
  console.log(colors.muted(`\n  Tip: sheri team tools   |   sheri team cost\n`));
}

function listTools() {
  console.log(colors.peach.bold(`\n  ${BRAND}  Tools & Subscriptions\n`));
  console.log(
    colors.muted('  ') +
    colors.white('Tool'.padEnd(24)) +
    colors.white('Category'.padEnd(22)) +
    colors.white('Plan'.padEnd(16)) +
    colors.white('Seats'.padEnd(8)) +
    colors.white('/month'.padEnd(12)) +
    colors.white('/year'.padEnd(12)) +
    colors.white('Essential')
  );
  console.log('  ' + separator('─', 108));

  let totalMonthly = 0;
  let totalAnnual = 0;

  for (const t of SAMPLE_TOOLS) {
    const monthly = calcMonthly(t);
    totalMonthly += monthly;
    totalAnnual += t.annual_total_gbp;
    const essential = t.is_essential ? colors.success(symbols.check) : colors.muted(symbols.dot);
    const seats = t.seat_count > 0 ? String(t.seat_count) : 'flat';
    console.log(
      colors.muted('  ') +
      colors.white(t.name.padEnd(24)) +
      colors.peach(t.category.padEnd(22)) +
      colors.muted(t.plan_name.padEnd(16)) +
      colors.muted(seats.padEnd(8)) +
      colors.success(`£${monthly.toFixed(0)}/mo`.padEnd(12)) +
      colors.muted(`£${t.annual_total_gbp}/yr`.padEnd(12)) +
      essential
    );
  }

  console.log('\n  ' + separator('─', 108));
  console.log(colors.muted(`  ${SAMPLE_TOOLS.length} tools  ·  Monthly: `) + colors.success(`£${totalMonthly.toFixed(0)}`) + colors.muted('  ·  Annual: ') + colors.success(`£${totalAnnual.toLocaleString()}`));
  console.log(colors.muted('\n  Add a tool: sheri team tools --add   |   All costs: sheri team cost\n'));
}

function showCosts() {
  const activePeople = SAMPLE_TEAM.filter(m => m.status === 'active');
  const totalSalary = activePeople.reduce((s, m) => s + m.salary_gbp, 0);
  const monthlyPeople = Math.round(totalSalary / 12);
  const monthlyTools = SAMPLE_TOOLS.reduce((s, t) => s + calcMonthly(t), 0);

  // Infra costs from known values
  const infraCosts = {
    'Cheri ML (GCP T4)': 252,
    'Sheri ML (GCP 2×L4)': 648,
    'GCP Extras': 45,
    'Cloudflare Paid': 5,
    'Vertex AI (Beri)': 300,
  };
  const monthlyInfra = Object.values(infraCosts).reduce((a, b) => a + b, 0);
  const totalMonthly = monthlyPeople + monthlyTools + monthlyInfra;

  console.log(colors.peach.bold(`\n  ${BRAND}  Monthly Cost Breakdown\n`));

  const sections: Array<[string, Record<string, number>]> = [
    ['People', activePeople.reduce((obj, m) => ({ ...obj, [m.role_title]: Math.round(m.salary_gbp / 12) }), {})],
    ['Tools & SaaS', SAMPLE_TOOLS.reduce((obj, t) => ({ ...obj, [t.name]: Math.round(calcMonthly(t)) }), {})],
    ['Infrastructure', infraCosts],
  ];

  for (const [section, items] of sections) {
    const sectionTotal = Object.values(items).reduce((a, b) => a + b, 0);
    console.log(colors.cherryRed.bold(`  ${section}`) + colors.muted(`  (£${sectionTotal.toLocaleString()}/mo)`));
    for (const [name, cost] of Object.entries(items)) {
      const bar = '█'.repeat(Math.max(1, Math.round(cost / 500)));
      console.log(`    ${colors.muted(name.padEnd(36))} ${colors.success(`£${cost.toLocaleString()}`.padStart(8))}  ${colors.muted(bar)}`);
    }
    console.log();
  }

  console.log('  ' + separator('─', 60));
  console.log(`  ${'TOTAL MONTHLY BURN'.padEnd(36)} ${colors.cherryRed.bold(`£${totalMonthly.toLocaleString()}`)}`);
  console.log(`  ${'TOTAL ANNUAL BURN'.padEnd(36)} ${colors.cherryRed(`£${(totalMonthly * 12).toLocaleString()}`)}`);

  // Break-even
  const breakEven = Math.ceil(totalMonthly / 29);  // at £29/month Developer plan
  console.log(colors.muted(`\n  Break-even at Developer plan (£29/mo): `) + colors.peach(`${breakEven} paying customers`));
  console.log(colors.muted(`  Break-even at Professional plan (£99/mo): `) + colors.peach(`${Math.ceil(totalMonthly / 99)} paying customers\n`));
}

function showHelp() {
  console.log(chalk.cyan.bold(`\n  sheri team — Commands\n`));
  const cmds = [
    ['sheri team list', 'Show all team members, salaries, domains'],
    ['sheri team tools', 'List all tools/subscriptions with costs'],
    ['sheri team cost', 'Full monthly burn breakdown with break-even'],
  ];
  for (const [cmd, desc] of cmds) {
    console.log(`  ${chalk.white(cmd.padEnd(30))} ${chalk.gray(desc)}`);
  }
  console.log();
}
