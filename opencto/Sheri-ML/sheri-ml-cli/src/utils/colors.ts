// HeySalad Brand Colors & CLI Theme
// Cherry Red #ed4c4c | Peach #faa09a | Light Peach #ffd0cd | White #ffffff

import chalk from 'chalk';

// Brand color palette
export const colors = {
  // Primary brand colors
  cherryRed: chalk.hex('#ed4c4c'),
  peach: chalk.hex('#faa09a'),
  lightPeach: chalk.hex('#ffd0cd'),
  white: chalk.white,

  // Semantic colors (using brand palette)
  primary: chalk.hex('#ed4c4c'),      // Cherry red for primary actions
  secondary: chalk.hex('#faa09a'),    // Peach for secondary elements
  accent: chalk.hex('#ffd0cd'),       // Light peach for accents
  success: chalk.hex('#faa09a'),      // Peach for success
  warning: chalk.hex('#ed4c4c'),      // Cherry red for warnings
  error: chalk.hex('#ed4c4c').bold,   // Bold cherry red for errors
  info: chalk.hex('#faa09a'),         // Peach for info
  muted: chalk.gray,                  // Gray for muted text

  // UI elements
  prompt: chalk.hex('#ed4c4c'),
  spinner: 'red' as const,            // Ora spinner color
  border: chalk.hex('#ffd0cd'),       // Light peach borders
  highlight: chalk.hex('#ed4c4c').bold,
};

// Brand emoji & symbols
export const symbols = {
  strawberry: '🍓',
  logo: '🍓',
  check: '✓',
  cross: '✗',
  dot: '·',
  arrow: '▶',
  warning: '⚠',
  lightning: '⚡',
};

// Brand name with colors
export const BRAND = colors.cherryRed.bold('sheri') + chalk.bold('ml');
export const BRAND_WITH_STRAWBERRY = `${symbols.strawberry} ` + colors.cherryRed.bold('sheri') + chalk.bold('ml');

// ASCII art banner
export const BANNER = `
${colors.cherryRed('   _____ __              _ __  _____   ')}
${colors.cherryRed('  / ___// /_  ___  _____(_) / / /   |  ')}
${colors.cherryRed('  \\__ \\/ __ \\/ _ \\/ ___/ / / / / /| |  ')}
${colors.cherryRed(' ___/ / / / /  __/ /  / / / / / ___ |  ')}
${colors.cherryRed('/____/_/ /_/\\___/_/  /_/ /_/ /_/  |_|  ')}
${colors.peach('                                        ')}
${colors.peach('      🍓 Autonomous CTO · HeySalad       ')}
`;

// Utility functions
export function statusBadge(
  status: 'success' | 'error' | 'warning' | 'info',
  text: string
): string {
  const badges = {
    success: colors.success(`${symbols.check} ${text}`),
    error: colors.error(`${symbols.cross} ${text}`),
    warning: colors.warning(`${symbols.warning} ${text}`),
    info: colors.info(`${symbols.dot} ${text}`),
  };
  return badges[status];
}

export function separator(char = '─', length = 60): string {
  return colors.border(char.repeat(length));
}

export function header(text: string, emoji?: string): string {
  const prefix = emoji ? `${emoji} ` : `${symbols.strawberry} `;
  return `${prefix}${colors.highlight(text)}`;
}
