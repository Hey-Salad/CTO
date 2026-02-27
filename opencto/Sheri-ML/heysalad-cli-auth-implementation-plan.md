# HeySalad CLI Authentication: Implementation Plan

**Date:** 2026-02-22
**Status:** Ready for Implementation
**Priority:** High (Required for CLI MVP)

---

## Quick Summary

Based on comprehensive research of 15+ modern CLI tools, here's what we're building:

**Authentication Methods (in priority order):**
1. **Environment Variable** (`HEYSALAD_API_KEY`) - For CI/CD and quick SSH use
2. **Device Flow** (`heysalad login`) - Best UX for local interactive use
3. **Token Input** (`heysalad login --with-token`) - For SSH when user already has token

**Storage Priority:**
1. OS Keychain (macOS/Windows) or Secret Service (Linux)
2. Encrypted config file `~/.config/heysalad/config.yml` (600 permissions)
3. Environment variable (ephemeral, per-session)

**Token Format:** `hsa_<32-hex-chars>` (e.g., `hsa_7f3d2e1a9c4b8e6f0d5a7c3e9b2f4d1e`)

---

## 1. Implementation Phases

### Phase 1: MVP (Week 1) - PRIORITY

**Goal:** Basic authentication that works everywhere (local, SSH, CI/CD)

**Features:**
```
✅ Environment variable support (HEYSALAD_API_KEY)
✅ Token input via stdin (heysalad login --with-token)
✅ Config file storage (~/.config/heysalad/config.yml, 600 perms)
✅ Auto-detection of auth method (env var → config file)
✅ Clear error messages when not authenticated
✅ heysalad whoami - show current user
✅ heysalad logout - clear credentials
```

**Testing scenarios:**
- [x] Local machine with env var
- [x] Local machine with config file
- [x] SSH session with env var
- [x] SSH session with token input
- [x] CI/CD with env var
- [x] Error message when not authenticated

**Deliverable:** CLI that works in all environments with API keys

---

### Phase 2: Device Flow (Week 2)

**Goal:** Best-in-class UX for local interactive use

**Features:**
```
✅ OAuth device flow implementation
✅ heysalad login (interactive device flow)
✅ Polling with spinner/progress indication
✅ SSH detection → suggest token input instead
✅ Token refresh mechanism
✅ Token expiration handling
```

**Backend Requirements:**
- Device authorization endpoint: `POST /api/v1/auth/device/code`
- Token exchange endpoint: `POST /api/v1/auth/device/token`
- User verification page: `https://heysalad.app/activate`

**Testing scenarios:**
- [x] Device flow on local machine
- [x] Device flow over SSH (should suggest alternative)
- [x] Token expiration and refresh
- [x] User denies authorization
- [x] Device code expires

---

### Phase 3: Secure Storage (Week 3)

**Goal:** Best-in-class security using OS keychains

**Features:**
```
✅ OS credential store integration (go-keyring)
✅ Automatic migration from file → keyring
✅ Fallback with warnings
✅ heysalad auth status - show storage method
✅ Encrypted file storage (if keyring unavailable)
```

**Libraries:**
- Go: `github.com/zalando/go-keyring`
- Fallback: AES-256 encrypted JSON file

**Testing scenarios:**
- [x] macOS Keychain storage
- [x] Linux Secret Service storage
- [x] Windows Credential Manager storage
- [x] Fallback when keyring unavailable
- [x] Migration from plaintext to keyring

---

### Phase 4: Advanced Features (Week 4+)

**Goal:** Power user features

**Features:**
```
✅ Multi-account support
✅ heysalad switch <account> - switch accounts
✅ Token scopes and permissions
✅ heysalad auth token - print token (debug)
✅ heysalad auth refresh - force token refresh
✅ Token revocation on server
```

---

## 2. Architecture

### 2.1 Component Structure

```
heysalad-cli/
├── cmd/
│   ├── login.go          # Auth commands
│   ├── logout.go
│   ├── whoami.go
│   └── auth/
│       ├── status.go
│       ├── token.go
│       └── refresh.go
├── internal/
│   └── auth/
│       ├── client.go      # Auth client (device flow, token exchange)
│       ├── store.go       # Token storage (keyring + file)
│       ├── config.go      # Config file management
│       ├── env.go         # Environment variable handling
│       └── detector.go    # SSH/CI detection
└── api/
    └── client.go          # HTTP client with auth middleware
```

