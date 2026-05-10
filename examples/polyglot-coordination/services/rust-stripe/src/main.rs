use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    net::SocketAddr,
    sync::Arc,
};
use tokio::sync::RwLock;

#[derive(Clone, Serialize)]
struct Customer {
    id: String,
    email: String,
    name: String,
    created: i64,
}

#[derive(Clone, Serialize)]
struct Subscription {
    id: String,
    customer: String,
    plan: String,
    status: String,
    created: i64,
}

#[derive(Clone, Serialize)]
struct Charge {
    id: String,
    customer: String,
    amount: i64,
    currency: String,
    status: String,
}

#[derive(Deserialize)]
struct CreateCustomerRequest {
    email: String,
    name: String,
}

#[derive(Deserialize)]
struct CreateSubscriptionRequest {
    customer: String,
    plan: String,
}

#[derive(Deserialize)]
struct CreateChargeRequest {
    customer: String,
    amount: i64,
    #[serde(default = "default_currency")]
    currency: String,
}

fn default_currency() -> String {
    "usd".to_string()
}

type AppState = Arc<RwLock<Store>>;

#[derive(Default)]
struct Store {
    customers: HashMap<String, Customer>,
    subscriptions: HashMap<String, Subscription>,
    charges: HashMap<String, Charge>,
}

async fn create_customer(
    State(state): State<AppState>,
    Json(req): Json<CreateCustomerRequest>,
) -> (StatusCode, Json<Customer>) {
    let customer = Customer {
        id: format!("cus_{}", uuid::Uuid::new_v4().simple()),
        email: req.email,
        name: req.name,
        created: chrono::Utc::now().timestamp(),
    };

    let mut store = state.write().await;
    store.customers.insert(customer.id.clone(), customer.clone());

    (StatusCode::CREATED, Json(customer))
}

async fn get_customer(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Customer>, StatusCode> {
    let store = state.read().await;
    store
        .customers
        .get(&id)
        .cloned()
        .map(Json)
        .ok_or(StatusCode::NOT_FOUND)
}

async fn create_subscription(
    State(state): State<AppState>,
    Json(req): Json<CreateSubscriptionRequest>,
) -> Result<(StatusCode, Json<Subscription>), StatusCode> {
    let mut store = state.write().await;
    if !store.customers.contains_key(&req.customer) {
        return Err(StatusCode::NOT_FOUND);
    }

    let subscription = Subscription {
        id: format!("sub_{}", uuid::Uuid::new_v4().simple()),
        customer: req.customer,
        plan: req.plan,
        status: "active".to_string(),
        created: chrono::Utc::now().timestamp(),
    };

    store.subscriptions.insert(subscription.id.clone(), subscription.clone());

    Ok((StatusCode::CREATED, Json(subscription)))
}

async fn create_charge(
    State(state): State<AppState>,
    Json(req): Json<CreateChargeRequest>,
) -> Result<(StatusCode, Json<Charge>), StatusCode> {
    let mut store = state.write().await;
    if !store.customers.contains_key(&req.customer) {
        return Err(StatusCode::NOT_FOUND);
    }

    let charge = Charge {
        id: format!("ch_{}", uuid::Uuid::new_v4().simple()),
        customer: req.customer,
        amount: req.amount,
        currency: req.currency,
        status: "succeeded".to_string(),
    };

    store.charges.insert(charge.id.clone(), charge.clone());

    Ok((StatusCode::CREATED, Json(charge)))
}

async fn health() -> &'static str {
    "OK"
}

#[tokio::main]
async fn main() {
    let state: AppState = Arc::new(RwLock::new(Store::default()));

    let app = Router::new()
        .route("/health", get(health))
        .route("/v1/customers", post(create_customer))
        .route("/v1/customers/:id", get(get_customer))
        .route("/v1/subscriptions", post(create_subscription))
        .route("/v1/charges", post(create_charge))
        .with_state(state);

    let addr = SocketAddr::from(([127, 0, 0, 1], 4040));
    println!("[Rust Stripe] Fake Stripe API on http://{}", addr);
    println!("  POST /v1/customers - Create customer");
    println!("  GET  /v1/customers/:id - Get customer");
    println!("  POST /v1/subscriptions - Create subscription");
    println!("  POST /v1/charges - Create charge");

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("Failed to bind to port 4040 - is it already in use?");

    if let Err(e) = axum::serve(listener, app).await {
        eprintln!("Server error: {}", e);
        std::process::exit(1);
    }
}
