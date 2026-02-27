import chalk from 'chalk';
import { RoadmapItem, RoadmapPhase, RoadmapArea } from '../types/team';
import { colors, symbols, BRAND_WITH_STRAWBERRY, separator } from '../utils/colors';

const BRAND = BRAND_WITH_STRAWBERRY;

const ROADMAP: RoadmapItem[] = [
  // ── NOW ──────────────────────────────────────────────────────────────────
  {
    id: 'r_001', title: 'Wire billing /check into MCP Gateway',
    description: 'MCP Gateway calls sheri-billing /check before each request. Reports tokens via /usage after response. Enables real revenue tracking.',
    area: 'billing', phase: 'now', priority: 'critical', effort: 's',
    dependencies: [], status: 'in_progress', owner: 'peter',
    milestone: 'v0.3 — Monetisation Live',
  },
  {
    id: 'r_002', title: 'Sign-up page (email → API key)',
    description: 'React page: email + plan selection → POST /customers → API key shown once. Stripe Checkout for paid plans.',
    area: 'auth', phase: 'now', priority: 'critical', effort: 'm',
    dependencies: ['r_001'], status: 'todo', owner: 'peter',
    milestone: 'v0.3 — Monetisation Live',
  },
  {
    id: 'r_003', title: 'Auth: JWT + refresh tokens',
    description: 'POST /auth/signup, /auth/login → JWT (15m) + httpOnly refresh cookie (30d). bcrypt password, email verification.',
    area: 'auth', phase: 'now', priority: 'critical', effort: 'm',
    dependencies: [], status: 'todo', owner: 'peter',
    milestone: 'v0.3 — Monetisation Live',
  },
  {
    id: 'r_004', title: 'CLI: sheri team + sheri metrics commands',
    description: 'New CLI commands for team roster, tool costs, DORA metrics, engineering KPIs.',
    area: 'cli', phase: 'now', priority: 'high', effort: 's',
    dependencies: [], status: 'in_progress', owner: 'peter',
    milestone: 'v0.2.1',
  },
  {
    id: 'r_005', title: 'Vitest test suite (CLI)',
    description: 'Unit tests: MCPProvider, GeminiProvider, Config. Integration: CLI commands. >80% coverage. Required before npm publish.',
    area: 'dx', phase: 'now', priority: 'high', effort: 'm',
    dependencies: [], status: 'todo', owner: 'peter',
    milestone: 'v0.2.1',
  },
  {
    id: 'r_006', title: 'GitHub Actions CI workflow',
    description: 'ci.yml: lint + typecheck + test on PR. release.yml: npm publish on tag v*. check-secrets.yml: block committed keys.',
    area: 'dx', phase: 'now', priority: 'high', effort: 's',
    dependencies: ['r_005'], status: 'todo', owner: 'peter',
    milestone: 'v0.2.1',
  },

  // ── NEXT ─────────────────────────────────────────────────────────────────
  {
    id: 'r_007', title: 'Dashboard: Auth (login/signup pages)',
    description: 'Add login + signup to sheri-ml-dashboard using new auth worker. Protected routes, session management.',
    area: 'dashboard', phase: 'next', priority: 'high', effort: 'm',
    dependencies: ['r_003'], status: 'todo',
    milestone: 'v0.4 — Dashboard Auth',
  },
  {
    id: 'r_008', title: 'Dashboard: Billing page (usage + upgrade)',
    description: 'Show tokens used, plan details, Stripe Checkout for upgrades, invoice history.',
    area: 'dashboard', phase: 'next', priority: 'high', effort: 'm',
    dependencies: ['r_007', 'r_001'], status: 'todo',
    milestone: 'v0.4 — Dashboard Auth',
  },
  {
    id: 'r_009', title: 'Dashboard: Team page (members, tools, costs)',
    description: 'Full team roster with DORA metrics, tool costs breakdown, burn rate chart.',
    area: 'dashboard', phase: 'next', priority: 'medium', effort: 'l',
    dependencies: ['r_007'], status: 'todo',
    milestone: 'v0.4 — Dashboard Auth',
  },
  {
    id: 'r_010', title: 'npm publish @heysalad/sheri-ml-cli',
    description: 'Publish v0.2.x to npm under @heysalad org. Requires tests passing in CI.',
    area: 'cli', phase: 'next', priority: 'high', effort: 'xs',
    dependencies: ['r_005', 'r_006'], status: 'todo', owner: 'peter',
    milestone: 'v0.2.1',
  },
  {
    id: 'r_011', title: 'OAuth: Google + GitHub login',
    description: 'Add OAuth providers to auth worker. Reduces friction for developer sign-up.',
    area: 'auth', phase: 'next', priority: 'medium', effort: 'm',
    dependencies: ['r_003'], status: 'todo',
    milestone: 'v0.5',
  },
  {
    id: 'r_012', title: 'Two-factor auth (TOTP)',
    description: 'TOTP 2FA for security-conscious enterprise users. QR code setup flow.',
    area: 'auth', phase: 'next', priority: 'medium', effort: 'm',
    dependencies: ['r_003'], status: 'todo',
    milestone: 'v0.5',
  },
  {
    id: 'r_013', title: 'MCP Gateway: per-customer rate limiting',
    description: 'Replace shared API key with per-customer keys. Each request validated + metered via billing worker.',
    area: 'mcp', phase: 'next', priority: 'critical', effort: 'm',
    dependencies: ['r_001'], status: 'todo',
    milestone: 'v0.3 — Monetisation Live',
  },
  {
    id: 'r_014', title: 'RAG: seed real HeySalad knowledge base',
    description: 'Index real playbooks, policies, product docs into Vectorize. Currently 37 placeholder chunks.',
    area: 'mcp', phase: 'next', priority: 'high', effort: 'm',
    dependencies: [], status: 'todo',
    milestone: 'v0.3',
  },

  // ── LATER ────────────────────────────────────────────────────────────────
  {
    id: 'r_015', title: 'Gemini Live API: full WebSocket relay fix',
    description: 'Complete debugging of Cloudflare Durable Object ↔ Gemini Live API relay. True real-time voice.',
    area: 'ai', phase: 'later', priority: 'high', effort: 'l',
    dependencies: [], status: 'todo',
    milestone: 'v0.5 — Voice',
  },
  {
    id: 'r_016', title: 'Multi-tenant teams + seat management',
    description: 'Org-level accounts with team invites, per-seat billing, RBAC (admin/member/viewer).',
    area: 'billing', phase: 'later', priority: 'medium', effort: 'xl',
    dependencies: ['r_007', 'r_011'], status: 'todo',
    milestone: 'v0.6 — Teams',
  },
  {
    id: 'r_017', title: 'CLI: sheri project + sheri deploy',
    description: 'Project tracking from CLI. Create tickets, check sprint, trigger deploys via MCP.',
    area: 'cli', phase: 'later', priority: 'medium', effort: 'l',
    dependencies: ['r_010'], status: 'todo',
    milestone: 'v0.3',
  },
  {
    id: 'r_018', title: 'SAML/SSO (Cloudflare Access)',
    description: 'Enterprise SSO. Teams plan and above. Cloudflare Access with SAML 2.0.',
    area: 'auth', phase: 'later', priority: 'low', effort: 'm',
    dependencies: ['r_011'], status: 'todo',
    milestone: 'v0.7 — Enterprise',
  },
  {
    id: 'r_019', title: 'SOC2 Type II compliance (Vanta)',
    description: 'Start compliance automation. Required for enterprise customers. ~6 month process.',
    area: 'infra', phase: 'later', priority: 'medium', effort: 'xl',
    dependencies: [], status: 'todo',
    milestone: 'v1.0 — Enterprise Ready',
  },
  {
    id: 'r_020', title: 'Sheri ML 120B self-hosted deployment',
    description: 'Deploy DeepSeek-R1-120B on GCP g2-standard-24 with dual L4 GPUs.',
    area: 'infra', phase: 'later', priority: 'high', effort: 'l',
    dependencies: [], status: 'todo',
    milestone: 'v0.4',
  },
];