### 2.2 Authentication Flow

```
┌─────────────┐
│ CLI Command │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Auth Middleware │──── Check auth in priority order:
└──────┬──────────┘     1. HEYSALAD_API_KEY env var
       │                2. Token in OS keyring
       │                3. Token in config file
       │                4. Error: not authenticated
       ▼
┌─────────────┐
│ API Request │───► Authorization: Bearer hsa_xxx
└─────────────┘
```

### 2.3 Login Flow Decision Tree

```
heysalad login
│
├─► HEYSALAD_API_KEY set?
│   └─► ✓ Already authenticated (show whoami)
│
├─► CI environment? (CI=true, GITHUB_ACTIONS, etc.)
│   └─► ✗ Error: "CI detected. Set HEYSALAD_API_KEY env var"
│
├─► SSH session? (SSH_CONNECTION set)
│   └─► Prompt:
│       • API key input (recommended)
│       • Device flow (requires phone)
│
└─► Local machine
    └─► Device flow (best UX)
```

---

## 3. API Endpoints (Backend Requirements)

### 3.1 Device Flow Endpoints

**1. Request device code**
```http
POST /api/v1/auth/device/code
Content-Type: application/json

{
  "client_id": "heysalad-cli",
  "scope": "deploy logs:read secrets:read"
}

Response 200:
{
  "device_code": "d3v1c3c0d3...",
  "user_code": "ABCD-1234",
  "verification_uri": "https://heysalad.app/activate",
  "verification_uri_complete": "https://heysalad.app/activate?code=ABCD-1234",
  "expires_in": 900,
  "interval": 5
}
```

**2. Poll for token**
```http
POST /api/v1/auth/device/token
Content-Type: application/json

{
  "device_code": "d3v1c3c0d3...",
  "grant_type": "urn:ietf:params:oauth:grant-type:device_code"
}

Response 200 (when authorized):
{
  "access_token": "hsa_7f3d2e1a9c4b8e6f0d5a7c3e9b2f4d1e",
  "token_type": "Bearer",
  "expires_in": 7776000,  // 90 days
  "refresh_token": "hsr_...",
  "scope": "deploy logs:read secrets:read"
}

Response 400 (still pending):
{
  "error": "authorization_pending",
  "error_description": "User has not yet authorized the device"
}

Response 400 (denied):
{
  "error": "access_denied",
  "error_description": "User denied authorization"
}

Response 400 (expired):
{
  "error": "expired_token",
  "error_description": "Device code has expired"
}
```

**3. User verification page**
```
https://heysalad.app/activate

UI:
┌─────────────────────────────────────┐
│  Enter your device code:            │
│  ┌─────────────┐                    │
│  │ ABCD-1234   │  [Continue]        │
│  └─────────────┘                    │
│                                      │
│  This will authorize HeySalad CLI   │
│  to access your account with:       │
│  • Deploy workers                   │
│  • Read logs                        │
│  • Read secrets                     │
└─────────────────────────────────────┘

After entering code → OAuth consent screen
After approval → "✓ Device authorized! Return to your terminal."
```

### 3.2 Token Management Endpoints

**1. Validate token (whoami)**
```http
GET /api/v1/auth/whoami
Authorization: Bearer hsa_xxx

Response 200:
{
  "user": {
    "id": "usr_123",
    "email": "user@example.com",
    "name": "Jane Doe"
  },
  "workspace": {
    "id": "ws_456",
    "name": "HeySalad Production"
  },
  "token": {
    "scopes": ["deploy", "logs:read", "secrets:read"],
    "expires_at": "2026-05-22T10:30:00Z",
    "created_at": "2026-02-22T10:30:00Z"
  }
}

Response 401:
{
  "error": "invalid_token",
  "error_description": "Token is invalid or expired"
}
```

**2. Refresh token**
```http
POST /api/v1/auth/token/refresh
Content-Type: application/json

{
  "refresh_token": "hsr_..."
}

Response 200:
{
  "access_token": "hsa_newtoken...",
  "token_type": "Bearer",
  "expires_in": 7776000,
  "refresh_token": "hsr_newrefresh..."
}
```

**3. Revoke token (logout)**
```http
POST /api/v1/auth/token/revoke
Authorization: Bearer hsa_xxx
Content-Type: application/json

{
  "token": "hsa_xxx"  // token to revoke
}

Response 200:
{
  "success": true
}
```

