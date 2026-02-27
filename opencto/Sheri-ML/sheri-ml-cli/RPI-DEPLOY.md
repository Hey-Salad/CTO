# 🍓 Deploy SheriML CLI to Raspberry Pi

## Quick Deploy Guide

Follow these steps to deploy the fixed and branded SheriML CLI to your Raspberry Pi.

---

## 1. Transfer Files to RPi

### Option A: Via SCP (Recommended)

```bash
# From your local machine (where the CLI is built)
cd /home/peter
tar czf sheri-ml-cli.tar.gz sheri-ml-cli/
scp sheri-ml-cli.tar.gz admin@raspbx:~/

# On RPi
ssh admin@raspbx
cd ~
tar xzf sheri-ml-cli.tar.gz
cd sheri-ml-cli
```

### Option B: Via Git

```bash
# On RPi
ssh admin@raspbx
cd ~
git clone <your-repo-url> sheri-ml-cli
# or: git pull if already cloned
cd sheri-ml-cli
```

---

## 2. Install Dependencies on RPi

```bash
# Check Node.js version (needs ≥18)
node --version

# If Node.js not installed or too old:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install dependencies
cd ~/sheri-ml-cli
npm install
```

---

## 3. Build the CLI

```bash
npm run build
```

This compiles TypeScript → JavaScript in the `dist/` folder.

---

## 4. Install Globally

```bash
# Option A: npm link (for development)
npm link

# Option B: Global install (for production)
sudo npm install -g .

# Verify installation
which sheri
sheri --version  # Should show 0.2.0
```

---

## 5. Configure API Key

```bash
# Run config wizard
sheri config

# Select: 🍓 HeySalad MCP API Key (recommended)
# Paste your key from ~/heysalad-mcp-api-key.txt

# Or manually:
mkdir -p ~/.sheri-ml
echo "MCP_API_KEY=your-key-here" > ~/.sheri-ml/.env
echo "MCP_GATEWAY_URL=https://heysalad-mcp-gateway.heysalad-o.workers.dev" >> ~/.sheri-ml/.env
chmod 600 ~/.sheri-ml/.env
```

---

## 6. Test Installation

```bash
# Test version
sheri --version

# Test models list
sheri --models

# Test MCP connection
sheri mcp

# Test a simple query
sheri "what is our engineering runbook?"

# Test team commands
sheri team list
sheri metrics dora
sheri roadmap now
```

---

## 7. Verify Brand Colors

Run these commands and verify you see:
- 🍓 Strawberry emoji in headers
- Cherry red (#ed4c4c) for brand name
- Peach colors (#faa09a) for sections
- Light peach borders (#ffd0cd)

```bash
# Should show branded output
sheri --models
sheri team list
sheri metrics dora
```

---

## Troubleshooting

### Issue: "No API keys found" after config

**Fixed!** This was the main bug we solved. If you still see this:

1. Check config file exists:
   ```bash
   cat ~/.sheri-ml/.env
   ```

2. Verify API key is set:
   ```bash
   grep MCP_API_KEY ~/.sheri-ml/.env
   ```

3. Test manually:
   ```bash
   export MCP_API_KEY=$(cat ~/heysalad-mcp-api-key.txt)
   sheri --models
   ```

### Issue: Colors not showing

```bash
# Check terminal supports colors
echo $TERM  # Should be xterm-256color or similar

# Some RPi terminals need this:
export TERM=xterm-256color
echo 'export TERM=xterm-256color' >> ~/.bashrc
```

### Issue: Strawberry emoji not showing

```bash
# Install fonts with emoji support
sudo apt-get install fonts-noto-color-emoji

# Or use text-only mode (if needed - not recommended)
# We'll add a --no-emoji flag in next version
```

### Issue: Permission denied

```bash
# Fix node_modules permissions
sudo chown -R $USER:$USER ~/sheri-ml-cli

# Reinstall globally
cd ~/sheri-ml-cli
sudo npm uninstall -g @heysalad/sheri-ml-cli
sudo npm install -g .
```

---

## Performance on RPi

### Expected Performance

- **Startup time:** ~500ms
- **MCP queries:** ~2-3s (depends on network)
- **Local commands:** Instant (team, metrics, roadmap)
- **Memory usage:** ~50-70MB

### Optimization Tips

```bash
# 1. Use MCP model (no local GPU needed)
sheri --primary mcp "your question"

# 2. Avoid heavy models on RPi
# ✅ mcp, router
# ❌ cheri-ml (needs GPU), gemini-31-pro (slow API)

# 3. Cache config in shell
export MCP_API_KEY=$(cat ~/.sheri-ml/.env | grep MCP_API_KEY | cut -d= -f2)
```

---

## Next Steps

### Create Alias

Add to `~/.bashrc` for convenience:

```bash
echo 'alias s="sheri"' >> ~/.bashrc
echo 'alias sconfig="sheri config"' >> ~/.bashrc
echo 'alias smodels="sheri --models"' >> ~/.bashrc
source ~/.bashrc

# Now use:
s "your question"
sconfig
smodels
```

### Auto-update Script

```bash
# Create update script
cat > ~/update-sheri.sh << 'EOF'
#!/bin/bash
cd ~/sheri-ml-cli
git pull
npm install
npm run build
sudo npm install -g .
sheri --version
EOF

chmod +x ~/update-sheri.sh
```

### Run as Service (Optional)

If you want Sheri to auto-start with a chat interface:

```bash
# Create systemd service
sudo tee /etc/systemd/system/sheri-chat.service << EOF
[Unit]
Description=SheriML Chat Interface
After=network.target

[Service]
Type=simple
User=admin
WorkingDirectory=/home/admin
ExecStart=/usr/bin/sheri --chat
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable sheri-chat
sudo systemctl start sheri-chat
```

---

## Files Deployed

```
~/sheri-ml-cli/
├── dist/                    # Built JavaScript
├── src/                     # TypeScript source
│   ├── cli.ts              # Main CLI (branded)
│   ├── agents/coder.ts     # Agent (branded)
│   ├── commands/           # Team, metrics, roadmap (branded)
│   └── utils/
│       ├── config.ts       # Config loader (FIXED)
│       └── colors.ts       # Brand system (NEW)
├── node_modules/            # Dependencies
├── package.json
├── README.md               # Updated with brand
├── BRAND.md                # Brand guide
├── CHANGES.md              # All changes documented
├── RPI-DEPLOY.md           # This file
└── test-cli.sh             # Test suite
```

---

## Support

If issues persist:

1. **Check logs:**
   ```bash
   sheri --verbose
   DEBUG=* sheri "test"
   ```

2. **Verify build:**
   ```bash
   ls -la dist/
   cat dist/cli.js | head -20
   ```

3. **Test locally first:**
   ```bash
   node dist/cli.js --version
   node dist/cli.js --models
   ```

4. **Contact:**
   - GitHub: [Hey-Salad/ai/issues](https://github.com/Hey-Salad/ai/issues)
   - Email: hello@heysalad.io

---

## Success Checklist

After deployment, verify:

- ✅ `sheri --version` shows 0.2.0
- ✅ `sheri config` saves API key successfully
- ✅ `sheri --models` shows MCP with 🍓
- ✅ `sheri mcp` connects to gateway
- ✅ `sheri "test"` generates response
- ✅ `sheri team list` shows branded colors
- ✅ All commands have strawberry 🍓 logo
- ✅ Cherry red and peach colors visible

If all checkmarks pass: **🍓 Deployment successful!**

---

*Deployed with love from the SheriML team* 🍓
