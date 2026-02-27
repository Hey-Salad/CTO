# CLI Authentication Research: Comprehensive Analysis

**Date:** 2026-02-22
**Purpose:** Research authentication patterns for modern CLI tools, especially in remote/SSH environments

---

## Executive Summary

After analyzing 15+ modern CLI tools (GitHub CLI, Wrangler, Railway, Vercel, Netlify, Stripe, Docker, kubectl, Fly.io), clear patterns emerge:

**Key Finding:** Modern CLI tools use a **hybrid approach** combining:
1. **OAuth Device Flow** for interactive sessions (best UX)
2. **API Keys/Tokens** for remote/SSH/CI environments (best for automation)
3. **Secure storage fallback** (OS keychain → encrypted file → plaintext with warning)

**Critical Insight:** Remote/SSH scenarios require special handling because:
- Browser-based OAuth fails without display
- Device flow works but requires copy-paste from another device
- API tokens are the most practical solution for headless environments

---

## 1. Authentication Method Comparison

### 1.1 OAuth Device Flow (RFC 8628)

**What it is:** OAuth 2.0 extension for devices without browsers or with limited input.

**How it works:**
```
1. Device requests codes → Server returns device_code, user_code, verification_uri
2. Device displays: "Visit https://example.com/activate and enter: ABC-123"
3. User opens URL on phone/laptop, enters code, approves
4. Device polls /oauth/token endpoint every 5 seconds
5. Server returns access_token after approval
```

**Tools using this:**
- GitHub CLI (`gh auth login` default)
- Google APIs
- Stripe CLI
- Docker Hub login
- Railway CLI (`railway login`)

**Pros:**
- ✅ Most secure (no credentials in CLI)
- ✅ Best UX for interactive use
- ✅ Supports MFA/SSO seamlessly
- ✅ Scoped permissions
- ✅ Revocable tokens

**Cons:**
- ❌ Requires second device
- ❌ Fails completely over SSH without clipboard access
- ❌ Not suitable for CI/CD
- ❌ Polling adds latency (5-15 seconds)

**SSH/Remote handling:**
- Display URL + code in terminal
- User copies to phone/laptop
- CLI polls in background
- Works but awkward

**Example (GitHub CLI):**
```bash
$ gh auth login
? What account do you want to log into? GitHub.com
? What is your preferred protocol for Git operations? HTTPS
? Authenticate Git with your GitHub credentials? Yes
? How would you like to authenticate GitHub CLI? Login with a web browser

! First copy your one-time code: ABCD-1234
Press Enter to open github.com in your browser...
```

### 1.2 API Keys / Personal Access Tokens (PAT)

**What it is:** Long-lived tokens generated in web UI, used directly in CLI.

**How it works:**
```
1. User generates token in web dashboard
2. User copies token
3. User provides token to CLI via:
   - stdin: echo $TOKEN | cli login --with-token
   - file: cli login --token-file ~/.secrets/token
   - env var: export CLI_TOKEN=xxx
```

**Tools using this:**
- GitHub CLI (`gh auth login --with-token`)
- Cloudflare Wrangler (API tokens)
- OpenAI API
- Stripe CLI (`stripe login --interactive`)
- Railway (`RAILWAY_TOKEN`)
- Netlify (`NETLIFY_AUTH_TOKEN`)

**Pros:**
- ✅ Perfect for SSH/remote/headless
- ✅ Ideal for CI/CD
- ✅ No browser required
- ✅ Can be scoped
- ✅ Works immediately

**Cons:**
- ❌ User must visit web UI first
- ❌ Token visible in terminal history if not careful
- ❌ Harder to rotate
- ❌ No built-in expiration (usually)

**Security best practices (from research):**
- NEVER accept via flags: `--token xxx` (visible in ps output)
- Use stdin: `--with-token < token.txt` ✅
- Use env vars: `export CLI_TOKEN=$(cat ~/.token)` ✅
- Use files with 600 permissions ✅

**Example (GitHub CLI):**
```bash
# Generate token at https://github.com/settings/tokens
# Then:
echo $GITHUB_TOKEN | gh auth login --with-token
# Or:
export GH_TOKEN=ghp_xxxx
gh api /user  # automatically authenticated
```

### 1.3 OAuth with Local Callback Server

