/**
 * Whoami command for SheriML CLI
 */

import ora from 'ora';
import { colors, symbols } from '../utils/colors';
import { SheriAuthClient } from '../utils/api-client';
import { isAuthenticated, getAuthData } from '../utils/auth';

export async function whoamiCommand() {
  if (!isAuthenticated()) {
    console.log(colors.error(`\n  ${symbols.cross} Not authenticated\n`));
    console.log(colors.muted('  Run: sheri login\n'));
    process.exit(1);
  }

  const spinner = ora(colors.muted('Fetching user info...')).start();

  try {
    const client = new SheriAuthClient();
    const user = await client.whoami();
    spinner.stop();

    // Display user info
    console.log(colors.peach('\n  🍓 User Information\n'));
    console.log(colors.white(`  Email:       ${user.user.email}`));
    console.log(colors.white(`  Plan:        ${user.user.plan}`));

    // Format created date
    const created = new Date(user.user.created_at * 1000).toLocaleDateString();
    console.log(colors.white(`  Member since: ${created}`));

    // Usage info
    console.log(colors.peach('\n  Usage Today\n'));
    const requestsPercent = Math.round((user.usage.today.requests / user.usage.limits.requests) * 100);
    const tokensPercent = Math.round((user.usage.today.tokens / user.usage.limits.tokens) * 100);

    const requestsColor = requestsPercent > 80 ? colors.error : requestsPercent > 50 ? colors.warning : colors.success;
    const tokensColor = tokensPercent > 80 ? colors.error : tokensPercent > 50 ? colors.warning : colors.success;

    console.log(requestsColor(`  Requests:    ${user.usage.today.requests}/${user.usage.limits.requests} (${requestsPercent}%)`));
    console.log(tokensColor(`  Tokens:      ${user.usage.today.tokens}/${user.usage.limits.tokens} (${tokensPercent}%)`));

    // Plan info
    if (user.user.plan === 'free') {
      console.log(colors.peach('\n  Upgrade\n'));
      console.log(colors.muted('  Need more? Upgrade to Pro for 2,000 requests/day'));
      console.log(colors.muted('  Visit: https://heysalad.app/pricing\n'));
    } else {
      console.log();
    }
  } catch (error: any) {
    spinner.stop();

    // Show cached data if API fails
    const authData = getAuthData();
    if (authData) {
      console.log(colors.warning(`\n  ${symbols.warning} API unavailable, showing cached info\n`));
      console.log(colors.white(`  Email: ${authData.email}`));
      console.log(colors.white(`  Plan:  ${authData.plan}\n`));
    } else {
      const message = error.response?.data?.error || error.message;
      console.log(colors.error(`\n  ${symbols.cross} Error: ${message}\n`));
      process.exit(1);
    }
  }
}