### 3.3 API Key Management (Web UI)

**Generate API Key:**
```
https://heysalad.app/settings/tokens

UI:
┌─────────────────────────────────────┐
│  API Keys                           │
│                                      │
│  [+ Generate New Token]             │
│                                      │
│  Token Name: ________________       │
│  Expires:    [90 days ▼]           │
│  Scopes:     ☑ Deploy              │
│              ☑ Logs (read)         │
│              ☐ Logs (write)        │
│              ☑ Secrets (read)      │
│              ☐ Secrets (write)     │
│              ☐ Admin               │
│                                      │
│              [Generate]             │
│                                      │
│  ┌──────────────────────────────┐  │
│  │ hsa_7f3d2e1a9c4b8e6f...      │  │
│  │ [Copy]  [Revoke]             │  │
│  │ Created: 2026-02-22           │  │
│  │ Expires: 2026-05-22           │  │
│  │ Last used: 2 hours ago        │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

## 4. Token Format and Security

### 4.1 Token Format

**Access Token:**
```
hsa_<32 hex chars>

Example: hsa_7f3d2e1a9c4b8e6f0d5a7c3e9b2f4d1e

Prefix: "hsa" = HeySalad API
Length: 36 chars (hsa_ + 32)
Entropy: 128 bits
```

**Refresh Token:**
```
hsr_<32 hex chars>

Example: hsr_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6

Prefix: "hsr" = HeySalad Refresh
```

**Generation (Go):**
```go
import (
    "crypto/rand"
    "fmt"
)

func GenerateToken(prefix string) (string, error) {
    b := make([]byte, 16) // 16 bytes = 128 bits
    if _, err := rand.Read(b); err != nil {
        return "", err
    }
    return fmt.Sprintf("%s_%x", prefix, b), nil
}

// Generate access token
token, _ := GenerateToken("hsa")  // hsa_7f3d2e1a9c4b8e6f0d5a7c3e9b2f4d1e
```

### 4.2 Token Storage Security

**Database (Backend):**
```sql
CREATE TABLE tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    token_hash VARCHAR(64) NOT NULL,  -- SHA-256 hash
    token_prefix VARCHAR(8) NOT NULL,  -- For display (hsa_7f3d)
    scopes TEXT[] NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    last_used_at TIMESTAMP,
    revoked_at TIMESTAMP,
    device_name VARCHAR(255),
    ip_address INET,
    UNIQUE(token_hash)
);

