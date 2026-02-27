/**
 * API client for HeySalad Sheri Auth Service
 */

import axios from 'axios';
import { getToken } from './auth';

const AUTH_API_URL = 'https://heysalad-sheri-auth.heysalad-o.workers.dev';

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    plan: string;
  };
  token: string;
  expires_at: number;
}

export interface UserResponse {
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

export class SheriAuthClient {
  private baseUrl: string;

  constructor(baseUrl: string = AUTH_API_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Register new user
   */
  async register(email: string, password: string): Promise<LoginResponse> {
    const response = await axios.post(`${this.baseUrl}/auth/register`, {
      email,
      password,
    });
    return response.data;
  }

  /**
   * Login with email/password
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await axios.post(`${this.baseUrl}/auth/login`, {
      email,
      password,
    });
    return response.data;
  }

  /**
   * Get current user info
   */
  async whoami(token?: string): Promise<UserResponse> {
    const authToken = token || getToken();
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    const response = await axios.get(`${this.baseUrl}/auth/me`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    return response.data;
  }

  /**
   * Logout (invalidate token)
   */
  async logout(token?: string): Promise<void> {
    const authToken = token || getToken();
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    await axios.post(
      `${this.baseUrl}/auth/logout`,
      {},
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
  }

  /**
   * Generate new API token
   */
  async generateToken(token?: string): Promise<{ token: string; expires_at: number }> {
    const authToken = token || getToken();
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    const response = await axios.post(
      `${this.baseUrl}/auth/token/generate`,
      {},
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    return response.data;
  }

  /**
   * Revoke API token
   */
  async revokeToken(tokenToRevoke: string, authToken?: string): Promise<void> {
    const token = authToken || getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    await axios.post(
      `${this.baseUrl}/auth/token/revoke`,
      { token: tokenToRevoke },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  }
}
