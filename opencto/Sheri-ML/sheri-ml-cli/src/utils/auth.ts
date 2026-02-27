/**
 * Authentication utilities for SheriML CLI
 * Handles token storage, retrieval, and validation
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Config } from './config';

const CONFIG_DIR = path.join(os.homedir(), '.config', 'heysalad');
const AUTH_FILE = path.join(CONFIG_DIR, 'auth.json');

export interface AuthData {
  token: string;
  email: string;
  plan: string;
  expires_at?: number;
}

export interface UserInfo {
  user: {
    id: string;
    email: string;
    plan: string;
    created_at: number;
  };
  usage: {
    today: {
      requests: number;
      tokens: number;
    };
    limits: {
      requests: number;
      tokens: number;
    };
  };
}

/**
 * Get authentication token in priority order:
 * 1. HEYSALAD_API_KEY environment variable
 * 2. Auth file (~/.config/heysalad/auth.json)
 * 3. Legacy config file (~/.sheri-ml/.env)
 */
export function getToken(): string | null {
  // Priority 1: Environment variable
  const envToken = process.env.HEYSALAD_API_KEY || process.env.SHERI_AUTH_TOKEN;
  if (envToken) {
    return envToken;
  }

  // Priority 2: Auth file
  try {
    if (fs.existsSync(AUTH_FILE)) {
      const data = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8')) as AuthData;
      if (data.token) {
        return data.token;
      }
    }
  } catch (err) {
    // Ignore errors, fall through to next method
  }

  // Priority 3: Legacy config file
  const legacyToken = Config.get('SHERI_AUTH_TOKEN') || Config.get('HEYSALAD_API_KEY');
  if (legacyToken) {
    return legacyToken;
  }

  return null;
}

/**
 * Save authentication data to config directory
 */
export function saveAuth(data: AuthData): void {
  // Ensure config directory exists
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }

  // Write auth file with 600 permissions (user read/write only)
  fs.writeFileSync(AUTH_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
}

/**
 * Clear authentication data
 */
export function clearAuth(): void {
  if (fs.existsSync(AUTH_FILE)) {
    fs.unlinkSync(AUTH_FILE);
  }

  // Also clear from legacy config
  const configKeys = ['SHERI_AUTH_TOKEN', 'HEYSALAD_API_KEY'];
  configKeys.forEach((key) => {
    try {
      Config.set(key, '');
    } catch (err) {
      // Ignore errors
    }
  });
}

/**
 * Get saved auth data (for displaying user info)
 */
export function getAuthData(): AuthData | null {
  try {
    if (fs.existsSync(AUTH_FILE)) {
      return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8')) as AuthData;
    }
  } catch (err) {
    // Ignore errors
  }
  return null;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getToken() !== null;
}

/**
 * Detect if running in SSH session
 */
export function isSSH(): boolean {
  return !!process.env.SSH_CONNECTION || !!process.env.SSH_CLIENT || !!process.env.SSH_TTY;
}

/**
 * Detect if running in CI environment
 */
export function isCI(): boolean {
  return !!(
    process.env.CI ||
    process.env.GITHUB_ACTIONS ||
    process.env.GITLAB_CI ||
    process.env.CIRCLECI ||
    process.env.TRAVIS ||
    process.env.JENKINS_URL ||
    process.env.BUILDKITE
  );
}
