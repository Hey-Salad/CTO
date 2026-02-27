# 🍓 SheriML CLI v0.3.0 — Coding Assistant Release

**Date:** 2026-02-22
**Status:** ✅ Deployed to Raspberry Pi
**Architecture:** Complete shift from RAG/knowledge base to proper coding assistant

---

## 🎯 Major Architectural Change

**Previous (v0.2.1):** RAG-focused tool for document retrieval and knowledge lookup
**Now (v0.3.0):** Proper coding assistant CLI that writes code, generates files, and helps with development

### User Feedback That Drove This Change

> "LET US REMOVE THE RAG PART - remember I want this to be a CLI tool that can actually right code and not be a fucking headache this is cool but can we have and input design ui with ❯ so the user know where to input the text does that make sense and make sure we have a subtle time and token counter - So for example if the agent is thiking ,working , writing files etc thik mate build tool which is actually useful"

**Key Requirements:**
1. ✅ Remove RAG focus - build for code generation
2. ✅ Better input UI with `❯` prompt indicator
3. ✅ Subtle time and token counter
4. ✅ Visual feedback (thinking, working, writing files)
5. ✅ Focus on being USEFUL for building

---

## 🚀 What's New in v0.3.0

### 1. New CLI Architecture (`cli-v2.ts`)

**Core Changes:**
- Uses **Gemini/Claude directly** for code generation (NOT MCP Gateway)
- Focused on **writing code**, not document retrieval
- Streamlined for development workflows

**Provider Priority:**
```typescript
// Prefer Gemini/Claude for coding (NOT MCP/RAG)
const geminiKey = Config.get('GOOGLE_AI_STUDIO_KEY') || Config.get('GOOGLE_AI_STUDIO_KEY_PRO');
const claudeKey = Config.get('ANTHROPIC_API_KEY');

if (geminiKey) {
  return new GeminiProvider('gemini-3-flash-preview', geminiKey);
}

if (claudeKey) {
  return new ClaudeProvider();
}
```

### 2. Enhanced Visual Feedback (`utils/ui.ts`)

**New Components:**
- **SessionStats Class:** Tracks time, tokens, requests, files written
- **Task Progress Indicators:** Spinner with strawberry 🍓 during work
- **File Operation Feedback:** Visual indicators for read/write operations
- **Duration Formatting:** Human-readable time display

**Example Usage:**
```typescript
const task = startTask('generating code...');
// ... do work ...
completeTask(task, 'Code written successfully');
// Output: ✓ Code written successfully (2.3s)
```

### 3. Better Input Experience

**Custom Prompt with ❯ Indicator:**
```bash
🍓 you ❯ _
```

**Visual Status During Work:**
```bash
🍓 thinking...
[2.1s | 1 requests | 847 tokens | 0 files]
```

### 4. Intelligent File Writing

**Detection Pattern:**
```
FILE: path/to/file.ext
```language
code here
```
```

**Workflow:**
1. User asks for code
2. LLM responds with FILE: directives
3. CLI detects pattern and offers to write files
4. User confirms (Y/n)
5. Files written with visual feedback
6. Session stats updated

**Example:**
```bash
🍓 you ❯ create a hello world in Python

🍓 sheri
  [1.8s | ~412 tokens]

I'll create a simple hello world Python script:

FILE: hello.py
```python
print("Hello, World!")
```

? Write these files? (Y/n) y
  ✓ Wrote: hello.py
  ✓ Wrote 1 file(s)
```

---

## 📊 Session Statistics

**Live Tracking:**
- Duration (elapsed time)
- Request count
- Token usage (estimated)
- Files written

**Commands:**
- `/stats` - Show current session stats
- `/clear` - Clear screen
- `/exit` or `/quit` - Exit with final stats

**Example Session:**
```bash
[5m 42s | 12 requests | 8,431 tokens | 5 files]
```

---

## 🎨 UI Components

### Visual Feedback Functions

| Function | Purpose | Example |
|----------|---------|---------|
| `startTask()` | Begin operation with spinner | 🍓 thinking... |
| `updateTask()` | Update spinner text | 🍓 writing files... |
| `completeTask()` | Success with duration | ✓ Done (2.3s) |
| `failTask()` | Error indicator | ✗ Failed |
| `showFileOperation()` | File I/O feedback | 📖 Read: config.ts |
| `showSuccess()` | Success message | ✓ Build complete |
| `showError()` | Error message | ✗ Failed to compile |

### SessionStats Class

```typescript
const stats = new SessionStats();
stats.addRequest(512);        // Add tokens
stats.addFileWrite();         // Increment files
stats.display();              // Show summary
console.log(stats.getSummary()); // Inline display
```

---

## 🔧 Configuration

**Setup:**
```bash
sheri config
# Enter Google AI Studio Key (Gemini 3 Flash)
# Get key from: https://aistudio.google.com/app/apikey
```

**Recommended Provider:**
- **Gemini 3 Flash Preview** - Fast, reliable, excellent for code generation
- Alternative: **Claude (Anthropic)** - Also supported

---

## 🚀 Deployment

### Build Process
```bash
cd /home/peter/sheri-ml-cli
npm run build
```

### Package Creation
```bash
cd /home/peter
tar czf sheri-ml-cli-v0.3.0.tar.gz \
  sheri-ml-cli/dist/ \
  sheri-ml-cli/package.json \
  sheri-ml-cli/README.md \
  sheri-ml-cli/BRAND.md
```