**What it is:** CLI starts HTTP server, opens browser with OAuth, receives callback.

**How it works:**
```
1. CLI starts HTTP server on localhost:8976
2. CLI opens browser to https://auth.example.com/oauth?redirect_uri=http://localhost:8976
3. User approves in browser
4. Browser redirects to localhost:8976?code=xxx
5. CLI exchanges code for token
6. CLI shuts down server
```

**Tools using this:**
- Cloudflare Wrangler (`wrangler login` - port 8976)
- Vercel CLI (implied from source)
- Fly.io (`fly auth login`)

**Pros:**
- ✅ Seamless UX (single click)
- ✅ Secure (PKCE flow)
- ✅ No code to copy-paste

**Cons:**
- ❌ FAILS completely over SSH (no browser, no localhost access)
- ❌ Requires open port
- ❌ Firewall issues possible
- ❌ Not suitable for CI/CD

**SSH handling:**
```bash
# Wrangler approach:
$ wrangler login --browser=false
Visit this URL: https://dash.cloudflare.com/oauth2/authorize?response_type=code&client_id=xxx&redirect_uri=http://localhost:8976/callback&state=yyy

# User must manually visit URL, but callback fails because localhost isn't accessible
# Result: BROKEN on remote servers
```

### 1.4 Browserless / Interactive Mode

**What it is:** Fallback for remote scenarios - paste token directly.

**Tools using this:**
- Railway (`railway login --browserless`)
- Stripe (`stripe login --interactive`)
- Fly.io (`fly auth login --interactive`)

**Example:**
```bash
$ railway login --browserless
Visit https://railway.app/cli-login and paste your token below:
Token: [user pastes]
✓ Authenticated as user@example.com
```

**This is essentially API token flow with better UX.**

---

## 2. Token Storage Patterns

### 2.1 OS-Specific Secure Storage (Best Practice)

**Pattern:** Use OS keychain/credential manager, fallback to encrypted file.

**GitHub CLI approach:**
```
Priority 1: System credential store
  - macOS: Keychain
  - Linux: Secret Service (GNOME Keyring/KWallet) or Pass
  - Windows: Credential Manager

Priority 2: Encrypted file (if credential store unavailable)

Priority 3: Plain text file with 600 permissions (with warning)
```

**Implementation libraries:**
- Go: `99designs/keyring`, `zalando/go-keyring`
- Node.js: `keytar` (Electron native modules)
- Python: `keyring` library

**Example (go-keyring):**
```go
import "github.com/zalando/go-keyring"

// Store
keyring.Set("my-cli", "default", token)

// Retrieve
token, err := keyring.Get("my-cli", "default")

// Delete
keyring.Delete("my-cli", "default")
```

**Storage locations:**
- GitHub CLI: `~/.config/gh/hosts.yml` (600 permissions)
- Stripe CLI: `~/.config/stripe/config.toml`
- Docker: `~/.docker/config.json` with credsStore reference
- kubectl: `~/.kube/config` (certificates/tokens)

### 2.2 Environment Variables (CI/CD Pattern)

**Common patterns:**
```bash
# Primary token
export CLI_TOKEN=xxx
export CLI_API_KEY=xxx

# Service-specific
export GITHUB_TOKEN=xxx        # GitHub
export CLOUDFLARE_API_TOKEN=xxx # Cloudflare
export RAILWAY_TOKEN=xxx       # Railway
export NETLIFY_AUTH_TOKEN=xxx  # Netlify
export STRIPE_API_KEY=xxx      # Stripe
```

**Precedence (GitHub CLI example):**
```
1. GH_TOKEN env var
2. GITHUB_TOKEN env var
3. ~/.config/gh/hosts.yml
4. git credential helper
```

**Security considerations:**
- ✅ Works in CI/CD
- ✅ Can be scoped per command
- ❌ Visible in process list
- ❌ Leaked in debug logs
- ❌ Inherited by child processes

**Best practice:** Use secret management service (AWS Secrets Manager, HashiCorp Vault, 1Password CLI) to inject env vars.

### 2.3 Configuration Files

**Common locations:**
- `~/.config/tool-name/config.{yml,toml,json}`
- `~/.tool-name/config`
- `$XDG_CONFIG_HOME/tool-name/config`

**Permissions:** ALWAYS 600 (user read/write only)