const EFFORT_LABELS: Record<string, string> = {
  xs: 'hours', s: '1-2 days', m: '1 week', l: '2-3 weeks', xl: '1 month+',
};

const AREA_COLORS: Record<RoadmapArea, chalk.Chalk> = {
  auth: colors.peach, billing: colors.success, cli: colors.cherryRed,
  dashboard: colors.lightPeach, mcp: colors.peach, infra: colors.lightPeach,
  dx: colors.muted, ai: colors.peach,
};

function phaseColor(phase: RoadmapPhase): chalk.Chalk {
  return phase === 'now' ? colors.cherryRed
    : phase === 'next' ? colors.peach
    : phase === 'later' ? colors.lightPeach
    : colors.muted;
}

export function roadmapCommand(args: string[]) {
  const sub = args[0] || 'view';
  const filter = args[1];

  if (sub === 'view' || sub === 'list') showRoadmap(filter as RoadmapPhase | undefined);
  else if (sub === 'now') showRoadmap('now');
  else if (sub === 'next') showRoadmap('next');
  else if (sub === 'later') showRoadmap('later');
  else if (sub === 'milestones') showMilestones();
  else console.log(chalk.yellow(`\n  Unknown: roadmap ${sub}. Try: now | next | later | milestones\n`));
}

function showRoadmap(phaseFilter?: RoadmapPhase) {
  const phases: RoadmapPhase[] = phaseFilter ? [phaseFilter] : ['now', 'next', 'later'];
  console.log(colors.peach.bold(`\n  ${BRAND}  Roadmap\n`));

  for (const phase of phases) {
    const items = ROADMAP.filter(r => r.phase === phase);
    if (!items.length) continue;

    const phaseLabel = phase.toUpperCase().padEnd(8);
    console.log(phaseColor(phase).bold(`  ── ${phaseLabel} `) + separator('─', 70));
    console.log();

    for (const item of items) {
      const status = item.status === 'done' ? colors.success(symbols.check)
        : item.status === 'in_progress' ? colors.peach('◐')
        : colors.muted('○');
      const priority = item.priority === 'critical' ? colors.cherryRed(symbols.lightning)
        : item.priority === 'high' ? colors.peach('▲')
        : colors.muted(symbols.dot);
      const area = AREA_COLORS[item.area](item.area.padEnd(12));
      const effort = colors.muted(EFFORT_LABELS[item.effort].padEnd(12));
      const milestone = item.milestone ? colors.muted(`[${item.milestone}]`) : '';

      console.log(`  ${status} ${priority} ${colors.white(item.title.padEnd(46))} ${area} ${effort} ${milestone}`);
      if (phaseFilter) {
        console.log(colors.muted(`       ${item.description.slice(0, 90)}${item.description.length > 90 ? '...' : ''}`));
        console.log();
      }
    }
    console.log();
  }

  if (!phaseFilter) {
    const done = ROADMAP.filter(r => r.status === 'done').length;
    const inProgress = ROADMAP.filter(r => r.status === 'in_progress').length;
    const total = ROADMAP.length;
    console.log(colors.muted(`  ${total} items  ·  ${inProgress} in progress  ·  ${done} done\n`));
    console.log(colors.muted('  sheri roadmap now     → show details for current work'));
    console.log(colors.muted('  sheri roadmap milestones → grouped by release\n'));
  }
}

function showMilestones() {
  console.log(colors.peach.bold(`\n  ${BRAND}  Milestones\n`));

  const milestoneMap = new Map<string, RoadmapItem[]>();
  for (const item of ROADMAP) {
    if (item.milestone) {
      if (!milestoneMap.has(item.milestone)) milestoneMap.set(item.milestone, []);
      milestoneMap.get(item.milestone)!.push(item);
    }
  }

  for (const [milestone, items] of milestoneMap) {
    const done = items.filter(i => i.status === 'done').length;
    const progress = `${done}/${items.length}`;
    const phaseLabel = items[0].phase;

    console.log(phaseColor(phaseLabel).bold(`  ${symbols.strawberry} ${milestone}`) + colors.muted(` (${progress} done)`));
    for (const item of items) {
      const status = item.status === 'done' ? colors.success(symbols.check)
        : item.status === 'in_progress' ? colors.peach('◐')
        : colors.muted('○');
      console.log(`    ${status} ${colors.muted(item.title)}`);
    }
    console.log();
  }
}