CREATE INDEX idx_tokens_user ON tokens(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_tokens_hash ON tokens(token_hash) WHERE revoked_at IS NULL;
```

**Client (CLI):**
```yaml
# ~/.config/heysalad/config.yml (600 permissions)
version: 1
auth:
  token: hsa_7f3d2e1a9c4b8e6f0d5a7c3e9b2f4d1e
  refresh_token: hsr_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6
  expires_at: "2026-05-22T10:30:00Z"
  user:
    email: user@example.com
    name: Jane Doe
  workspace:
    id: ws_456
    name: HeySalad Production
```

**File Permissions Check (Go):**
```go
func EnsureConfigPermissions(path string) error {
    info, err := os.Stat(path)
    if err != nil {
        return err
    }

    mode := info.Mode().Perm()
    if mode != 0600 {
        fmt.Printf("⚠️  Warning: Config file permissions are %o (should be 600)\n", mode)
        fmt.Printf("   Fixing permissions...\n")
        if err := os.Chmod(path, 0600); err != nil {
            return fmt.Errorf("failed to fix permissions: %w", err)
        }
    }

    return nil
}
```

### 4.3 Token Validation

**Client-side (before API call):**
```go
func (t *Token) IsValid() bool {
    // Check expiration
    if time.Now().After(t.ExpiresAt) {
        return false
    }

    // Check format
    if !strings.HasPrefix(t.AccessToken, "hsa_") {
        return false
    }

    if len(t.AccessToken) != 36 {
        return false
    }

    return true
}
```

**Server-side (API middleware):**
```go
func ValidateToken(tokenString string) (*Token, error) {
    // Check format
    if !strings.HasPrefix(tokenString, "hsa_") {
        return nil, errors.New("invalid token format")
    }

    // Hash token
    hash := sha256.Sum256([]byte(tokenString))
    hashStr := hex.EncodeToString(hash[:])

    // Lookup in database
    var token Token
    err := db.QueryRow(`
        SELECT id, user_id, scopes, expires_at, revoked_at
        FROM tokens
        WHERE token_hash = $1
    `, hashStr).Scan(&token.ID, &token.UserID, &token.Scopes, &token.ExpiresAt, &token.RevokedAt)

    if err != nil {
        return nil, errors.New("invalid token")
    }

    // Check revoked
    if token.RevokedAt != nil {
        return nil, errors.New("token has been revoked")
    }

    // Check expired
    if time.Now().After(token.ExpiresAt) {
        return nil, errors.New("token has expired")
    }

    // Update last_used_at
    db.Exec(`UPDATE tokens SET last_used_at = NOW() WHERE id = $1`, token.ID)

    return &token, nil
}
```

---

## 5. CLI Commands Specification

### 5.1 heysalad login

**Usage:**
```bash
heysalad login [flags]

Flags:
  --device            Force device flow (even on SSH)
  --with-token        Read token from stdin
  --interactive       Prompt for token input
  -h, --help          Help for login
```

**Examples:**
```bash
# Interactive (auto-detects best method)
heysalad login

# Force device flow
heysalad login --device

# Token from stdin (SSH/CI)
echo $HEYSALAD_API_KEY | heysalad login --with-token

# Token from file
heysalad login --with-token < ~/.heysalad-token

# Interactive prompt for token
heysalad login --interactive
```

**Output:**

*Device flow (local machine):*
```
Authenticating with HeySalad...

Visit: https://heysalad.app/activate
Enter code: ABCD-1234

⠋ Waiting for authorization...

✓ Successfully authenticated as user@example.com
  Workspace: HeySalad Production
  Token stored in system keychain
```

*Token input (SSH):*
```
SSH session detected. Paste your API key below:
(Get your key at https://heysalad.app/settings/tokens)

Token: █

✓ Successfully authenticated as user@example.com
  Workspace: HeySalad Production
  Token stored at ~/.config/heysalad/config.yml
```

*Already authenticated:*
```
Already authenticated as user@example.com

To switch accounts, run:
  heysalad logout
  heysalad login
```

### 5.2 heysalad logout

**Usage:**
```bash
heysalad logout
```

**Output:**
```
✓ Logged out
  Token removed from system keychain
```

**Implementation:**
```go
func Logout() error {
    store := auth.NewTokenStore()

    // Revoke token on server
    token, err := store.Load()
    if err == nil {
        client := api.NewClient(token)
        client.RevokeToken(token)
    }

    // Delete locally
    return store.Delete()
}
```

### 5.3 heysalad whoami

**Usage:**
```bash
heysalad whoami
```

**Output:**
```
User:       user@example.com (Jane Doe)
Workspace:  HeySalad Production (ws_456)
Token:      hsa_7f3d...4d1e (hidden)
Scopes:     deploy, logs:read, secrets:read
Expires:    2026-05-22 10:30:00 UTC (89 days)
Storage:    System keychain (secure)
```

**Flags:**
```bash
heysalad whoami --json     # JSON output
heysalad whoami --token    # Show full token (for debugging)
```

**JSON output:**
```json
{
  "user": {
    "email": "user@example.com",
    "name": "Jane Doe",
    "id": "usr_123"
  },
  "workspace": {
    "name": "HeySalad Production",
    "id": "ws_456"
  },
  "token": {
    "prefix": "hsa_7f3d",
    "scopes": ["deploy", "logs:read", "secrets:read"],
    "expires_at": "2026-05-22T10:30:00Z",
    "storage_method": "keychain"
  }
}
```

### 5.4 heysalad auth status

**Usage:**
```bash
heysalad auth status
```

**Output:**
```
Authentication Status: ✓ Authenticated

Method:         Device flow (OAuth)
Authenticated:  2026-02-22 10:30:00 UTC (2 hours ago)
Expires:        2026-05-22 10:30:00 UTC (89 days)
Storage:        System keychain (secure)
Token prefix:   hsa_7f3d

User:           user@example.com
Workspace:      HeySalad Production

Available scopes:
  ✓ deploy            Deploy workers and applications
  ✓ logs:read         Read application logs
  ✓ secrets:read      Read secrets and environment variables
```

### 5.5 heysalad auth token

**Usage:**
```bash
heysalad auth token     # Show full token (for debugging)
```

**Output:**
```
hsa_7f3d2e1a9c4b8e6f0d5a7c3e9b2f4d1e

⚠️  Warning: Keep this token secret!
    Anyone with this token can access your HeySalad account.
```

**Use case:** Copy token to another machine or tool

### 5.6 heysalad auth refresh

**Usage:**
```bash
heysalad auth refresh   # Refresh access token using refresh token
```

**Output:**
```
Refreshing authentication token...

✓ Token refreshed successfully
  New token expires: 2026-08-22 10:30:00 UTC (180 days)
```

---

## 6. Error Messages

### 6.1 Not Authenticated

**Trigger:** Any command when no token is available

**Message:**
```
Error: Not authenticated

To authenticate, run:
  heysalad login

Or set environment variable:
  export HEYSALAD_API_KEY=xxx

Get your API key at:
  https://heysalad.app/settings/tokens

For CI/CD, add HEYSALAD_API_KEY to your secrets.
```

### 6.2 Token Expired

**Trigger:** API returns 401 with expired token

**Message:**
```
Error: Authentication token expired

To refresh your token, run:
  heysalad auth refresh

Or login again:
  heysalad logout
  heysalad login

To get a new API key:
  https://heysalad.app/settings/tokens
```

### 6.3 Token Invalid/Revoked

**Trigger:** API returns 401 with revoked token

**Message:**
```
Error: Authentication token is invalid or has been revoked

Please login again:
  heysalad logout
  heysalad login

If you revoked this token, generate a new one at:
  https://heysalad.app/settings/tokens
```

### 6.4 SSH Detected Suggestion

**Trigger:** `heysalad login` on SSH session without flags

**Message:**
```
📡 SSH session detected

For authentication over SSH, we recommend:

Option 1 (Fastest): Use API key
  1. Generate key at https://heysalad.app/settings/tokens
  2. Run: export HEYSALAD_API_KEY=xxx
  3. Or: echo $key | heysalad login --with-token

Option 2: Device flow (requires phone/laptop)
  heysalad login --device

Option 3: Paste token interactively
  heysalad login --interactive

? Choose authentication method: [↑↓ to move, enter to select]
  > API key (paste token)
    Device flow (use phone)
```

### 6.5 CI Detected Error

**Trigger:** `heysalad login` in CI environment

**Message:**
```
Error: CI environment detected

For CI/CD, set HEYSALAD_API_KEY environment variable:

GitHub Actions:
  1. Generate token at https://heysalad.app/settings/tokens
  2. Add to repository secrets: HEYSALAD_API_KEY
  3. Use in workflow:
     - run: heysalad deploy
       env:
         HEYSALAD_API_KEY: ${{ secrets.HEYSALAD_API_KEY }}

GitLab CI:
  1. Add variable: Settings > CI/CD > Variables
  2. Name: HEYSALAD_API_KEY
  3. Value: hsa_xxx
  4. Protected: ✓, Masked: ✓

For more info: https://docs.heysalad.app/cli/auth
```

### 6.6 Invalid Token Format

**Trigger:** User provides malformed token

**Message:**
```
Error: Invalid token format

HeySalad API tokens should:
  - Start with "hsa_"
  - Be 36 characters long
  - Example: hsa_7f3d2e1a9c4b8e6f0d5a7c3e9b2f4d1e

Generate a valid token at:
  https://heysalad.app/settings/tokens
```

---

## 7. Testing Plan

### 7.1 Unit Tests

**Token Store:**
```go
func TestTokenStore_SaveAndLoad(t *testing.T) {
    store := NewTokenStore()
    token := "hsa_7f3d2e1a9c4b8e6f0d5a7c3e9b2f4d1e"

    // Save
    err := store.Save(token)
    assert.NoError(t, err)

    // Load
    loaded, err := store.Load()
    assert.NoError(t, err)
    assert.Equal(t, token, loaded)

    // Delete
    err = store.Delete()
    assert.NoError(t, err)

    // Load after delete should fail
    _, err = store.Load()
    assert.Error(t, err)
}
```

**Token Validation:**
```go
func TestToken_IsValid(t *testing.T) {
    tests := []struct {
        name     string
        token    Token
        expected bool
    }{
        {
            name: "valid token",
            token: Token{
                AccessToken: "hsa_7f3d2e1a9c4b8e6f0d5a7c3e9b2f4d1e",
                ExpiresAt:   time.Now().Add(24 * time.Hour),
            },
            expected: true,
        },
        {
            name: "expired token",
            token: Token{
                AccessToken: "hsa_7f3d2e1a9c4b8e6f0d5a7c3e9b2f4d1e",
                ExpiresAt:   time.Now().Add(-24 * time.Hour),
            },
            expected: false,
        },
        {
            name: "invalid format",
            token: Token{
                AccessToken: "invalid",
                ExpiresAt:   time.Now().Add(24 * time.Hour),
            },
            expected: false,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            assert.Equal(t, tt.expected, tt.token.IsValid())
        })
    }
}
```

### 7.2 Integration Tests

**Device Flow E2E:**
```go
func TestDeviceFlow_Complete(t *testing.T) {
    // Start device flow
    client := NewDeviceFlowClient(testConfig)
    deviceResp, err := client.StartFlow(context.Background())
    assert.NoError(t, err)
    assert.NotEmpty(t, deviceResp.UserCode)

    // Simulate user authorization (in test server)
    testServer.ApproveDevice(deviceResp.DeviceCode)

    // Poll for token
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    token, err := client.PollForToken(ctx, deviceResp.DeviceCode, deviceResp.Interval)
    assert.NoError(t, err)
    assert.NotEmpty(t, token.AccessToken)
    assert.True(t, strings.HasPrefix(token.AccessToken, "hsa_"))
}
```

**Environment Variable Auth:**
```go
func TestAuth_EnvironmentVariable(t *testing.T) {
    token := "hsa_7f3d2e1a9c4b8e6f0d5a7c3e9b2f4d1e"
    os.Setenv("HEYSALAD_API_KEY", token)
    defer os.Unsetenv("HEYSALAD_API_KEY")

    auth := NewAuthenticator()
    loadedToken, err := auth.GetToken()

    assert.NoError(t, err)
    assert.Equal(t, token, loadedToken)
}
```

### 7.3 Manual Testing Scenarios

**Scenario 1: Local Machine - First Time User**
```
1. User runs: heysalad deploy
   Expected: Error message with auth instructions

2. User runs: heysalad login
   Expected: Device flow, show code and URL

3. User visits URL on phone, enters code, approves
   Expected: CLI shows "✓ Successfully authenticated"

4. User runs: heysalad deploy
   Expected: Command succeeds
```

**Scenario 2: SSH Session - Experienced User**
```
1. SSH into remote server
2. User runs: heysalad login
   Expected: Detects SSH, suggests API key

3. User selects "API key" option
   Expected: Prompt for token

4. User pastes token from https://heysalad.app/settings/tokens
   Expected: "✓ Successfully authenticated"

5. User runs: heysalad whoami
   Expected: Shows user info
```

**Scenario 3: CI/CD - GitHub Actions**
```
1. User adds HEYSALAD_API_KEY to repository secrets
2. Workflow runs: heysalad deploy
   Expected: Auto-authenticated via env var, deploy succeeds

3. User accidentally runs: heysalad login in CI
   Expected: Error: "CI detected, use HEYSALAD_API_KEY"
```

---

## 8. Security Considerations

### 8.1 Threat Model

**Threats:**
1. Token stolen from config file
2. Token exposed in terminal history
3. Token exposed in process list (ps aux)
4. Token exposed in logs
5. MITM attack during device flow
6. Token reuse across environments

**Mitigations:**
1. Use OS keychain when available, 600 perms for files
2. Never accept via flags, use stdin only
3. Never pass via command-line arguments
4. Automatically redact tokens in logs
5. Use HTTPS only, verify TLS certificates
6. Token scoping and expiration

### 8.2 Token Redaction

**Implementation:**
```go
func RedactToken(text string) string {
    // Regex to match hsa_xxx or hsr_xxx tokens
    re := regexp.MustCompile(`\bhs[ar]_[a-f0-9]{32}\b`)
    return re.ReplaceAllString(text, "hsa_****")
}

// Use in logger
type SafeLogger struct {
    logger *log.Logger
}

func (l *SafeLogger) Printf(format string, args ...interface{}) {
    msg := fmt.Sprintf(format, args...)
    l.logger.Print(RedactToken(msg))
}
```

### 8.3 Rate Limiting

**Device flow polling:**
- Respect server's `interval` value (minimum 5 seconds)
- Exponential backoff on rate limit errors
- Maximum 30 minutes timeout

**API calls:**
- Include User-Agent header with CLI version
- Implement exponential backoff for 429 responses
- Cache token validation results (1 hour)

### 8.4 Secure Defaults

```go
var secureDefaults = Config{
    // Always use HTTPS
    APIURL:          "https://api.heysalad.app",
    AllowInsecure:   false,  // Never allow HTTP

    // Token storage
    UseKeychain:     true,   // Try OS keychain first
    FilePermissions: 0600,   // Strict file perms

    // Network
    Timeout:         30 * time.Second,
    TLSVerify:       true,

    // Logging
    RedactTokens:    true,   // Always redact in logs
}
```

---

## 9. Implementation Checklist

### Phase 1: MVP (Week 1)
- [ ] Project structure (cmd/, internal/auth/)
- [ ] Environment variable support (HEYSALAD_API_KEY)
- [ ] Config file management (read/write ~/.config/heysalad/config.yml)
- [ ] File permission enforcement (600)
- [ ] Token validation (format check)
- [ ] API client with auth middleware
- [ ] `heysalad login --with-token` (stdin)
- [ ] `heysalad login --interactive` (prompt)
- [ ] `heysalad logout`
- [ ] `heysalad whoami`
- [ ] Error messages (not authenticated, invalid token)
- [ ] Unit tests (token store, validation)
- [ ] Integration tests (env var, file storage)

### Phase 2: Device Flow (Week 2)
- [ ] Backend: Device code endpoint
- [ ] Backend: Token exchange endpoint
- [ ] Backend: User verification page (https://heysalad.app/activate)
- [ ] CLI: Device flow client
- [ ] CLI: Polling with spinner
- [ ] CLI: SSH detection
- [ ] CLI: Token refresh mechanism
- [ ] CLI: `heysalad login` (device flow default)
- [ ] CLI: `heysalad login --device` (force)
- [ ] CLI: `heysalad auth refresh`
- [ ] E2E tests (device flow)
- [ ] Manual testing (local + SSH)

### Phase 3: Secure Storage (Week 3)
- [ ] Integrate go-keyring library
- [ ] OS keychain storage (macOS, Windows, Linux)
- [ ] Fallback to encrypted file (AES-256)
- [ ] Migration from plaintext → keyring
- [ ] `heysalad auth status` (show storage method)
- [ ] Warning messages when keyring unavailable
- [ ] Tests for each storage backend
- [ ] Manual testing on macOS/Linux/Windows

### Phase 4: Advanced (Week 4+)
- [ ] Multi-account support
- [ ] `heysalad switch <account>`
- [ ] Token scopes and permissions
- [ ] `heysalad auth token` (debug)
- [ ] Backend: Token revocation
- [ ] Backend: Token usage tracking
- [ ] Backend: Token rotation
- [ ] Web UI: Token management page
- [ ] Documentation

---

## 10. Documentation Requirements

### 10.1 User Docs

**Getting Started:**
```markdown
# Authentication

The HeySalad CLI requires authentication to interact with your workspace.

## Quick Start

### Local Machine
```bash
heysalad login
```
Visit the displayed URL and enter the code shown.

### Remote Server (SSH)
```bash
# Option 1: Environment variable
export HEYSALAD_API_KEY=hsa_xxx
heysalad deploy

# Option 2: Token input
heysalad login --with-token < token.txt
```

### CI/CD
Add `HEYSALAD_API_KEY` to your CI environment variables.

[Get your API key](https://heysalad.app/settings/tokens)

## Authentication Methods

### Device Flow (Recommended for local use)
...

### API Key (Recommended for SSH/CI)
...
```

### 10.2 API Docs (for backend team)

**Device Flow Implementation:**
```markdown
# OAuth Device Authorization Flow

## Endpoints

### POST /api/v1/auth/device/code
Request device and user codes.

**Request:**
```json
{
  "client_id": "heysalad-cli",
  "scope": "deploy logs:read"
}
```

**Response:**
```json
{
  "device_code": "...",
  "user_code": "ABCD-1234",
  "verification_uri": "https://heysalad.app/activate",
  "expires_in": 900,
  "interval": 5
}
```

### POST /api/v1/auth/device/token
...
```

---

**End of Implementation Plan**

**Next Steps:**
1. Review and approve this plan
2. Create backend API endpoints (device flow)
3. Start Phase 1 implementation (MVP auth)
4. Iterate based on testing feedback