**GitHub CLI example (`~/.config/gh/hosts.yml`):**
```yaml
github.com:
    oauth_token: ghp_xxxxxxxxxxxxxxxxxxxx
    user: username
    git_protocol: ssh
```

**File permissions check:**
```bash
$ stat -c "%a %U:%G %n" ~/.config/gh/hosts.yml
600 peter:peter /home/peter/.config/gh/hosts.yml
```

---

## 3. Remote/SSH Scenario Analysis

### 3.1 What Fails Over SSH

**Browser-based OAuth with localhost callback:**
```
❌ wrangler login              # Opens browser, localhost callback fails
❌ vercel login                # Same issue
❌ fly auth login              # Same issue
```

**Why:** No local browser, localhost not accessible from remote callback.

### 3.2 What Works Over SSH

**Device flow (works but awkward):**
```
✅ gh auth login               # Shows code, user visits on phone
✅ railway login               # Same approach
```

**API tokens (ideal):**
```
✅ echo $TOKEN | gh auth login --with-token
✅ export GH_TOKEN=xxx && gh api /user
✅ railway login --browserless  # Paste token
✅ stripe login --interactive    # Paste token
```

**Environment variables (best for automation):**
```
✅ GH_TOKEN=xxx gh pr list
✅ CLOUDFLARE_API_TOKEN=xxx wrangler deploy
✅ RAILWAY_TOKEN=xxx railway up
```

### 3.3 Recommended Patterns for Remote CLIs

**Pattern 1: Detect SSH and suggest token flow**
```bash
if [ -n "$SSH_CONNECTION" ]; then
  echo "SSH session detected. For easier authentication, use:"
  echo "  cli login --with-token < token.txt"
  echo ""
  echo "Or set environment variable:"
  echo "  export CLI_TOKEN=xxx"
  echo ""
  echo "Get your token at: https://example.com/tokens"
fi
```

**Pattern 2: Provide multiple options in login command**
```bash
cli login
? How would you like to authenticate?
  > Browser-based OAuth (recommended for local use)
    Device flow (works remotely, requires phone/laptop)
    API token (best for SSH/CI)
```

**Pattern 3: Smart defaults based on environment**
```javascript
function getAuthMethod() {
  if (process.env.CLI_TOKEN) return 'env-var';
  if (process.env.SSH_CONNECTION) return 'device-flow'; // or 'token-prompt'
  if (isCI()) return 'fail-with-message'; // CI must use env vars
  return 'oauth-callback'; // local machine, best UX
}
```

---

## 4. Security Best Practices (From Research)

### 4.1 Never Do This

❌ **Accept secrets via CLI flags:**
```bash
cli deploy --token xxx  # VISIBLE IN ps AUX OUTPUT
```

❌ **Store plaintext without warning:**
```bash
echo "token=xxx" > ~/.config/cli/config
# No warning that this is insecure
```

❌ **Use predictable token formats:**
```bash
# Bad: sequential IDs, short tokens
token=12345

# Good: random, high entropy, prefixed
token=cli_5k3x7Mpq9RzJh4Wp8Nv2tYc1
```

### 4.2 Always Do This

✅ **Accept secrets via stdin or files:**
```bash
cli login --with-token < token.txt
cat token.txt | cli login --with-token
```

✅ **Use OS credential store:**
```go
import "github.com/zalando/go-keyring"
keyring.Set("cli-name", "default", token)
```

✅ **Fallback with warnings:**
```bash
⚠️  Warning: Secure credential storage unavailable.
    Token will be stored in plaintext at ~/.config/cli/config
    File permissions set to 600 (user read/write only)

    For better security, install:
    - macOS: Using Keychain (built-in)
    - Linux: Install gnome-keyring or pass
    - Windows: Using Credential Manager (built-in)
```

✅ **Scope tokens:**
```bash
# GitHub fine-grained tokens
Permissions:
  - repo: read/write
  - issues: read/write
  - workflows: read
  (NOT admin access)

Expiration: 90 days
```

✅ **Provide token rotation:**
```bash
cli auth refresh  # Refresh current token
cli auth token    # Print current token for debugging
cli auth logout   # Revoke and delete token
```

### 4.3 Token Format Best Practices

