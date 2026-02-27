# HeySalad Sheri Auth Service

Authentication service for SheriML CLI.

## Setup

### 1. Create D1 Database (Manual - via Cloudflare Dashboard)

Since the API token doesn't have D1 permissions, create the database manually:

1. Go to https://dash.cloudflare.com/67a17ada4efeee4480283035cc0c5f90/workers/d1
2. Click "Create database"
3. Name: `sheri-auth-db`
4. Copy the database ID
5. Update `wrangler.toml` with the database ID

OR use existing `heysalad-rag-db` (current config)

### 2. Run Schema Migration

Run the SQL in `schema.sql` manually in the Cloudflare dashboard:

1. Go to D1 database page
2. Click "Console"
3. Paste and execute `schema.sql` contents

OR if you have D1 API permissions:
```bash
wrangler d1 execute heysalad-rag-db --file=schema.sql --remote
```

### 3. Set Secrets

```bash
# JWT secret for token signing (generate random 32-char string)
wrangler secret put JWT_SECRET
# Enter: <random-32-char-string>
```

### 4. Deploy

```bash
npm install
wrangler deploy
```

## Endpoints

### POST /auth/register
Register new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "plan": "free"
  },
  "token": "hsa_xxx",
  "expires_at": 1234567890
}
```

### POST /auth/login
Login existing user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "plan": "free"
  },
  "token": "hsa_xxx",
  "expires_at": 1234567890
}
```

### GET /auth/me
Get current user info.

**Headers:**
```
Authorization: Bearer hsa_xxx
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "plan": "free",
    "created_at": 1234567890
  },
  "usage": {
    "today": {
      "requests": 47,
      "tokens": 12500
    },
    "limits": {
      "requests": 100,
      "tokens": 50000
    }
  }
}
```

### POST /auth/logout
Logout (invalidate token).

**Headers:**
```
Authorization: Bearer hsa_xxx
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

### POST /auth/token/generate
Generate new API token.

**Headers:**
```
Authorization: Bearer hsa_xxx
```

**Response:**
```json
{
  "token": "hsa_yyy",
  "expires_at": 1234567890,
  "message": "New token generated successfully"
}
```

### POST /auth/token/revoke
Revoke API token.

**Headers:**
```
Authorization: Bearer hsa_xxx
```

**Request:**
```json
{
  "token": "hsa_yyy"
}
```

**Response:**
```json
{
  "message": "Token revoked successfully"
}
```

## Testing

```bash
# Register
curl -X POST https://sheri-auth.heysalad.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Login
curl -X POST https://sheri-auth.heysalad.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Whoami
curl https://sheri-auth.heysalad.app/auth/me \
  -H "Authorization: Bearer hsa_xxx"
```

## Token Format

Tokens use the format: `hsa_<32-hex-chars>`

Example: `hsa_7f3d2e1a9c4b8e6f0d5a7c3e9b2f4d1e`

- Prefix: `hsa_` (HeySalad Auth)
- Length: 36 characters total
- Entropy: 128 bits
- Expiry: 90 days (configurable)
