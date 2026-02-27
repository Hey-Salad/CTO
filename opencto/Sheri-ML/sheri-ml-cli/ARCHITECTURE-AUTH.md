# 🍓 SheriML Auth & Plans Architecture

**Date:** 2026-02-22
**Purpose:** Add authentication and plan-based access to SheriML CLI

---

## 🎯 Business Model

**Current Problem:**
- Users must configure their own API keys (Google, Anthropic, etc.)
- Friction in onboarding
- No revenue model
- No usage tracking

**New Model:**
- Users authenticate with HeySalad
- We provide the AI models (via Vertex API)
- Users subscribe to plans
- We track usage and enforce limits

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        SheriML CLI                          │
│  - sheri login (email/password or magic link)              │
│  - sheri logout                                             │
│  - sheri whoami                                             │
│  - sheri plan (show current plan)                          │
│  Token stored in ~/.sheri-ml/.env                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    Authorization: Bearer <token>
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              SheriML Auth Service (Workers)                 │
│  - POST /auth/login         (email/password → JWT)         │
│  - POST /auth/magic-link    (send magic link email)        │
│  - POST /auth/verify        (verify magic link token)      │
│  - GET  /auth/me            (get user info & plan)         │
│  - POST /auth/logout        (invalidate token)             │
│                                                              │
│  Database (D1):                                             │
│  - users (id, email, hashed_password, plan, created_at)    │
│  - tokens (token, user_id, expires_at)                     │
│  - usage (user_id, date, requests, tokens_used)            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│           SheriML API Gateway (Workers)                     │
│  - POST /v1/generate        (generate code)                │
│  - Validates JWT token                                      │
│  - Checks user plan & limits                               │
│  - Tracks usage                                             │
│  - Proxies to Vertex AI                                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
                         Vertex AI API
                    (Gemini 2.5 Flash, etc.)
```

---

## 📊 Plans

### Free Plan
- **Cost:** $0/month
- **Limits:**
  - 100 requests/day
  - 50K tokens/day
  - Gemini Flash only
  - Basic support

### Pro Plan
- **Cost:** $20/month
- **Limits:**
  - 2,000 requests/day
  - 500K tokens/day
  - All models (Gemini Flash, Pro, Claude)
  - Priority support
  - Advanced features (file uploads, multi-turn context)

### Enterprise Plan
- **Cost:** $200/month
- **Limits:**
  - Unlimited requests
  - Unlimited tokens
  - All models + custom fine-tuned models
  - Dedicated support
  - SLA guarantees
  - Private deployment option

---

## 🔐 Authentication Flow

### Option 1: Email/Password
```bash
$ sheri login
Email: user@example.com
Password: ********

✓ Logged in as user@example.com (Free plan)
```

### Option 2: Magic Link (Better UX)
```bash
$ sheri login user@example.com

✓ Magic link sent to user@example.com
  Check your inbox and click the link to authenticate.

# User clicks link, CLI polls for token
✓ Authenticated! Welcome back, user@example.com
```

### Token Storage
```bash
# ~/.sheri-ml/.env
SHERI_AUTH_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SHERI_USER_EMAIL=user@example.com
SHERI_USER_PLAN=pro
```

---

## 🛠️ Implementation Plan

### Phase 1: Auth Service (Cloudflare Worker)
**File:** `heysalad-sheri-auth`
**Database:** D1 (`sheri-auth-db`)

**Endpoints:**
```typescript
POST /auth/register
  Body: { email, password }
  Returns: { user_id, email, plan: "free" }

POST /auth/login
  Body: { email, password }
  Returns: { token, expires_at, user: { email, plan } }

POST /auth/magic-link
  Body: { email }
  Returns: { message: "Magic link sent" }

GET /auth/verify?token=xxx
  Returns: { token, user: { email, plan } }

GET /auth/me
  Headers: Authorization: Bearer <token>
  Returns: { email, plan, usage: { requests_today, tokens_today } }

POST /auth/logout
  Headers: Authorization: Bearer <token>
  Returns: { message: "Logged out" }
```

**D1 Schema:**
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  plan TEXT DEFAULT 'free',
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE auth_tokens (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE magic_links (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE usage (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  requests INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_usage_user_date ON usage(user_id, date);
```

### Phase 2: API Gateway (Cloudflare Worker)
**File:** `heysalad-sheri-api`

**Endpoints:**
```typescript
POST /v1/generate
  Headers: Authorization: Bearer <token>
  Body: { prompt, model, temperature, max_tokens }
  Returns: { response, usage: { prompt_tokens, completion_tokens } }

GET /v1/models
  Headers: Authorization: Bearer <token>
  Returns: { models: [{ id, name, plan_required }] }

GET /v1/usage
  Headers: Authorization: Bearer <token>
  Returns: { today: { requests, tokens }, plan_limits: { ... } }
```

**Logic:**
1. Validate JWT token
2. Get user from database
3. Check plan limits
4. If within limits:
   - Call Vertex AI
   - Track usage
   - Return response