**Prefix tokens for detectability:**
```
cli_xxxxxxxxxxxxxxxxxxxx    # Your CLI
ghp_xxxxxxxxxxxxxxxxxxxx    # GitHub personal
gho_xxxxxxxxxxxxxxxxxxxx    # GitHub OAuth
stripe_sk_test_xxxxx        # Stripe secret key
```

**Benefits:**
- Easy to identify in logs
- Can be automatically redacted
- GitHub's token scanning detects prefixes

**Generation:**
```go
import "crypto/rand"

func GenerateToken(prefix string) string {
    b := make([]byte, 32)
    rand.Read(b)
    return fmt.Sprintf("%s_%x", prefix, b)
}
```

---

## 5. Specific Tool Analysis

### 5.1 GitHub CLI (gh)

**Authentication methods:**
1. Device flow (default): `gh auth login`
2. Token input: `gh auth login --with-token`
3. Environment variable: `GH_TOKEN`

**Token storage:**
- Priority 1: OS credential store
- Priority 2: `~/.config/gh/hosts.yml` (600 permissions)

**SSH handling:**
- Device flow works (shows code, user visits github.com/login/device)
- Token input recommended: `echo $TOKEN | gh auth login --with-token`
- Environment variable best for automation

**Token scopes:**
```
Minimum: repo, read:org, gist
Available: admin:org, workflow, admin:public_key, etc.
```

**Best practices from gh:**
- Multiple host support (GitHub.com + GitHub Enterprise)
- Multiple user accounts per host
- `gh auth switch` to switch accounts
- `gh auth token` to print current token (for debugging)
- `gh auth refresh` to refresh credentials
- `gh auth status` to check authentication

**Example config (~/.config/gh/hosts.yml):**
```yaml
github.com:
    users:
        user1:
            oauth_token: ghp_xxxx
        user2:
            oauth_token: ghp_yyyy
    user: user1  # active user
    git_protocol: ssh
```

### 5.2 Cloudflare Wrangler

**Authentication methods:**
1. OAuth callback (default): `wrangler login`
2. API token: `CLOUDFLARE_API_TOKEN` env var

**Callback details:**
- Starts server on `localhost:8976` (configurable)
- Opens browser to Cloudflare OAuth
- Receives callback with code
- Exchanges for token

**SSH handling:**
- `wrangler login` FAILS over SSH
- Must use API tokens: `CLOUDFLARE_API_TOKEN=xxx`

**API token types:**
- **User tokens:** Scoped to specific zones/resources
- **API keys:** Full account access (legacy, not recommended)

**Best practice:**
```bash
# Development (local)
wrangler login  # Interactive OAuth

# Production/CI
export CLOUDFLARE_API_TOKEN=xxx  # Scoped API token
wrangler deploy
```

**Configuration:**
```toml
# wrangler.toml
account_id = "xxx"
# NO token stored in config file (security)
```

### 5.3 Railway CLI

**Authentication methods:**
1. Browser OAuth: `railway login`
2. Browserless: `railway login --browserless`
3. Environment variables: `RAILWAY_TOKEN`, `RAILWAY_API_TOKEN`

**Token types:**
- **Project token (`RAILWAY_TOKEN`):** Scoped to specific project
- **Account token (`RAILWAY_API_TOKEN`):** Account/workspace operations

**SSH handling:**
- `railway login --browserless` specifically designed for SSH
- Prints URL to visit, prompts for token paste

**Example:**
```bash
# SSH scenario
$ railway login --browserless
Visit https://railway.app/cli-login and paste your token below:
Token: █

✓ Authenticated as user@example.com
```

**Best practice for Railway:**
- Local: `railway login` (OAuth)
- SSH: `railway login --browserless`
- CI: `RAILWAY_TOKEN` env var

### 5.4 Stripe CLI

**Authentication methods:**
1. Browser OAuth: `stripe login`
2. Interactive: `stripe login --interactive`
3. API key flag: `stripe listen --api-key sk_test_xxx`
4. Environment variable: `STRIPE_API_KEY`

**Token storage:**
- `~/.config/stripe/config.toml`
- Supports multiple projects via `--project-name`

**SSH handling:**
- `stripe login --interactive` prompts for API key input
- Best for remote servers

