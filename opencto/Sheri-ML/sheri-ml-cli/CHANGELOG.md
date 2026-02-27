# Changelog

All notable changes to SheriML CLI will be documented in this file.

## [0.3.0] - 2026-02-22

### 🚀 Major Release: Coding Assistant

**Complete architectural shift from RAG/knowledge base to proper coding assistant.**

#### Added
- ✨ New CLI (`cli-v2.ts`) focused on code generation, not document retrieval
- ✨ Enhanced UI components (`utils/ui.ts`) with visual feedback
- ✨ Custom `❯` prompt indicator for better input experience
- ✨ Session statistics tracking (time, tokens, requests, files written)
- ✨ Automatic file writing detection (FILE: pattern recognition)
- ✨ Task progress indicators with spinners
- ✨ File operation feedback (read/write indicators)
- ✨ Duration formatting for all operations
- ✨ Real-time session stats display (`/stats` command)

#### Changed
- 🔄 **BREAKING:** Removed MCP Gateway integration (focus on code generation)
- 🔄 **BREAKING:** Removed RAG knowledge base queries
- 🔄 **BREAKING:** Removed domain-specific tools (sales, customer-success, etc.)
- 🔄 Main CLI entry point: `dist/cli.js` → `dist/cli-v2.js`
- 🔄 Description: "MCP Gateway integration" → "Coding Assistant"
- 🔄 Provider priority: Gemini/Claude (not MCP)
- 🔄 Configuration: Simplified to Gemini/Claude only

#### Fixed
- ✅ Better visual feedback during code generation
- ✅ Clearer purpose and UX
- ✅ Faster responses (no RAG overhead)
- ✅ More useful for actual development

#### What You Gain
- 🎯 Direct code generation with Gemini/Claude
- 🎯 Better input UI with `❯` prompt
- 🎯 Subtle time and token counters
- 🎯 Visual feedback (thinking, working, writing files)
- 🎯 Focus on building, not documentation lookup

#### What's Removed
- ❌ MCP Gateway integration
- ❌ RAG knowledge base queries
- ❌ Domain-specific tools (engineering, sales, etc.)
- ❌ Conversational intent detection (v0.2.1)

#### Migration Guide
No configuration changes needed - API keys remain the same. Simply upgrade:
```bash
npm install -g @heysalad/sheri-ml-cli@latest
```

See `SHERIML-v0.3.0-SUMMARY.md` for full details.

---

## [0.2.1] - 2026-02-22

### 🗣️ Conversational AI Fix

#### Added
- Conversational intent detection in `mcp.ts`
- Greeting responses ("hi", "hello", "hey")
- Status check responses ("are you there?")
- Capability queries ("what can you do?")
- Helpful fallbacks when RAG finds nothing

#### Changed
- `generate()` method now checks for conversational intent first
- Better error messages when knowledge base is empty

#### Fixed
- No longer returns "I could not find relevant information" for greetings
- Always provides helpful guidance

---

## [0.2.0] - 2026-02-22

### 🍓 Brand Identity & Bug Fixes

#### Added
- Complete HeySalad brand identity
  - Cherry Red (#ed4c4c), Peach (#faa09a), Light Peach (#ffd0cd)
  - Strawberry emoji 🍓 throughout (20+ locations)
  - Centralized color system (`utils/colors.ts`)
- Documentation:
  - `BRAND.md` - Complete brand guidelines
  - `CHANGES.md` - Detailed changelog
  - `RPI-DEPLOY.md` - Deployment instructions
  - `test-cli.sh` - Test suite

#### Changed
- All commands use new brand colors (team, metrics, roadmap)
- CLI branding with strawberry 🍓
- Updated README with brand section

#### Fixed
- **Critical:** Config loading bug
  - Problem: Users saved API keys but got "No API keys found"
  - Root cause: Early returns prevented loading global config
  - Fix: Load global config first, then local with override
  - Result: Config now works perfectly ✅

---

## [0.1.0] - 2026-02-21

### 🎉 Initial Release

#### Added
- Multi-provider AI support (Gemini, Claude, MCP)
- MCP Gateway integration with 8 domains
- RAG knowledge base queries
- Interactive chat mode
- Team, metrics, and roadmap commands
- Configuration management
- Raspberry Pi support

---

*For detailed information about each release, see the corresponding SUMMARY files.*
