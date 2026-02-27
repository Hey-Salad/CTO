# Google Gemini APIs — Integration Reference

Two separate Google APIs are used in this project. They have different endpoints, authentication flows, response formats, and available models.

---

## 1. Google AI Studio

| Property | Value |
|---|---|
| Base URL | `https://generativelanguage.googleapis.com` |
| Auth | API key via `?key=` query param |
| Env var | `GOOGLE_AI_STUDIO_KEY` |
| SDK | `@google/genai` |

### Available Models
- `gemini-2.5-flash` — fast, general purpose
- `gemini-3-flash-preview` — latest preview model, supports **thinking tokens**

### Example Request (SDK)
```typescript
import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_STUDIO_KEY });

const response = await ai.models.generateContent({
  model: 'gemini-3-flash-preview',
  contents: 'Write a hello world function',
});
console.log(response.text);
```

### Thinking Tokens
`gemini-3-flash-preview` returns thinking tokens alongside the visible response.
In a live test, a simple "hello world" request returned **334 thought tokens** before
generating the output. These tokens are internal reasoning steps and do not appear in
`response.text` but count against your quota.

### Response Format
Standard JSON from `generateContent`:
```json
{
  "candidates": [{
    "content": {
      "parts": [{ "text": "..." }],
      "role": "model"
    },
    "finishReason": "STOP"
  }],
  "usageMetadata": {
    "promptTokenCount": 12,
    "candidatesTokenCount": 120,
    "thoughtsTokenCount": 334
  }
}
```

---

## 2. Google Vertex AI

| Property | Value |
|---|---|
| Base URL | `https://aiplatform.googleapis.com/v1/publishers/google/models` |
| Auth | API key via `?key=` query param |
| Env var | `VERTEX_AI_API_KEY` |
| SDK | None — plain `fetch()` |

### Available Models
- `gemini-2.5-flash-lite` — lightweight, fast, cost-efficient

### Endpoint Pattern
```
POST https://aiplatform.googleapis.com/v1/publishers/google/models/{model}:streamGenerateContent?key={key}
```

### Example Request (fetch)
```typescript
const url = `https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash-lite:streamGenerateContent?key=${apiKey}`;

const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
  }),
});

const text = await response.text();
const chunks = JSON.parse(text); // Array of chunk objects
```

### Streaming Response Format
Vertex AI `streamGenerateContent` returns a **JSON array** of chunk objects (not
newline-delimited JSON):
```json
[
  {
    "candidates": [{
      "content": { "parts": [{ "text": "Hello" }], "role": "model" }
    }]
  },
  {
    "candidates": [{
      "content": { "parts": [{ "text": " world!" }], "role": "model" }
    }]
  }
]
```

To reconstruct the full text, concatenate all `candidates[].content.parts[].text` values
across all chunks.

---

## Smart Rotation Strategy

The `SmartRouter` in `src/providers/smart-router.ts` tries providers in this order:

```
Request
  → gemini-3-flash-preview (AI Studio)    ← primary, thinking tokens
  → gemini-2.5-flash-lite  (Vertex AI)    ← fallback
  → Mock                                  ← dev / last resort
```

### Health Tracking
Each provider tracks:
- `failCount` — consecutive failures since last success
- `lastError` — message from the most recent failure
- `lastSuccessAt` — timestamp of last successful response
- `deprioritizedAt` — set when `failCount >= 3`

After **3 consecutive failures** a provider is deprioritised for **5 minutes**.
Deprioritised providers are moved to the end of the rotation but never fully removed.
On success the failure counter resets to zero.

### CLI Usage
```bash
# Explicit SmartRouter flag
node dist/cli.js "What is 2+2" --router

# Automatically uses SmartRouter when primary is gemini
node dist/cli.js "Write hello world" -p gemini

# Target a specific provider directly (no fallback)
node dist/cli.js "Write hello world" -p vertex-ai
```

---

## Key Differences Summary

| | AI Studio | Vertex AI |
|---|---|---|
| Endpoint host | `generativelanguage.googleapis.com` | `aiplatform.googleapis.com` |
| Method suffix | `:generateContent` | `:streamGenerateContent` |
| Response format | Single JSON object | JSON array of chunks |
| SDK | `@google/genai` | Plain `fetch()` |
| Thinking tokens | Yes (`gemini-3-flash-preview`) | No |
| Best model | `gemini-3-flash-preview` | `gemini-2.5-flash-lite` |
