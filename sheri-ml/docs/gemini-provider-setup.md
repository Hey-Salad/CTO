# Gemini Provider Setup for Sheri ML

This guide shows how to configure and use the Google Gemini provider in Sheri ML.

## Quick Start

### 1. Get API Key

Visit [Google AI Studio](https://makersuite.google.com/app/apikey) and create an API key.

### 2. Set Environment Variable

```bash
export GEMINI_API_KEY="your-api-key-here"
```

### 3. Use Gemini

```bash
# Default Gemini model (gemini-3.1-flash)
sheri-ml -c model_provider="gemini" "Write a hello world function"

# Specific model
sheri-ml -c model_provider="gemini" -m gemini-3.1-pro "Explain async/await"

# Gemini 3.0
sheri-ml -c model_provider="gemini" -m gemini-3.0-pro "Review this code"
```

## Configuration File

Create or edit `~/.codex/config.toml`:

```toml
# Set Gemini as default provider
model_provider = "gemini"
model = "gemini-3.1-flash"

# The Gemini provider is built-in, but you can customize it:
[model_providers.gemini]
name = "Google Gemini"
base_url = "https://generativelanguage.googleapis.com/v1"
env_key = "GEMINI_API_KEY"
wire_api = "responses"
request_max_retries = 5
stream_max_retries = 3
stream_idle_timeout_ms = 300000
```

## Multi-Provider Configuration

Use multiple AI providers in the same config:

```toml
# Default provider
model_provider = "gemini"
model = "gemini-3.1-flash"

[model_providers.gemini]
name = "Google Gemini"
base_url = "https://generativelanguage.googleapis.com/v1"
env_key = "GEMINI_API_KEY"
wire_api = "responses"

[model_providers.anthropic]
name = "Anthropic Claude"
base_url = "https://api.anthropic.com/v1"
env_key = "ANTHROPIC_API_KEY"
wire_api = "responses"

[model_providers.cheri_ml]
name = "Cheri ML"
base_url = "http://localhost:8080/v1"
env_key = "CHERI_ML_API_KEY"
wire_api = "responses"

[model_providers.ollama]
name = "Ollama (Local)"
base_url = "http://localhost:11434/v1"
wire_api = "responses"
```

## Switching Providers

Switch between providers on the fly:

```bash
# Use Gemini
sheri-ml -c model_provider="gemini" "task here"

# Use Claude
sheri-ml -c model_provider="anthropic" -m claude-opus-4.6 "task here"

# Use local Ollama
sheri-ml --oss --local-provider ollama "task here"

# Use custom Cheri ML
sheri-ml -c model_provider="cheri_ml" "task here"
```

## Available Gemini Models

| Model | Description | Use Case |
|-------|-------------|----------|
| `gemini-3.1-flash` | Latest fast model | Quick tasks, iterations |
| `gemini-3.1-pro` | Latest pro model | Complex reasoning |
| `gemini-3.0-flash` | Fast and economical | Cost-effective tasks |
| `gemini-3.0-pro` | Advanced reasoning | Deep analysis |

## Proxy Configuration

If you need to use a proxy:

```toml
[model_providers.gemini_proxy]
name = "Gemini via Proxy"
base_url = "https://my-proxy.com/gemini/v1"
env_key = "GEMINI_API_KEY"
wire_api = "responses"
http_headers = { "X-Proxy-Auth" = "proxy-token" }
```

## CTO Mode: Multi-Agent with Multiple Providers

Sheri ML can coordinate multiple agents using different providers:

```bash
# Agent 1 uses Gemini for code generation
# Agent 2 uses Claude for code review
# Agent 3 uses local Ollama for quick checks

# Future CTO orchestration syntax:
sheri-ml cto --agents 3 \
  --agent-1-provider gemini --agent-1-model gemini-3.1-pro \
  --agent-2-provider anthropic --agent-2-model claude-opus-4.6 \
  --agent-3-provider ollama --agent-3-model codellama \
  "Build a web app with tests"
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Your Gemini API key | Required |
| `GOOGLE_API_KEY` | Alternative key name | Falls back to this |
| `CODEX_OSS_PORT` | Local model port | 11434 (Ollama) |
| `CODEX_OSS_BASE_URL` | Custom OSS endpoint | localhost |

## Troubleshooting

### API Key Not Found

```bash
# Check if set
echo $GEMINI_API_KEY

# Set persistently
echo 'export GEMINI_API_KEY="your-key"' >> ~/.bashrc
source ~/.bashrc
```

### Model Not Available

```bash
# List available models
curl "https://generativelanguage.googleapis.com/v1/models?key=$GEMINI_API_KEY" | jq '.models[].name'
```

### Rate Limits

Increase retry settings in config:

```toml
[model_providers.gemini]
request_max_retries = 10
stream_max_retries = 5
```

## Next Steps

- Add Anthropic Claude provider
- Configure Cheri ML custom model
- Set up multi-agent orchestration
- Enable build monitoring

## See Also

- [Provider Architecture](./provider-architecture.md)
- [Multi-Agent Setup](./multi-agent-setup.md)
- [CTO Mode Documentation](./cto-mode.md)