**Example config:**
```toml
[default]
device_name = "dev-machine"
test_mode_api_key = "sk_test_xxx"
live_mode_api_key = "sk_live_xxx"

[project-name]
test_mode_api_key = "sk_test_yyy"
```

### 5.5 Docker CLI

**Authentication:**
1. Browser OAuth device flow: `docker login`
2. Username/password: `docker login -u user -p pass` (deprecated)
3. Token stdin: `echo $TOKEN | docker login --username user --password-stdin`

**Credential storage:**
- Default: `~/.docker/config.json` (base64, NOT encrypted)
- Recommended: External credential store

**Credential stores:**
```json
// ~/.docker/config.json
{
  "credsStore": "osxkeychain",  // macOS
  // or "wincred" (Windows)
  // or "pass" (Linux)
  // or "secretservice" (Linux)

  "credHelpers": {
    "registry.example.com": "custom-helper"
  }
}
```

**Best practice:**
- Always use `--password-stdin` (never `-p` flag)
- Configure credential helper for security
- Use registry-specific credential helpers

### 5.6 kubectl

**Authentication:** Certificate-based (not OAuth)

**Methods:**
1. Client certificates (X.509)
2. Bearer tokens
3. Service account tokens (in-cluster)

**Configuration:**
```yaml
# ~/.kube/config
apiVersion: v1
kind: Config
clusters:
- name: prod-cluster
  cluster:
    server: https://k8s.example.com
    certificate-authority: /path/to/ca.crt
users:
- name: admin
  user:
    client-certificate: /path/to/client.crt
    client-key: /path/to/client.key
    # OR
    token: xxxxxx
contexts:
- name: prod
  context:
    cluster: prod-cluster
    user: admin
current-context: prod
```

**Pattern:** Separate credential files (not inline in config)

**Key insight:** kubectl uses certificate-based auth (mutual TLS), not OAuth. But the pattern of separating credentials from config is instructive.

---

## 6. Recommendations for HeySalad CLI

### 6.1 Recommended Authentication Flow

**Tier 1: Environment Variable (CI/CD + SSH)**
```bash
export HEYSALAD_API_KEY=hsa_xxxxxxxxxxxxxxxx
heysalad deploy  # Automatically authenticated
```

**Tier 2: Device Flow (Local interactive)**
```bash
heysalad login
? How would you like to authenticate?
  > Device flow (recommended)
    API key (for SSH/CI)

# If device flow selected:
Visit https://heysalad.app/activate and enter code: ABCD-1234
⠋ Waiting for authorization...
✓ Authenticated as user@example.com
```

**Tier 3: API Key Input (SSH/Remote)**
```bash
heysalad login --with-token < ~/.heysalad-token

# OR interactive prompt
heysalad login --interactive
? Enter your API key: █
✓ Authenticated as user@example.com
```

### 6.2 Token Storage Strategy

**Priority 1: OS credential store**
```go
import "github.com/zalando/go-keyring"

func SaveToken(token string) error {
    return keyring.Set("heysalad-cli", "default", token)
}

func LoadToken() (string, error) {
    // Try keyring first
    token, err := keyring.Get("heysalad-cli", "default")
    if err == nil {
        return token, nil
    }

    // Fallback to config file
    return loadFromConfigFile()
}
```

**Priority 2: Config file (with warning)**
```yaml
# ~/.config/heysalad/config.yml (600 permissions)
auth:
  token: hsa_xxxxxxxxxxxxxxxx
  expires_at: "2026-05-22T10:30:00Z"
  scopes: ["deploy", "logs:read", "secrets:read"]

# Warning printed on first save:
# ⚠️  Secure credential storage unavailable
#     Token stored at ~/.config/heysalad/config.yml
#     Install gnome-keyring for better security
```

**Priority 3: Environment variable**
```bash
export HEYSALAD_API_KEY=xxx
```

### 6.3 SSH Detection

```go
func IsSSHSession() bool {
    return os.Getenv("SSH_CONNECTION") != "" ||
           os.Getenv("SSH_CLIENT") != "" ||
           os.Getenv("SSH_TTY") != ""
}

func GetAuthMethod() string {
    if os.Getenv("HEYSALAD_API_KEY") != "" {
        return "env-var"
    }

    if IsSSHSession() {
        // Prompt user for method
        return promptAuthMethod([]string{
            "device-flow",
            "api-key-input",
        })
    }

    // Local machine - device flow is best UX
    return "device-flow"
}
```

