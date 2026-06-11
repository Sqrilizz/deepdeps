use std::sync::{Arc, Mutex};
use axum::{
    extract::State,
    routing::{get, post},
    Json, Router,
};
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;
use crate::analyzer;
use crate::db::Database;
use crate::models::*;

type DbState = Arc<Mutex<Database>>;

pub async fn start(port: u16, ui_dir: String, _path: Option<String>) -> anyhow::Result<()> {
    let db_path = Database::default_db_path();
    let db = Database::new(&db_path)?;
    let state: DbState = Arc::new(Mutex::new(db));

    let api_routes = Router::new()
        .route("/api/analysis", get(get_latest_analysis))
        .route("/api/analysis/all", get(get_all_analyses))
        .route("/api/analyze", post(run_analyze))
        .route("/api/health", get(health_check))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let app = Router::new()
        .nest("/api", api_routes)
        .nest_service("/", ServeDir::new(&ui_dir).append_index_html_on_directories(true));

    let addr = format!("0.0.0.0:{}", port);
    println!("DeepDeps UI running at http://localhost:{}", port);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check() -> Json<serde_json::Value> {
    Json(serde_json::json!({ "status": "ok", "version": "0.1.0" }))
}

async fn get_latest_analysis(State(state): State<DbState>) -> Json<serde_json::Value> {
    match state.lock() {
        Ok(db) => match db.get_latest_analysis() {
            Ok(Some(analysis)) => Json(serde_json::to_value(&analysis).unwrap_or_default()),
            Ok(None) => Json(serde_json::json!({ "error": "No analysis found" })),
            Err(e) => Json(serde_json::json!({ "error": e.to_string() })),
        },
        Err(_) => Json(serde_json::json!({ "error": "Database lock failed" })),
    }
}

async fn get_all_analyses(State(state): State<DbState>) -> Json<serde_json::Value> {
    match state.lock() {
        Ok(db) => match db.get_all_analyses() {
            Ok(analyses) => Json(serde_json::to_value(&analyses).unwrap_or_default()),
            Err(e) => Json(serde_json::json!({ "error": e.to_string() })),
        },
        Err(_) => Json(serde_json::json!({ "error": "Database lock failed" })),
    }
}

async fn run_analyze(
    State(state): State<DbState>,
    Json(req): Json<AnalyzeRequest>,
) -> Json<serde_json::Value> {
    let path = req.path.unwrap_or_else(|| ".".to_string());
    match analyzer::run_analysis(&path).await {
        Ok(result) => {
            if let Ok(db) = state.lock() {
                let _ = db.save_analysis(&result);
            }
            Json(serde_json::to_value(&result).unwrap_or_default())
        }
        Err(e) => Json(serde_json::json!({ "error": e.to_string() })),
    }
}
