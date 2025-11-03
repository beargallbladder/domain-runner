/*!
Competitive Ranking System
"Visual Brand Warfare" - LLM PageRank for brand positioning
*/

use anyhow::Result;
use serde::Serialize;
use sqlx::Row;

use crate::database::Database;

#[derive(Debug, Serialize)]
pub struct BrandScore {
    pub domain: String,
    pub rank: i64,
    pub score: f32,
    pub citation_count: i64,
    pub avg_drift: f32,
    pub stability_score: f32,
}

pub async fn compute_rankings(
    db: &Database,
    cohort: Option<&str>,
    limit: i64,
) -> Result<Vec<BrandScore>> {
    // Get all completed domains
    let query = if cohort.is_some() {
        // TODO: Add cohort support
        "SELECT domain FROM domains WHERE status = 'completed' LIMIT $1"
    } else {
        "SELECT domain FROM domains WHERE status = 'completed' LIMIT $1"
    };

    let domains = sqlx::query(query)
        .bind(limit)
        .fetch_all(db.pool())
        .await?;

    let mut scores = Vec::new();

    for row in domains {
        let domain: String = row.get("domain");

        let citation_count = count_citations(db, &domain).await?;
        let avg_drift = get_avg_drift(db, &domain).await?;

        // LLM PageRank formula
        let score = (citation_count as f32) * 0.7 + (1.0 - avg_drift) * 100.0 * 0.3;
        let stability_score = (1.0 - avg_drift) * 100.0;

        scores.push(BrandScore {
            domain,
            rank: 0, // Assigned after sorting
            score,
            citation_count,
            avg_drift,
            stability_score,
        });
    }

    // Sort by score (descending)
    scores.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());

    // Assign ranks
    for (i, score) in scores.iter_mut().enumerate() {
        score.rank = (i + 1) as i64;
    }

    Ok(scores)
}

async fn count_citations(db: &Database, domain: &str) -> Result<i64> {
    let result = sqlx::query!(
        r#"
        SELECT COUNT(*) as count
        FROM domain_responses dr
        JOIN domains d ON dr.domain_id = d.id
        WHERE d.domain = $1 AND dr.normalized_status = 'valid'
        "#,
        domain
    )
    .fetch_one(db.pool())
    .await?;

    Ok(result.count.unwrap_or(0))
}

async fn get_avg_drift(db: &Database, domain: &str) -> Result<f32> {
    let result = sqlx::query!(
        "SELECT AVG(drift_score) as avg FROM drift_scores WHERE domain = $1",
        domain
    )
    .fetch_one(db.pool())
    .await?;

    Ok(result.avg.unwrap_or(0.0) as f32)
}
