//! Gemini API client implementation.

use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use thiserror::Error;

/// AI Studio endpoint (used for gemini-3-flash-preview and gemini-2.5-flash)
const GEMINI_API_BASE_URL: &str = "https://generativelanguage.googleapis.com/v1";

/// Vertex AI endpoint (used for gemini-2.5-flash-lite)
const VERTEX_AI_BASE_URL: &str = "https://aiplatform.googleapis.com/v1/publishers/google/models";
const DEFAULT_TIMEOUT_SECS: u64 = 300;

#[derive(Error, Debug)]
pub enum GeminiError {
    #[error("HTTP request failed: {0}")]
    Http(#[from] reqwest::Error),

    #[error("JSON serialization error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("API error: {0}")]
    Api(String),

    #[error("Invalid API key")]
    InvalidApiKey,

    #[error("Model not found: {0}")]
    ModelNotFound(String),
}

/// Response from Gemini's model list endpoint
#[derive(Debug, Deserialize, Serialize)]
pub struct ModelListResponse {
    pub models: Vec<ModelInfo>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelInfo {
    pub name: String,
    pub display_name: Option<String>,
    pub description: Option<String>,
    pub supported_generation_methods: Option<Vec<String>>,
}

/// Gemini API client
#[derive(Clone)]
pub struct GeminiClient {
    client: Client,
    api_key: String,
    base_url: String,
}

impl GeminiClient {
    /// Create a new Gemini client with the provided API key
    pub fn new(api_key: &str) -> Result<Self, GeminiError> {
        if api_key.trim().is_empty() {
            return Err(GeminiError::InvalidApiKey);
        }

        let client = Client::builder()
            .timeout(Duration::from_secs(DEFAULT_TIMEOUT_SECS))
            .build()?;

        Ok(Self {
            client,
            api_key: api_key.to_string(),
            base_url: GEMINI_API_BASE_URL.to_string(),
        })
    }

    /// Create a Gemini client with custom base URL (useful for testing)
    pub fn with_base_url(api_key: &str, base_url: &str) -> Result<Self, GeminiError> {
        let mut client = Self::new(api_key)?;
        client.base_url = base_url.trim_end_matches('/').to_string();
        Ok(client)
    }

    /// List all available Gemini models
    pub async fn list_models(&self) -> Result<Vec<String>, GeminiError> {
        let url = format!("{}/models?key={}", self.base_url, self.api_key);

        let response: ModelListResponse = self
            .client
            .get(&url)
            .send()
            .await?
            .error_for_status()
            .map_err(|e| {
                if e.status() == Some(reqwest::StatusCode::UNAUTHORIZED) {
                    GeminiError::InvalidApiKey
                } else {
                    GeminiError::Http(e)
                }
            })?
            .json()
            .await?;

        Ok(response
            .models
            .into_iter()
            .map(|m| {
                // Extract model name from full resource name
                // e.g., "models/gemini-3.1-flash" -> "gemini-3.1-flash"
                m.name
                    .strip_prefix("models/")
                    .unwrap_or(&m.name)
                    .to_string()
            })
            .collect())
    }

    /// Get information about a specific model
    pub async fn get_model(&self, model_name: &str) -> Result<ModelInfo, GeminiError> {
        let model_resource = if model_name.starts_with("models/") {
            model_name.to_string()
        } else {
            format!("models/{}", model_name)
        };

        let url = format!(
            "{}/{}?key={}",
            self.base_url, model_resource, self.api_key
        );

        self.client
            .get(&url)
            .send()
            .await?
            .error_for_status()
            .map_err(|e| {
                if e.status() == Some(reqwest::StatusCode::NOT_FOUND) {
                    GeminiError::ModelNotFound(model_name.to_string())
                } else if e.status() == Some(reqwest::StatusCode::UNAUTHORIZED) {
                    GeminiError::InvalidApiKey
                } else {
                    GeminiError::Http(e)
                }
            })?
            .json()
            .await
            .map_err(Into::into)
    }

    /// Check if using Vertex AI endpoint
    pub fn is_vertex_ai(&self) -> bool {
        self.base_url.contains("aiplatform.googleapis.com")
    }

    /// Generate content using Vertex AI endpoint
    pub async fn generate_vertex(
        &self,
        model: &str,
        prompt: &str,
    ) -> Result<String, GeminiError> {
        let url = format!(
            "{}/{}:streamGenerateContent?key={}",
            self.base_url, model, self.api_key
        );

        #[derive(Serialize)]
        struct GenerateRequest {
            contents: Vec<Content>,
        }

        #[derive(Serialize)]
        struct Content {
            role: String,
            parts: Vec<Part>,
        }

        #[derive(Serialize)]
        struct Part {
            text: String,
        }

        let request_body = GenerateRequest {
            contents: vec![Content {
                role: "user".to_string(),
                parts: vec![Part {
                    text: prompt.to_string(),
                }],
            }],
        };

        let response = self
            .client
            .post(&url)
            .json(&request_body)
            .send()
            .await?
            .error_for_status()
            .map_err(|e| {
                if e.status() == Some(reqwest::StatusCode::NOT_FOUND) {
                    GeminiError::ModelNotFound(model.to_string())
                } else {
                    GeminiError::Http(e)
                }
            })?;

        let response_text = response.text().await?;
        Ok(response_text)
    }

    /// Generate content using a Gemini model (simplified for now)
    pub async fn generate(
        &self,
        model: &str,
        prompt: &str,
    ) -> Result<String, GeminiError> {
        // Use Vertex AI endpoint if configured
        if self.is_vertex_ai() {
            return self.generate_vertex(model, prompt).await;
        }
        let model_resource = if model.starts_with("models/") {
            model.to_string()
        } else {
            format!("models/{}", model)
        };

        let url = format!(
            "{}/{}:generateContent?key={}",
            self.base_url, model_resource, self.api_key
        );

        #[derive(Serialize)]
        struct GenerateRequest {
            contents: Vec<Content>,
        }

        #[derive(Serialize)]
        struct Content {
            parts: Vec<Part>,
        }

        #[derive(Serialize)]
        struct Part {
            text: String,
        }

        let request_body = GenerateRequest {
            contents: vec![Content {
                parts: vec![Part {
                    text: prompt.to_string(),
                }],
            }],
        };

        let response = self
            .client
            .post(&url)
            .json(&request_body)
            .send()
            .await?
            .error_for_status()
            .map_err(|e| {
                if e.status() == Some(reqwest::StatusCode::NOT_FOUND) {
                    GeminiError::ModelNotFound(model.to_string())
                } else {
                    GeminiError::Http(e)
                }
            })?;

        // Parse response (simplified)
        let response_text = response.text().await?;
        Ok(response_text)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_client() {
        let client = GeminiClient::new("test-key");
        assert!(client.is_ok());
    }

    #[test]
    fn test_empty_api_key() {
        let client = GeminiClient::new("");
        assert!(matches!(client, Err(GeminiError::InvalidApiKey)));
    }

    #[test]
    fn test_custom_base_url() {
        let client = GeminiClient::with_base_url("test-key", "https://custom.api.com/");
        assert!(client.is_ok());
        assert_eq!(client.unwrap().base_url, "https://custom.api.com");
    }
}
