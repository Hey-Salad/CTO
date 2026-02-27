/**
 * Logout command for SheriML CLI
 */

import ora from 'ora';
import { colors, symbols } from '../utils/colors';
import { SheriAuthClient } from '../utils/api-client';
import { clearAuth, isAuthenticated } from '../utils/auth';

export async function logoutCommand() {
  if (!isAuthenticated()) {
    console.log(colors.muted(`\n  Not authenticated\n`));
    return;
  }

  const spinner = ora(colors.muted('Logging out...')).start();

  try {
    // Call logout API to invalidate token on server
    const client = new SheriAuthClient();
    await client.logout();
    spinner.stop();

    // Clear local token
    clearAuth();

    console.log(colors.success(`\n  ${symbols.check} Logged out successfully\n`));
  } catch (error: any) {
    spinner.stop();
    // Even if API call fails, clear local token
    clearAuth();
    console.log(colors.success(`\n  ${symbols.check} Logged out locally\n`));
  }
}
