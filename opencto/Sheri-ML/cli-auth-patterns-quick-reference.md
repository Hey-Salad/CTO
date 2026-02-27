# CLI Authentication Patterns - Quick Reference

**TL;DR:** Modern CLI tools use a hybrid approach: OAuth Device Flow for local interactive use + API tokens for SSH/CI/CD environments.

---

## The Winning Pattern (Used by GitHub, Railway, Stripe, Docker)

### 1. Priority Order for Auth

```go
func GetToken() (string, error) {
    // 1. Environment variable (highest priority)
    if token := os.Getenv("TOOL_API_KEY"); token != "" {
        return token, nil
    }

    // 2. OS keychain/credential store
    token, err := keyring.Get("tool-name", "default")
    if err == nil {
        return token, nil
    }

    // 3. Config file
    token, err = loadFromFile("~/.config/tool/config.yml")
    if err == nil {
        return token, nil
    }

    // 4. Not authenticated
    return "", errors.New("not authenticated")
}
```

### 2. Smart Login Flow

```go
func Login() error {
    // Check if already authenticated
    if token, _ := GetToken(); token != "" {
        fmt.Println("Already authenticated")
        return nil
    }

    // Detect environment
    if isCI() {
        return errors.New("CI detected. Set TOOL_API_KEY environment variable")
    }

    if isSSH() {
        return sshAuthFlow()  // Suggest API token
    }

    // Local machine - device flow
    return deviceFlowAuth()
}

func isSSH() bool {
    return os.Getenv("SSH_CONNECTION") != "" ||
           os.Getenv("SSH_CLIENT") != ""
}

func isCI() bool {
    return os.Getenv("CI") == "true" ||
           os.Getenv("GITHUB_ACTIONS") == "true"
}
```

### 3. Token Storage (GitHub CLI Pattern)

```go
import "github.com/zalando/go-keyring"

func SaveToken(token string) error {
    // Try OS keychain first
    err := keyring.Set("tool-name", "default", token)
    if err == nil {
        fmt.Println("✓ Token saved in system keychain")
        return nil
    }

    // Fallback to file with warning
    fmt.Printf("⚠️  Keyring unavailable: %v\n", err)
    fmt.Println("   Token will be stored at ~/.config/tool/config.yml")
    fmt.Println("   Install gnome-keyring for better security")

    return saveToFile(token)
}

func saveToFile(token string) error {
    path := "~/.config/tool/config.yml"
    dir := filepath.Dir(path)

    // Create directory with 700 permissions
    if err := os.MkdirAll(dir, 0700); err != nil {
        return err
    }

    data := map[string]string{"token": token}
    bytes, _ := yaml.Marshal(data)

    // Save with 600 permissions (user read/write only)
    return os.WriteFile(path, bytes, 0600)
}
```

---

## OAuth Device Flow (Best for Local Interactive)

### Implementation

```go
type DeviceFlowClient struct {
    ClientID      string
    DeviceCodeURL string
    TokenURL      string
}

func (c *DeviceFlowClient) Authenticate() (string, error) {
    // 1. Request device code
    resp, err := c.requestDeviceCode()
    if err != nil {
        return "", err
    }

    // 2. Display instructions to user
    fmt.Println("\nAuthentication required:")
    fmt.Printf("Visit: %s\n", resp.VerificationURI)
    fmt.Printf("Enter code: %s\n\n", resp.UserCode)

    // 3. Poll for token
    ctx, cancel := context.WithTimeout(context.Background(),
        time.Duration(resp.ExpiresIn)*time.Second)
    defer cancel()

    token, err := c.pollForToken(ctx, resp.DeviceCode, resp.Interval)
    if err != nil {
        return "", err
    }

    return token.AccessToken, nil
}

func (c *DeviceFlowClient) requestDeviceCode() (*DeviceCodeResponse, error) {
    data := url.Values{}
    data.Set("client_id", c.ClientID)
    data.Set("scope", "deploy logs:read")

    resp, err := http.PostForm(c.DeviceCodeURL, data)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var result DeviceCodeResponse
    json.NewDecoder(resp.Body).Decode(&result)
    return &result, nil
}

func (c *DeviceFlowClient) pollForToken(ctx context.Context, deviceCode string, interval int) (*TokenResponse, error) {
    ticker := time.NewTicker(time.Duration(interval) * time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return nil, errors.New("authentication timeout")

        case <-ticker.C:
            token, err := c.attemptTokenExchange(deviceCode)
            if err != nil {
                if isAuthPending(err) {
                    continue  // Keep polling
                }
                return nil, err
            }
            return token, nil
        }
    }
}
```

### API Endpoints Required

**1. Device Code Request:**
```http
POST /api/v1/auth/device/code
Content-Type: application/x-www-form-urlencoded

client_id=tool-cli&scope=deploy logs:read

Response 200:
{
  "device_code": "d3v1c3c0d3",
  "user_code": "ABCD-1234",
  "verification_uri": "https://example.com/activate",
  "expires_in": 900,
  "interval": 5
}
```