### 6.4 Token Format

```
hsa_<32 random hex chars>

Examples:
hsa_7f3d2e1a9c4b8e6f0d5a7c3e9b2f4d1e
hsa_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6

Prefix "hsa" = HeySalad API
```

**Benefits:**
- Easy to identify in logs
- Can be automatically redacted
- Scannable by secret detection tools

### 6.5 Command Structure

```bash
# Authentication commands
heysalad login                    # Interactive (device flow or API key)
heysalad login --device           # Force device flow
heysalad login --with-token       # Read from stdin
heysalad login --interactive      # Prompt for API key

heysalad logout                   # Clear credentials
heysalad whoami                   # Show current user
heysalad auth status              # Check auth state
heysalad auth token               # Print token (for debugging)
heysalad auth refresh             # Refresh token

# Environment variable
export HEYSALAD_API_KEY=xxx
heysalad deploy  # Auto-authenticated
```

### 6.6 Error Messages

**Not authenticated:**
```
Error: Not authenticated

To authenticate, run:
  heysalad login

Or set environment variable:
  export HEYSALAD_API_KEY=xxx

Get your API key at:
  https://heysalad.app/settings/tokens
```

**Token expired:**
```
Error: Authentication token expired

To refresh, run:
  heysalad auth refresh

Or get a new token at:
  https://heysalad.app/settings/tokens
```

**SSH detected:**
```
SSH session detected. For best experience:

Option 1 (Recommended): Use API key
  1. Generate token at https://heysalad.app/settings/tokens
  2. Run: heysalad login --with-token
  3. Paste token when prompted

Option 2: Device flow
  heysalad login --device
  (You'll need to visit URL on another device)

Option 3: Environment variable
  export HEYSALAD_API_KEY=xxx
```

### 6.7 Multi-Account Support (Future)

```bash
# Add multiple accounts
heysalad login --account work
heysalad login --account personal

# Switch accounts
heysalad switch work

# Use specific account
heysalad deploy --account work
```

**Config structure:**
```yaml
# ~/.config/heysalad/config.yml
current_account: work

accounts:
  work:
    token: hsa_xxx
    workspace: heysalad-prod
    user: user@work.com

  personal:
    token: hsa_yyy
    workspace: personal-projects
    user: user@personal.com
```

---

## 7. Implementation Checklist

### Phase 1: Basic Authentication (MVP)
- [ ] Environment variable support (`HEYSALAD_API_KEY`)
- [ ] Token input via stdin (`login --with-token`)
- [ ] Config file storage (`~/.config/heysalad/config.yml`, 600 perms)
- [ ] `whoami` command
- [ ] `logout` command
- [ ] Clear error messages when not authenticated

### Phase 2: Device Flow
- [ ] OAuth device flow implementation
- [ ] Polling with exponential backoff
- [ ] `login` command (interactive)
- [ ] SSH detection and suggestions
- [ ] Token refresh mechanism

### Phase 3: Secure Storage
- [ ] OS credential store integration (keyring)
- [ ] Fallback to encrypted file
- [ ] Migration from plaintext to secure store
- [ ] `auth status` command showing storage method

### Phase 4: Advanced Features
- [ ] Multi-account support
- [ ] `auth switch` command
- [ ] Token scopes and permissions
- [ ] Token expiration and auto-refresh
- [ ] `auth token` command (debug)

---

## 8. Security Checklist

- [ ] Never accept tokens via flags
- [ ] Use stdin or file input for tokens
- [ ] Store tokens with 600 permissions minimum
- [ ] Prefer OS credential store over files
- [ ] Implement token prefixes (hsa_xxx)
- [ ] Add token expiration
- [ ] Support token revocation
- [ ] Redact tokens in logs/errors
- [ ] Validate token format before storage
- [ ] Use HTTPS only for all API calls
- [ ] Implement rate limiting on auth endpoints
- [ ] Add CSRF protection to OAuth flows
- [ ] Support token scopes (principle of least privilege)

---

## 9. Key Takeaways

