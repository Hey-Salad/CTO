//! Google Gemini provider for Sheri ML / Codex CLI.
//!
//! This module provides integration with Google's Gemini API,
//! supporting Gemini 3.0, Gemini 3.1, and future models.

mod client;

pub use client::GeminiClient;
use codex_core::config::Config;

/// Default model — gemini-3-flash-preview via AI Studio (supports thinking tokens)
pub const DEFAULT_GEMINI_MODEL: &str = "gemini-3-flash-preview";

/// AI Studio base URL (generativelanguage.googleapis.com)
pub const GEMINI_AI_STUDIO_URL: &str = "https://generativelanguage.googleapis.com/v1";

/// Available Gemini models
pub const GEMINI_2_5_FLASH: &str = "gemini-2.5-flash";
pub const GEMINI_2_5_FLASH_LITE: &str = "gemini-2.5-flash-lite";
pub const GEMINI_3_FLASH_PREVIEW: &str = "gemini-3-flash-preview";
pub const GEMINI_3_0_FLASH: &str = "gemini-3.0-flash";
pub const GEMINI_3_0_PRO: &str = "gemini-3.0-pro";
pub const GEMINI_3_1_FLASH: &str = "gemini-3.1-flash";
pub const GEMINI_3_1_PRO: &str = "gemini-3.1-pro";

/// Prepare the Gemini environment when selected.
///
/// - Verifies API key is configured
/// - Validates connectivity to Gemini API
/// - Checks model availability
pub async fn ensure_gemini_ready(config: &Config) -> std::io::Result<()> {
    let model = match config.model.as_ref() {
        Some(model) => model,
        None => DEFAULT_GEMINI_MODEL,
    };

    // Verify Gemini API key is present (check all known env var names)
    let api_key = std::env::var("GOOGLE_AI_STUDIO_KEY")
        .or_else(|_| std::env::var("GEMINI_API_KEY"))
        .or_else(|_| std::env::var("GOOGLE_API_KEY"))
        .map_err(|_| {
            std::io::Error::new(
                std::io::ErrorKind::NotFound,
                "Gemini API key not found. Please set GOOGLE_AI_STUDIO_KEY environment variable.\n\
                 Get your API key at: https://aistudio.google.com/apikey"
            )
        })?;

    if api_key.trim().is_empty() {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            "Gemini API key is empty"
        ));
    }

    // Create client and verify connectivity
    let client = GeminiClient::new(&api_key).map_err(|e| {
        std::io::Error::new(std::io::ErrorKind::Other, e.to_string())
    })?;

    // Test connectivity by listing available models
    match client.list_models().await.map_err(|e| {
        std::io::Error::new(std::io::ErrorKind::Other, e.to_string())
    }) {
        Ok(models) => {
            tracing::info!("Gemini API connection successful. Available models: {:?}", models);

            // Verify requested model is available
            if !models.iter().any(|m| m.contains(model)) {
                tracing::warn!(
                    "Requested model '{}' not found in available models. This may cause issues.",
                    model
                );
            }
        }
        Err(err) => {
            tracing::warn!("Failed to list Gemini models: {}. Proceeding anyway.", err);
        }
    }

    Ok(())
}

/// Check if a given model name is a valid Gemini model
pub fn is_gemini_model(model: &str) -> bool {
    model.starts_with("gemini-") ||
    matches!(model,
        GEMINI_3_0_FLASH | GEMINI_3_0_PRO |
        GEMINI_3_1_FLASH | GEMINI_3_1_PRO
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_gemini_model() {
        assert!(is_gemini_model("gemini-3.1-flash"));
        assert!(is_gemini_model("gemini-3.0-pro"));
        assert!(is_gemini_model("gemini-4.0-ultra"));
        assert!(!is_gemini_model("gpt-4"));
        assert!(!is_gemini_model("claude-3"));
    }

    #[test]
    fn test_default_model() {
        assert_eq!(DEFAULT_GEMINI_MODEL, "gemini-3-flash-preview");
    }
}
