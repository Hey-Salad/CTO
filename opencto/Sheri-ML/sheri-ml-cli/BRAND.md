# 🍓 SheriML Brand Guide

## Brand Identity

**SheriML** is HeySalad's Autonomous CTO CLI — a friendly, powerful AI assistant that lives in your terminal.

---

## 🎨 Color Palette

### Primary Colors

| Color | Hex | Usage |
|-------|-----|-------|
| 🍓 **Cherry Red** | `#ed4c4c` | Primary brand color, headings, important actions |
| 🍓 **Peach** | `#faa09a` | Secondary color, success states, highlights |
| 🍓 **Light Peach** | `#ffd0cd` | Accents, borders, subtle elements |
| 🍓 **White** | `#ffffff` | Text, backgrounds |

### Semantic Colors

```typescript
primary: '#ed4c4c'      // Cherry red for main actions
secondary: '#faa09a'    // Peach for secondary elements
success: '#faa09a'      // Peach for positive feedback
warning: '#ed4c4c'      // Cherry red for warnings
error: '#ed4c4c'        // Bold cherry red for errors
info: '#faa09a'         // Peach for information
muted: gray             // Gray for subtle text
```

---

## 🔤 Typography

### Fonts

- **Grandstander** — Bold, playful headlines and branding
  - Used for: Logo, section headers, emphasis
  - Weight: Bold (700)

- **Figtree** — Clean, modern sans-serif for interface
  - Used for: Body text, CLI output, menus
  - Weights: Regular (400), Medium (500), Bold (700)

### CLI Typography

Since the CLI is monospace, we use visual hierarchy through:
- **Bold cherry red** for brand name and primary headings
- **Peach** for section titles and labels
- **White** for main content
- **Gray (muted)** for secondary information

---

## 🍓 The Strawberry Symbol

The strawberry emoji (🍓) is SheriML's signature symbol.

### Usage

- **Brand identity** — Always appears with the SheriML logo
- **Visual marker** — Used throughout the CLI to indicate HeySalad features
- **Friendly presence** — Creates a warm, approachable personality
- **Spinner prefix** — Appears during loading states

### Where it appears

```bash
🍓 sheriml                    # Logo with strawberry
🍓 Thinking...                # Loading spinner
🍓 sheriml v0.2.0             # Version header
🍓 you                        # User prompt
🍓 sheri [mcp]                # AI response
🍓 HeySalad MCP Gateway       # Feature labels
🍓 v0.3 — Milestone           # Milestone markers
```

---

## 🎭 Brand Voice & Tone

### Personality

- **Friendly** — Like chatting with a helpful friend
- **Professional** — Competent and reliable
- **Encouraging** — Positive, supportive feedback
- **Clear** — Direct communication, no jargon
- **Playful** — The strawberry adds a touch of fun

### Writing Style

✅ **DO:**
- Use active voice: "Creating your issue..." not "Your issue is being created..."
- Be concise: "Done ✓" not "The operation has completed successfully"
- Use emojis sparingly but meaningfully (🍓 for brand, ✓ for success, ⚡ for critical)
- Provide context: "MCP_API_KEY not set. Run: sheri config"

❌ **DON'T:**
- Use passive voice or technical jargon unnecessarily
- Over-explain simple actions
- Use excessive emojis (only strawberry 🍓 and status symbols)
- Be verbose when users need quick feedback

---

## 🖼️ Visual Examples

### CLI Header

```
🍓 sheriml v0.2.0  Autonomous CTO
```

### Model List

```
Available models:

▶ mcp                          🍓 HeySalad MCP Gateway — 8 domains, 19 tools
  gemini                       Gemini 3 Flash Preview
  cheri-ml                     🍓 Cheri ML 1.3B — Self-hosted
```

### Success State

```
✓ MCP_API_KEY saved
✓ Switched to mcp
✓ Code generated

🍓 All tests passed!
```

### Section Headers

```
🍓 sheriml  Team Members
🍓 sheriml  DORA Metrics
🍓 sheriml  Roadmap
```