5. If exceeded:
   - Return 429 with upgrade message

### Phase 3: CLI Updates
**Files:** `src/cli-v2.ts`, `src/commands/auth.ts`, `src/utils/api-client.ts`

**New Commands:**
```bash
sheri login [email]           # Magic link or interactive
sheri logout                   # Clear token
sheri whoami                   # Show user info
sheri plan                     # Show current plan & usage
sheri upgrade                  # Upgrade to Pro/Enterprise
```

**Authentication Flow:**
```typescript
// src/utils/api-client.ts
export class SheriAPIClient {
  private baseUrl = 'https://sheri-api.heysalad.app';
  private token: string | null;

  constructor() {
    this.token = Config.get('SHERI_AUTH_TOKEN');
  }

  async generate(prompt: string, options = {}) {
    if (!this.token) {
      throw new Error('Not authenticated. Run: sheri login');
    }

    const response = await fetch(`${this.baseUrl}/v1/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, ...options }),
    });

    if (response.status === 401) {
      throw new Error('Authentication expired. Run: sheri login');
    }

    if (response.status === 429) {
      const data = await response.json();
      throw new Error(`Rate limit exceeded. ${data.message}`);
    }

    return response.json();
  }
}
```

### Phase 4: Migration Path
**For existing users with their own API keys:**
- Keep backward compatibility
- If `SHERI_AUTH_TOKEN` exists → use our API
- If `GOOGLE_AI_STUDIO_KEY` exists → use direct (old way)
- Show message: "Upgrade to managed plans for better experience"

---

## 💰 Revenue Model

### Pricing Strategy
- **Free:** Loss leader, 100 req/day @ $0.0001/req = $0.01/day/user → ~$3.65/year
- **Pro:** $20/mo, 2000 req/day @ $0.0001/req = $0.20/day → $6/mo cost → ~$14/mo profit
- **Enterprise:** $200/mo, unlimited → negotiate based on usage

### Cost Calculation (Vertex AI)
- Gemini 2.5 Flash: ~$0.0001/request (rough estimate)
- Claude Sonnet (via Vertex): ~$0.001/request
- Our markup: 2-3x cost

### Target Metrics
- 10,000 free users
- 500 pro users ($10K MRR)
- 50 enterprise users ($10K MRR)
- **Total:** $20K MRR

---

## 🚀 Deployment Steps

### 1. Create Auth Service
```bash
cd ~/heysalad-sheri-auth
wrangler init heysalad-sheri-auth
wrangler d1 create sheri-auth-db
wrangler d1 execute sheri-auth-db --file=schema.sql
wrangler deploy
```

### 2. Create API Gateway
```bash
cd ~/heysalad-sheri-api
wrangler init heysalad-sheri-api
# Bind to same D1 database
wrangler deploy
```

### 3. Update CLI
```bash
cd ~/sheri-ml-cli
# Add new auth commands
npm run build
npm version 0.4.0
npm publish
```

### 4. Set up Cloudflare Tunnel
```bash
# Add new routes
cheri-api.heysalad.app → heysalad-sheri-api
sheri-auth.heysalad.app → heysalad-sheri-auth
```

---

## 🔒 Security Considerations

### Token Security
- JWT with 30-day expiration
- Stored in `~/.sheri-ml/.env` (chmod 600)
- Refresh token flow for long-lived sessions

### Password Storage
- bcrypt with 12 rounds
- Never log passwords
- Rate limit login attempts

### Rate Limiting
- Per-IP: 10 login attempts/hour
- Per-user: enforced by plan limits
- Global: circuit breaker for abuse

### API Key Rotation
- Vertex AI keys stored in Cloudflare Secrets
- Rotate monthly
- Multiple keys for failover

---

## 📊 Analytics & Monitoring

### Track Everything
- User signups per day
- Requests per user per day
- Token usage per user
- Error rates
- Plan conversion rates (Free → Pro → Enterprise)

### Dashboards
- Revenue dashboard (MRR, churn)
- Usage dashboard (top users, models used)
- Health dashboard (API uptime, latency)

---

## 🎯 Success Metrics

### Week 1
- ✅ Auth service deployed
- ✅ D1 database created
- ✅ CLI login/logout working

### Week 2
- ✅ API gateway deployed
- ✅ Vertex AI proxy working
- ✅ Rate limiting enforced

### Week 3
- ✅ Plans available
- ✅ Payment integration (Stripe)
- ✅ Migration path for existing users

### Week 4
- ✅ 100 beta users
- ✅ $100 MRR (5 pro users)
- ✅ Monitoring & analytics live

---

## 🚀 Next Steps

**Do you want me to:**
1. Build the auth service first (Cloudflare Worker + D1)
2. Update the CLI with login/logout commands
3. Create the API gateway with Vertex proxy
4. Set up payment integration (Stripe)

**Or all of it?** I can build the complete system.