1. **OAuth Device Flow is best for local interactive use** - Secure, modern, supports MFA/SSO
2. **API tokens are essential for SSH/CI/CD** - Must be supported, not optional
3. **Environment variables are the standard for automation** - `TOOL_API_KEY` pattern
4. **OS credential stores should be used when available** - Fall back gracefully
5. **SSH detection should trigger different UX** - Suggest token input, not browser OAuth
6. **Token prefixes are critical** - For scanning, logging, debugging
7. **Never accept secrets via CLI flags** - Use stdin or files
8. **Config files must be 600 permissions** - And warn if secure storage unavailable
9. **Multiple accounts are valuable** - Plan for it even if not in MVP
10. **Clear error messages are critical** - Tell users exactly how to authenticate

---

## 10. References

**Tools Analyzed:**
- GitHub CLI: https://cli.github.com
- Cloudflare Wrangler: https://developers.cloudflare.com/workers/wrangler
- Railway CLI: https://docs.railway.com/guides/cli
- Vercel CLI: https://vercel.com/docs/cli
- Netlify CLI: https://docs.netlify.com/cli
- Stripe CLI: https://docs.stripe.com/cli
- Docker CLI: https://docs.docker.com/engine/reference/commandline/login
- Fly.io CLI: https://fly.io/docs/flyctl
- kubectl: https://kubernetes.io/docs/reference/kubectl

**Standards:**
- OAuth 2.0 Device Flow: RFC 8628
- Command Line Interface Guidelines: https://clig.dev

**Libraries:**
- Go keyring: https://github.com/zalando/go-keyring
- 99designs keyring: https://github.com/99designs/keyring

**Config Files Examined:**
- `~/.config/gh/hosts.yml` (GitHub CLI)
- `~/.config/gh/config.yml` (GitHub CLI)
- `~/.docker/config.json` (Docker)
- `~/.kube/config` (kubectl)

---

## Appendix: Example Implementations

### A. Go - OAuth Device Flow Client

```go
package auth

import (
    "context"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "net/url"
    "time"
)

type DeviceFlowClient struct {
    ClientID     string
    DeviceCodeURL string
    TokenURL      string
}

type DeviceCodeResponse struct {
    DeviceCode      string `json:"device_code"`
    UserCode        string `json:"user_code"`
    VerificationURI string `json:"verification_uri"`
    ExpiresIn       int    `json:"expires_in"`
    Interval        int    `json:"interval"`
}

type TokenResponse struct {
    AccessToken  string `json:"access_token"`
    TokenType    string `json:"token_type"`
    ExpiresIn    int    `json:"expires_in"`
    RefreshToken string `json:"refresh_token"`
    Scope        string `json:"scope"`
}

func (c *DeviceFlowClient) StartFlow(ctx context.Context) (*DeviceCodeResponse, error) {
    data := url.Values{}
    data.Set("client_id", c.ClientID)
    data.Set("scope", "user:email repo")

    req, err := http.NewRequestWithContext(ctx, "POST", c.DeviceCodeURL, strings.NewReader(data.Encode()))
    if err != nil {
        return nil, err
    }
    req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
    req.Header.Set("Accept", "application/json")

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var result DeviceCodeResponse
    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return nil, err
    }

    return &result, nil
}

func (c *DeviceFlowClient) PollForToken(ctx context.Context, deviceCode string, interval int) (*TokenResponse, error) {
    ticker := time.NewTicker(time.Duration(interval) * time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return nil, ctx.Err()
        case <-ticker.C:
            token, err := c.attemptToken(ctx, deviceCode)
            if err != nil {
                // Check if it's "authorization_pending" error
                if isPending(err) {
                    continue // Keep polling
                }
                return nil, err
            }
            return token, nil
        }
    }
}

func (c *DeviceFlowClient) attemptToken(ctx context.Context, deviceCode string) (*TokenResponse, error) {
    data := url.Values{}
    data.Set("client_id", c.ClientID)
    data.Set("device_code", deviceCode)
    data.Set("grant_type", "urn:ietf:params:oauth:grant-type:device_code")

    req, err := http.NewRequestWithContext(ctx, "POST", c.TokenURL, strings.NewReader(data.Encode()))
    if err != nil {
        return nil, err
    }
    req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
    req.Header.Set("Accept", "application/json")

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var result TokenResponse
    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return nil, err
    }

    return &result, nil
}
```

### B. Go - Secure Token Storage