### Chat Interface

```
🍓 you: create a github issue for the login bug
🍓 Thinking...
🍓 sheri [mcp]: I'll create that issue for you...
```

---

## 🎨 Implementation

### In Code

All brand elements are centralized in `src/utils/colors.ts`:

```typescript
import { colors, symbols, BRAND_WITH_STRAWBERRY } from './utils/colors';

// Use brand colors
console.log(colors.cherryRed('Important'));
console.log(colors.peach('Success!'));
console.log(colors.lightPeach('Accent'));

// Use symbols
console.log(symbols.strawberry);  // 🍓
console.log(symbols.check);       // ✓
console.log(symbols.lightning);   // ⚡

// Use branded logo
console.log(BRAND_WITH_STRAWBERRY);  // 🍓 sheriml
```

### Color Variables

```typescript
colors.cherryRed      // #ed4c4c
colors.peach          // #faa09a
colors.lightPeach     // #ffd0cd
colors.white          // white
colors.muted          // gray

// Semantic
colors.primary        // Cherry red
colors.secondary      // Peach
colors.success        // Peach
colors.warning        // Cherry red
colors.error          // Bold cherry red
```

---

## 📐 Design Principles

### 1. Consistency

Use the same colors, symbols, and patterns throughout:
- Cherry red for branding and emphasis
- Peach for secondary elements and success
- Light peach for subtle accents
- Strawberry 🍓 for HeySalad identity

### 2. Clarity

Make information hierarchy clear:
- **Bold cherry red** — Most important (brand, errors, warnings)
- **Peach** — Important (sections, success, labels)
- **White** — Content (regular text, values)
- **Gray** — Least important (hints, metadata)

### 3. Friendliness

The strawberry emoji makes SheriML approachable:
- Not too corporate
- Not too playful
- Just right — professional with personality

### 4. Accessibility

- Use sufficient color contrast
- Don't rely on color alone (use symbols too: ✓ ✗ ⚡)
- Provide clear text labels
- Keep terminal-friendly (works in light/dark themes)

---

## 🚀 Quick Reference

### Status Indicators

```typescript
✓ Success     colors.success + symbols.check
✗ Error       colors.error + symbols.cross
⚡ Critical    colors.cherryRed + symbols.lightning
⚠ Warning     colors.warning + symbols.warning
· Neutral     colors.muted + symbols.dot
```

### Text Hierarchy

```typescript
Level 1: colors.cherryRed.bold()     // Main headers
Level 2: colors.peach.bold()         // Section headers
Level 3: colors.white()              // Content
Level 4: colors.muted()              // Metadata
```

### Borders & Separators

```typescript
separator('─', 60)                   // Light peach line
colors.border('─'.repeat(60))        // Explicit border
```

---

## 📝 Examples in Context

### Team Command

```
🍓 sheriml  Team Members

Name                      Role                    Salary
────────────────────────────────────────────────────────
Peter Machona             CTO & Co-Founder        £130K
────────────────────────────────────────────────────────
2 people  ·  Annual: £215,000
```

### Metrics Command

```
🍓 sheriml  DORA Metrics  (2026-02)  ✓ HIGH

Deployment Frequency      3×/week       ~ MEDIUM
Change Failure Rate       8%            ✓ HIGH
MTTR                      2h            ✓ HIGH
```

### Roadmap Command

```
🍓 sheriml  Roadmap

── NOW ───────────────────────────────────────

◐ ⚡ Wire billing /check into MCP Gateway
○ ⚡ Sign-up page (email → API key)
◐ ▲ CLI: sheri team + metrics commands
```

---

## 🎯 Brand Goals

1. **Memorable** — The strawberry 🍓 makes us instantly recognizable
2. **Friendly** — Warm colors and playful symbol invite interaction
3. **Professional** — Clean design and clear typography build trust
4. **Consistent** — Same look and feel across all touchpoints
5. **Accessible** — Works for everyone, regardless of terminal theme

---

*Last updated: 2026-02-22*
*Brand guide version: 1.0*