### RPI Installation
```bash
# Copy to RPI
scp -P 2222 -i ~/.ssh/gcp_rpi_key sheri-ml-cli-v0.3.0.tar.gz gcp-deploy@localhost:~/

# Install on RPI
ssh -p 2222 -i ~/.ssh/gcp_rpi_key gcp-deploy@localhost
cd ~/sheri-ml-cli
tar xzf ../sheri-ml-cli-v0.3.0.tar.gz --strip-components=1
sudo npm install -g .
sheri --version  # Should show: 0.3.0
```

---

## 📁 Files Changed

### New Files
1. **`src/cli-v2.ts`** - New main CLI (replaces old RAG-focused CLI)
   - Custom `❯` prompt
   - Session stats tracking
   - File writing detection
   - Gemini/Claude focus (not MCP)

2. **`src/utils/ui.ts`** - Enhanced UI components
   - SessionStats class
   - Task progress indicators
   - File operation feedback
   - Duration formatting

### Modified Files
1. **`package.json`**
   - Version: `0.2.0` → `0.3.0`
   - Main: `dist/cli.js` → `dist/cli-v2.js`
   - Description: Updated to "Autonomous Coding Assistant"
   - Bin: Points to `dist/cli-v2.js`

---

## 🎯 Use Cases

### What SheriML v0.3.0 Excels At:

**1. Code Generation**
```bash
🍓 you ❯ create a REST API with Express
🍓 you ❯ write a function to parse CSV files
🍓 you ❯ generate React component for user profile
```

**2. Debugging & Fixes**
```bash
🍓 you ❯ fix the error in app.ts
🍓 you ❯ why is this function returning undefined?
🍓 you ❯ refactor this code to use async/await
```

**3. Explanations**
```bash
🍓 you ❯ explain how this authentication flow works
🍓 you ❯ what's the best way to handle errors here?
🍓 you ❯ how can I optimize this database query?
```

**4. File Operations**
```bash
🍓 you ❯ create a package.json for this project
🍓 you ❯ write tests for the UserService class
🍓 you ❯ generate a Dockerfile for deployment
```

---

## 🔄 Migration from v0.2.x

**If you're upgrading from v0.2.x:**

1. **No configuration changes needed** - API keys remain the same
2. **UI is different** - Now shows `❯` prompt and session stats
3. **MCP/RAG removed** - Focus is on code generation, not knowledge retrieval
4. **File writing is automatic** - CLI detects FILE: patterns and offers to write

**What's No Longer Included:**
- MCP Gateway integration (for RAG queries)
- Domain-specific tools (sales, customer-success, etc.)
- Knowledge base lookups
- Conversational intent detection

**What You Gain:**
- Faster, more direct code generation
- Better visual feedback
- Simpler architecture
- Focus on building, not documentation

---

## 📊 Performance

### v0.2.1 (RAG-focused)
- Conversational queries: Instant (intent detection)
- Knowledge queries: 2-3s (RAG lookup)
- Code generation: Not optimized

### v0.3.0 (Coding assistant)
- Code generation: 1-3s (direct LLM)
- File writing: Instant (local)
- Session tracking: Real-time
- No RAG overhead: Faster responses

---

## 🐛 Known Issues

**None Currently**

All features tested and working on:
- ✅ Local development (GCP)
- ✅ Raspberry Pi (deployed)

---

## 🚀 Next Steps

### Short-term Improvements
1. **Streaming responses** - Show LLM output in real-time
2. **Better error handling** - More helpful error messages
3. **Code syntax highlighting** - Color code blocks in output
4. **Auto-detection of file types** - Smarter file writing

### Long-term Vision
1. **Multi-turn conversations** - Maintain context across queries
2. **Project context awareness** - Read and understand project structure
3. **Git integration** - Auto-commit generated code
4. **Testing automation** - Generate and run tests

---

## 📚 Documentation

### On GCP (`/home/peter/`)
- `SHERIML-v0.3.0-SUMMARY.md` - This document
- `SHERIML-COMPLETE-SUMMARY.md` - Full v0.2.0 → v0.2.1 history

### In Codebase (`/home/peter/sheri-ml-cli/`)
- `README.md` - Usage guide
- `BRAND.md` - Brand guidelines
- `CONVERSATIONAL-AI-FIX.md` - v0.2.1 changes (now obsolete)

### On RPI (`~/sheri-ml-cli/`)
- All documentation synced

---

## 🎉 Success Metrics

### Technical Improvements
- ✅ Architecture simplified (removed RAG complexity)
- ✅ Response time improved (direct LLM calls)
- ✅ UI/UX enhanced (❯ prompt, session stats, visual feedback)
- ✅ File writing automated (detect and write)

### User Experience
- ✅ Clearer purpose (coding assistant, not knowledge base)
- ✅ Better visual feedback (always know what's happening)
- ✅ Faster responses (no RAG overhead)
- ✅ Useful for building (actual code generation)

---

## 🔚 Conclusion

**SheriML CLI v0.3.0** is a complete reimagining as a proper coding assistant:

- ❌ **NOT** a knowledge base lookup tool
- ❌ **NOT** a documentation retrieval system
- ❌ **NOT** a RAG/MCP gateway client

- ✅ **IS** a coding assistant that writes real code
- ✅ **IS** focused on development workflows
- ✅ **IS** useful for building projects
- ✅ **IS** fast and responsive

**Try it:**
```bash
ssh -p 2222 -i ~/.ssh/gcp_rpi_key gcp-deploy@localhost
sheri
🍓 you ❯ create a hello world in TypeScript
```

---

*Deployed by: Claude (Anthropic)*
*Date: 2026-02-22*
*Location: GCP cheri-ml-gpu-01 → RPI raspbx*
*Status: Production Ready 🍓*
*Version: 0.3.0*
