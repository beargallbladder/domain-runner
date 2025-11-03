/*!
Response Normalizer
Standardizes LLM outputs for cross-model comparison
*/

pub struct NormalizedResponse {
    pub answer: String,
    pub status: String,
}

pub fn normalize_response(raw_response: &str, _model: &str) -> NormalizedResponse {
    let text = extract_content(raw_response);
    let text = clean_text(&text);
    let status = classify_status(&text);

    NormalizedResponse {
        answer: text,
        status,
    }
}

fn extract_content(raw: &str) -> String {
    let text = raw.trim();

    // Try parsing as JSON
    if let Ok(json) = serde_json::from_str::<serde_json::Value>(text) {
        // Try common field names
        for field in &["content", "answer", "text", "response", "message"] {
            if let Some(value) = json.get(field) {
                if let Some(s) = value.as_str() {
                    return s.to_string();
                }
            }
        }
    }

    // Remove markdown code blocks
    let text = text.replace("```", "");

    text
}

fn clean_text(text: &str) -> String {
    // Normalize line endings
    let text = text.replace("\r\n", "\n").replace('\r', "\n");

    // Remove excessive whitespace
    let lines: Vec<&str> = text.lines().collect();
    let cleaned_lines: Vec<String> = lines
        .iter()
        .map(|line| line.split_whitespace().collect::<Vec<_>>().join(" "))
        .collect();

    cleaned_lines.join("\n").trim().to_string()
}

fn classify_status(text: &str) -> String {
    if text.is_empty() || text.len() < 10 {
        return "empty".to_string();
    }

    let text_lower = text.to_lowercase();
    let malformed_indicators = [
        "error",
        "exception",
        "failed",
        "invalid",
        "unavailable",
        "timeout",
    ];

    if malformed_indicators.iter().any(|&indicator| text_lower.contains(indicator)) {
        if text.len() < 100 {
            return "malformed".to_string();
        }
    }

    "valid".to_string()
}
