/**
 * Login command for SheriML CLI
 */

import inquirer from 'inquirer';
import ora from 'ora';
import { colors, symbols } from '../utils/colors';
import { SheriAuthClient } from '../utils/api-client';
import { saveAuth, isAuthenticated, getAuthData, isSSH, isCI } from '../utils/auth';
import * as readline from 'readline';

export async function loginCommand(options: { withToken?: boolean; register?: boolean }) {
  // Check if already authenticated
  if (isAuthenticated()) {
    const authData = getAuthData();
    console.log(colors.success(`\n  ${symbols.check} Already authenticated as ${authData?.email}\n`));
    console.log(colors.muted('  Run: sheri whoami\n'));
    return;
  }

  // CI detection
  if (isCI()) {
    console.log(colors.error(`\n  ${symbols.cross} CI environment detected\n`));
    console.log(colors.muted('  Set HEYSALAD_API_KEY environment variable:\n'));
    console.log(colors.white('    export HEYSALAD_API_KEY=hsa_xxx\n'));
    console.log(colors.muted('  Get token from: https://heysalad.app/settings/tokens\n'));
    process.exit(1);
  }

  const client = new SheriAuthClient();

  // Token input mode (for SSH/remote)
  if (options.withToken) {
    return await loginWithToken(client);
  }

  // SSH detection - suggest token input
  if (isSSH()) {
    console.log(colors.warning(`\n  ${symbols.warning} SSH session detected\n`));
    console.log(colors.muted('  For authentication over SSH:\n'));
    console.log(colors.white('    1. Generate token at: https://heysalad.app/settings/tokens'));
    console.log(colors.white('    2. Run: sheri login --with-token'));
    console.log(colors.white('    3. Paste token\n'));
    console.log(colors.muted('  Or use environment variable:\n'));
    console.log(colors.white('    export HEYSALAD_API_KEY=hsa_xxx\n'));

    const { proceed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: 'Continue with email/password login anyway?',
        default: false,
      },
    ]);

    if (!proceed) {
      return;
    }
  }

  // Register or login
  if (options.register) {
    await registerUser(client);
  } else {
    await loginUser(client);
  }
}

async function loginWithToken(client: SheriAuthClient) {
  console.log(colors.peach('\n  🍓 Enter your HeySalad API token\n'));
  console.log(colors.muted('  Generate at: https://heysalad.app/settings/tokens\n'));

  // Read token from stdin
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const token = await new Promise<string>((resolve) => {
    rl.question(colors.white('  Token: '), (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

  if (!token) {
    console.log(colors.error(`\n  ${symbols.cross} No token provided\n`));
    return;
  }

  // Validate token format
  if (!token.startsWith('hsa_')) {
    console.log(colors.warning(`\n  ${symbols.warning} Token should start with 'hsa_'\n`));
  }

  // Verify token by calling /auth/me
  const spinner = ora(colors.muted('Validating token...')).start();

  try {
    const user = await client.whoami(token);
    spinner.stop();

    // Save token
    saveAuth({
      token,
      email: user.user.email,
      plan: user.user.plan,
    });

    console.log(colors.success(`\n  ${symbols.check} Authenticated as ${user.user.email}`));
    console.log(colors.muted(`  Plan: ${user.user.plan}`));
    console.log(colors.muted(`  Usage today: ${user.usage.today.requests}/${user.usage.limits.requests} requests\n`));
  } catch (error: any) {
    spinner.stop();
    console.log(colors.error(`\n  ${symbols.cross} Invalid token: ${error.message}\n`));
    process.exit(1);
  }
}

async function loginUser(client: SheriAuthClient) {
  console.log(colors.peach('\n  🍓 Login to HeySalad\n'));

  const { email, password } = await inquirer.prompt([
    {
      type: 'input',
      name: 'email',
      message: 'Email:',
    },
    {
      type: 'password',
      name: 'password',
      message: 'Password:',
      mask: '*',
    },
  ]);

  const spinner = ora(colors.muted('Logging in...')).start();

  try {
    const response = await client.login(email, password);
    spinner.stop();

    // Save token
    saveAuth({
      token: response.token,
      email: response.user.email,
      plan: response.user.plan,
      expires_at: response.expires_at,
    });

    console.log(colors.success(`\n  ${symbols.check} Logged in as ${response.user.email}`));
    console.log(colors.muted(`  Plan: ${response.user.plan}\n`));
  } catch (error: any) {
    spinner.stop();
    const message = error.response?.data?.error || error.message;
    console.log(colors.error(`\n  ${symbols.cross} Login failed: ${message}\n`));
    process.exit(1);
  }
}

async function registerUser(client: SheriAuthClient) {
  console.log(colors.peach('\n  🍓 Register for HeySalad\n'));

  const { email, password, confirmPassword } = await inquirer.prompt([
    {
      type: 'input',
      name: 'email',
      message: 'Email:',
    },
    {
      type: 'password',
      name: 'password',
      message: 'Password:',
      mask: '*',
    },
    {
      type: 'password',
      name: 'confirmPassword',
      message: 'Confirm password:',
      mask: '*',
    },
  ]);

  if (password !== confirmPassword) {
    console.log(colors.error(`\n  ${symbols.cross} Passwords don't match\n`));
    return;
  }

  const spinner = ora(colors.muted('Creating account...')).start();

  try {
    const response = await client.register(email, password);
    spinner.stop();

    // Save token
    saveAuth({
      token: response.token,
      email: response.user.email,
      plan: response.user.plan,
      expires_at: response.expires_at,
    });

    console.log(colors.success(`\n  ${symbols.check} Account created!`));
    console.log(colors.muted(`  Email: ${response.user.email}`));
    console.log(colors.muted(`  Plan: Free (100 requests/day)\n`));
  } catch (error: any) {
    spinner.stop();
    const message = error.response?.data?.error || error.message;
    console.log(colors.error(`\n  ${symbols.cross} Registration failed: ${message}\n`));
    process.exit(1);
  }
}