**2. Token Exchange (polling):**
```http
POST /api/v1/auth/device/token
Content-Type: application/x-www-form-urlencoded

device_code=d3v1c3c0d3&grant_type=urn:ietf:params:oauth:grant-type:device_code

Response 400 (pending):
{
  "error": "authorization_pending"
}

Response 200 (approved):
{
  "access_token": "token_xxx",
  "token_type": "Bearer",
  "expires_in": 7776000
}
```

---

## API Token Flow (Best for SSH/CI)

### CLI Commands

```bash
# GitHub CLI pattern (BEST)
echo $TOKEN | gh auth login --with-token

# Stripe CLI pattern
stripe login --interactive
? Paste your API key: █

# Railway CLI pattern
railway login --browserless
Visit https://railway.app/cli-login and paste your token below:
Token: █
```

### Implementation

```go
func TokenInputAuth(reader io.Reader) error {
    fmt.Println("Paste your API token:")
    fmt.Println("(Get one at https://example.com/settings/tokens)")
    fmt.Print("\nToken: ")

    scanner := bufio.NewScanner(reader)
    if !scanner.Scan() {
        return errors.New("failed to read token")
    }

    token := strings.TrimSpace(scanner.Text())

    // Validate format
    if !strings.HasPrefix(token, "tool_") || len(token) != 36 {
        return errors.New("invalid token format")
    }

    // Verify with API
    if err := validateToken(token); err != nil {
        return fmt.Errorf("invalid token: %w", err)
    }

    // Save
    return SaveToken(token)
}
```

---

## Security Rules (From clig.dev + Industry Best Practices)

### ❌ NEVER Do This

```bash
# NEVER accept via flags (visible in ps output)
tool deploy --token xxx

# NEVER store without permissions check
echo "token=xxx" > ~/.config/tool/config

# NEVER use predictable tokens
token=12345
```

### ✅ ALWAYS Do This

```bash
# Accept via stdin
echo $TOKEN | tool login --with-token

# Or via file
tool login --with-token < token.txt

# Or environment variable
export TOOL_TOKEN=xxx
tool deploy
```

```go
// Store with strict permissions
os.WriteFile(path, data, 0600)  // User read/write only

// Use high-entropy tokens with prefixes
func GenerateToken(prefix string) string {
    b := make([]byte, 16)  // 128 bits
    rand.Read(b)
    return fmt.Sprintf("%s_%x", prefix, b)
}
// Result: tool_7f3d2e1a9c4b8e6f0d5a7c3e9b2f4d1e
```

---

## Token Format Best Practices

### Pattern (Used by GitHub, Stripe, Anthropic)

```
<prefix>_<random_hex>

Examples:
ghp_xxxxxxxxxxxxxxxxxxxx  (GitHub personal)
sk_test_xxxxxxxxxxxxxxx   (Stripe secret key)
claude_xxx                (Anthropic)
```

### Benefits
- **Detectable in logs** - Can automatically redact
- **Identifiable** - Know what service token belongs to
- **Scannable** - Secret scanning tools can find leaked tokens

### Implementation

```go
func GenerateToken(prefix string) (string, error) {
    b := make([]byte, 16)  // 16 bytes = 128 bits entropy
    if _, err := rand.Read(b); err != nil {
        return "", err
    }
    return fmt.Sprintf("%s_%x", prefix, b), nil
}

// Usage
accessToken, _ := GenerateToken("hsa")   // hsa_7f3d2e1a9c4b...
refreshToken, _ := GenerateToken("hsr")  // hsr_a1b2c3d4e5f6...
```

---

## Config File Structure

### Location (XDG Base Directory Specification)

```
~/.config/tool-name/config.yml    (Linux/macOS)
%APPDATA%\tool-name\config.yml    (Windows)
```

### Format

```yaml
# ~/.config/tool/config.yml (600 permissions)
version: 1
auth:
  token: tool_7f3d2e1a9c4b8e6f0d5a7c3e9b2f4d1e
  expires_at: "2026-05-22T10:30:00Z"
  user:
    email: user@example.com
    name: Jane Doe
  workspace:
    id: ws_123
    name: Production
```

### Permission Check (Critical!)

```go
func EnsureConfigPermissions(path string) error {
    info, err := os.Stat(path)
    if err != nil {
        return err
    }

    mode := info.Mode().Perm()
    if mode != 0600 {
        fmt.Printf("⚠️  Fixing config permissions: %o → 600\n", mode)
        return os.Chmod(path, 0600)
    }

    return nil
}
```

---

## Environment Variables

### Naming Convention

```bash
TOOL_API_KEY=xxx        # Primary (GitHub: GH_TOKEN)
TOOL_TOKEN=xxx          # Alternative
TOOL_AUTH_TOKEN=xxx     # Explicit
```

### Precedence (GitHub CLI Pattern)

```go
func GetTokenFromEnv() string {
    // Check multiple variants in order
    for _, key := range []string{"TOOL_API_KEY", "TOOL_TOKEN", "TOOL_AUTH"} {
        if val := os.Getenv(key); val != "" {
            return val
        }
    }
    return ""
}
```

### Use Case Matrix

