use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use std::fmt;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Configuration error: {0}")]
    Config(String),

    #[error("LLM provider error: {0}")]
    LLMProvider(String),

    #[error("HTTP client error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Service not ready: {0}")]
    NotReady(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl IntoResponse for Error {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            Error::NotFound(msg) => (StatusCode::NOT_FOUND, msg),
            Error::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg),
            Error::NotReady(msg) => (StatusCode::SERVICE_UNAVAILABLE, msg),
            Error::Database(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
            Error::Config(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
            Error::LLMProvider(msg) => (StatusCode::BAD_GATEWAY, msg),
            _ => (StatusCode::INTERNAL_SERVER_ERROR, self.to_string()),
        };

        let body = Json(json!({
            "error": error_message,
            "status": status.as_u16(),
        }));

        (status, body).into_response()
    }
}