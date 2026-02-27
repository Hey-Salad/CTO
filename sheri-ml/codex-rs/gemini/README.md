# Gemini Provider for Sheri ML / Codex

This module provides integration with Google's Gemini API, enabling Sheri ML to use Gemini 3.0, Gemini 3.1, and future models.

## Setup

### 1. Get an API Key

Get your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey).

### 2. Set Environment Variable

```bash
export GEMINI_API_KEY=your_api_key_here
```

Alternatively, you can use `GOOGLE_API_KEY`:

```bash
export GOOGLE_API_KEY=your_api_key_here
```

### 3. Configure Sheri ML

Add Gemini to your `~/.codex/config.toml` or use the built-in provider:

```bash
# Use Gemini with default model (gemini-3.1-flash)
sheri-ml -c model_provider="gemini"

# Use a specific Gemini model
sheri-ml -c model_provider="gemini" -m gemini-3.1-pro

# Use Gemini 3.0
sheri-ml -c model_provider="gemini" -m gemini-3.0-pro
```

## Available Models

- `gemini-3.0-flash` - Fast and cost-effective
- `gemini-3.0-pro` - Advanced reasoning
- `gemini-3.1-flash` - Latest fast model (default)
- `gemini-3.1-pro` - Latest pro model

## Configuration Example

To customize Gemini settings, add to `~/.codex/config.toml`:

```toml
model_provider = "gemini"
model = "gemini-3.1-flash"

[model_providers.gemini]
name = "Google Gemini"
base_url = "https://generativelanguage.googleapis.com/v1"
env_key = "GEMINI_API_KEY"
env_key_instructions = """
Get your Gemini API key at: https://makersuite.google.com/app/apikey
Set it with: export GEMINI_API_KEY=your_key_here
"""
wire_api = "responses"
```

## Custom Gemini Provider

You can also create a custom Gemini provider with different settings:

```toml
[model_providers.my_gemini]
name = "My Custom Gemini"
base_url = "https://my-proxy.com/gemini/v1"
env_key = "MY_GEMINI_KEY"
wire_api = "responses"
request_max_retries = 5
stream_max_retries = 3
```

Then use it with:

```bash
sheri-ml -c model_provider="my_gemini"
```

## Features

- ✅ Multiple Gemini models (3.0 and 3.1)
- ✅ Automatic model discovery
- ✅ API key validation
- ✅ Error handling and retries
- ✅ Custom base URL support (for proxies)
- ⏳ Streaming responses (coming soon)
- ⏳ Function calling (coming soon)
- ⏳ Vision capabilities (coming soon)

## Troubleshooting

### "Gemini API key not found"

Make sure you've set the `GEMINI_API_KEY` or `GOOGLE_API_KEY` environment variable:

```bash
echo $GEMINI_API_KEY
```

### "Invalid API key"

Verify your API key is correct and has the necessary permissions.

### "Model not found"

Check that the model name is correct. List available models with:

```bash
curl "https://generativelanguage.googleapis.com/v1/models?key=YOUR_API_KEY"
```

## Development

### Building

```bash
cd codex-rs
cargo build -p codex-gemini
```

### Testing

```bash
cargo test -p codex-gemini
```

### Integration Testing

To test with the Gemini API:

```bash
export GEMINI_API_KEY=your_key
cargo test -p codex-gemini --features integration-tests
```

## Architecture

The Gemini provider follows the same pattern as other providers:

1. **Client** (`client.rs`) - HTTP client for Gemini API
2. **Provider Setup** (`lib.rs`) - Initialization and validation
3. **Configuration** - Integrated with `ModelProviderInfo`

## See Also

- [Gemini API Documentation](https://ai.google.dev/docs)
- [Google AI Studio](https://makersuite.google.com/)
- [Sheri ML Documentation](../../docs/)