| Environment | Method | Example |
|-------------|--------|---------|
| **Local Dev** | Device flow | `tool login` |
| **SSH Session** | Token input | `tool login --with-token` |
| **CI/CD** | Env var | `TOOL_API_KEY=xxx tool deploy` |
| **Docker** | Env var | `docker run -e TOOL_API_KEY=xxx` |
| **Scripts** | Env var | `export TOOL_API_KEY=$(cat ~/.token)` |

---

## Error Messages (User Experience)

### Not Authenticated

```
Error: Not authenticated

To authenticate, run:
  tool login

For remote/SSH, use:
  export TOOL_API_KEY=xxx
  (Get your key at https://example.com/settings/tokens)

For CI/CD, add TOOL_API_KEY to your secrets.
```

### SSH Detection

```
📡 SSH session detected

For easier authentication, we recommend:

Option 1 (Fastest):
  1. Get API key at https://example.com/settings/tokens
  2. Run: export TOOL_API_KEY=xxx

Option 2:
  tool login --with-token < token.txt

Option 3:
  tool login --device  (requires phone/laptop)
```

### Token Expired

```
Error: Authentication token expired

To refresh:
  tool auth refresh

Or login again:
  tool logout
  tool login
```

---

## Multi-Account Support (Advanced)

### Config Structure

```yaml
# ~/.config/tool/config.yml
current_account: work

accounts:
  work:
    token: tool_xxx
    user: user@work.com
    workspace: work-ws

  personal:
    token: tool_yyy
    user: user@personal.com
    workspace: personal-ws
```

### Commands

```bash
tool login --account work        # Add account
tool switch personal             # Switch account
tool deploy --account work       # One-off use
tool whoami                      # Show current account
```

---

## Testing Checklist

### Unit Tests
- [x] Token format validation
- [x] Token storage (file + keychain)
- [x] Token loading (env → keyring → file)
- [x] Permission enforcement (600)
- [x] Token expiration check

### Integration Tests
- [x] Device flow E2E
- [x] Token input flow
- [x] Environment variable auth
- [x] API calls with auth middleware
- [x] Token refresh

### Manual Tests
- [x] Local machine (device flow)
- [x] SSH session (token input)
- [x] CI environment (env var)
- [x] Not authenticated errors
- [x] Token expiration handling

---

## Tools Reference Matrix

| Tool | Device Flow | API Token | OAuth Callback | Browserless Mode | Keychain |
|------|-------------|-----------|----------------|------------------|----------|
| **GitHub CLI** | ✅ Default | ✅ --with-token | ❌ | ✅ Token input | ✅ |
| **Wrangler** | ❌ | ✅ Env var | ✅ Default | ❌ | ? |
| **Railway** | ✅ | ✅ Env var | ✅ | ✅ --browserless | ? |
| **Stripe** | ❌ | ✅ | ✅ | ✅ --interactive | ✅ |
| **Vercel** | ? | ✅ | ✅ Default | ? | ? |
| **Netlify** | ❌ | ✅ Env var | ✅ netlify login | ✅ Manual PAT | ✅ |
| **Fly.io** | ? | ✅ | ✅ | ✅ --interactive | ? |
| **Docker** | ✅ Hub only | ✅ | ❌ | ✅ --password-stdin | ✅ credsStore |

**Legend:**
- ✅ Supported
- ❌ Not supported
- ? Unknown/not documented

---

## Libraries

### Go
- **Keyring:** `github.com/zalando/go-keyring` - Simple, static binary
- **Keyring (advanced):** `github.com/99designs/keyring` - More backends
- **Survey (prompts):** `github.com/AlecAivazis/survey/v2` - Interactive prompts
- **Spinner:** `github.com/briandowns/spinner` - Progress indication

### Node.js
- **Keytar:** `keytar` - Electron keychain (requires native modules)
- **Inquirer:** `inquirer` - Interactive prompts
- **Ora:** `ora` - Spinners

### Python
- **Keyring:** `keyring` library - OS credential store
- **Click:** `click` - CLI framework with prompts

---

## Key Takeaways

1. **Hybrid approach wins:** Device flow for local + API tokens for remote
2. **SSH detection is critical:** Suggest token input, not browser flows
3. **Environment variables are standard:** All tools support `TOOL_API_KEY`
4. **OS keychain when available:** Fall back gracefully to files
5. **Token prefixes are essential:** `prefix_hexstring` format
6. **Never use CLI flags for secrets:** Use stdin or files
7. **Config files must be 600 permissions:** Check and fix automatically
8. **Clear error messages matter:** Tell users exactly what to do
9. **CI detection prevents confusion:** Block interactive auth in CI
10. **Multi-account support is valuable:** Plan architecture for it

---

## References

- **OAuth Device Flow:** RFC 8628
- **CLI Guidelines:** https://clig.dev
- **GitHub CLI:** https://cli.github.com
- **Cloudflare Wrangler:** https://developers.cloudflare.com/workers/wrangler
- **Railway CLI:** https://docs.railway.com
- **Stripe CLI:** https://docs.stripe.com/cli

---

**Last Updated:** 2026-02-22