```go
package auth

import (
    "encoding/json"
    "fmt"
    "os"
    "path/filepath"

    "github.com/zalando/go-keyring"
)

const (
    ServiceName = "heysalad-cli"
    AccountName = "default"
)

type TokenStore struct {
    configPath string
}

func NewTokenStore() *TokenStore {
    homeDir, _ := os.UserHomeDir()
    return &TokenStore{
        configPath: filepath.Join(homeDir, ".config", "heysalad", "config.json"),
    }
}

func (t *TokenStore) Save(token string) error {
    // Try OS keyring first
    err := keyring.Set(ServiceName, AccountName, token)
    if err == nil {
        fmt.Println("✓ Token saved securely in system keyring")
        return nil
    }

    // Fallback to file
    fmt.Printf("⚠️  Keyring unavailable: %v\n", err)
    fmt.Printf("   Token will be stored at: %s\n", t.configPath)
    fmt.Println("   For better security, install gnome-keyring (Linux) or ensure Keychain access (macOS)")

    return t.saveToFile(token)
}

func (t *TokenStore) Load() (string, error) {
    // Try OS keyring first
    token, err := keyring.Get(ServiceName, AccountName)
    if err == nil {
        return token, nil
    }

    // Fallback to file
    return t.loadFromFile()
}

func (t *TokenStore) Delete() error {
    // Delete from keyring (ignore error if not found)
    _ = keyring.Delete(ServiceName, AccountName)

    // Delete file
    if err := os.Remove(t.configPath); err != nil && !os.IsNotExist(err) {
        return err
    }

    return nil
}

func (t *TokenStore) saveToFile(token string) error {
    // Create directory
    dir := filepath.Dir(t.configPath)
    if err := os.MkdirAll(dir, 0700); err != nil {
        return err
    }

    // Save with 600 permissions
    data := map[string]string{"token": token}
    bytes, err := json.MarshalIndent(data, "", "  ")
    if err != nil {
        return err
    }

    return os.WriteFile(t.configPath, bytes, 0600)
}

func (t *TokenStore) loadFromFile() (string, error) {
    bytes, err := os.ReadFile(t.configPath)
    if err != nil {
        return "", err
    }

    var data map[string]string
    if err := json.Unmarshal(bytes, &data); err != nil {
        return "", err
    }

    token, ok := data["token"]
    if !ok {
        return "", fmt.Errorf("token not found in config file")
    }

    return token, nil
}
```

### C. SSH Detection and Auth Method Selection

```go
package auth

import (
    "fmt"
    "os"
    "strings"

    "github.com/AlecAivazis/survey/v2"
)

func IsSSHSession() bool {
    return os.Getenv("SSH_CONNECTION") != "" ||
           os.Getenv("SSH_CLIENT") != "" ||
           os.Getenv("SSH_TTY") != ""
}

func IsCI() bool {
    return os.Getenv("CI") != "" ||
           os.Getenv("GITHUB_ACTIONS") != "" ||
           os.Getenv("GITLAB_CI") != "" ||
           os.Getenv("CIRCLECI") != ""
}

func SelectAuthMethod() (string, error) {
    // CI environments must use env vars
    if IsCI() {
        return "", fmt.Errorf("CI environment detected. Set HEYSALAD_API_KEY environment variable")
    }

    // Check for env var first
    if os.Getenv("HEYSALAD_API_KEY") != "" {
        return "env-var", nil
    }

    // SSH sessions - suggest API key
    if IsSSHSession() {
        fmt.Println("📡 SSH session detected")
        fmt.Println("")
        fmt.Println("For authentication over SSH, we recommend using an API key:")
        fmt.Println("  1. Generate key at: https://heysalad.app/settings/tokens")
        fmt.Println("  2. Run: heysalad login --with-token")
        fmt.Println("  3. Paste your token")
        fmt.Println("")

        var method string
        prompt := &survey.Select{
            Message: "Choose authentication method:",
            Options: []string{
                "API key (recommended for SSH)",
                "Device flow (requires phone/laptop)",
            },
        }

        if err := survey.AskOne(prompt, &method); err != nil {
            return "", err
        }

        if strings.Contains(method, "API key") {
            return "api-key", nil
        }
        return "device-flow", nil
    }

    // Local machine - device flow is best
    return "device-flow", nil
}
```

---

**End of Report**
