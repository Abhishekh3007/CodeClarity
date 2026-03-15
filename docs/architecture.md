# Architecture Overview — CodeClarity

## System Components

### 1. Frontend (React + Vite)
Single-page application served via Nginx in production. Communicates with backend services through an API Gateway or directly via service URLs.

### 2. Auth Service (Node.js + Express)
Stateless JWT-based authentication. Issues short-lived access tokens (7d) signed with a shared secret. All other services validate tokens using the same secret.

### 3. Repository Service (Node.js + Express)
Interfaces with GitHub REST API. Manages OAuth token exchange, repository fetching, and hands off analysis triggers to the Review Service.

### 4. Review Service (Node.js + Express)
Orchestrates the review lifecycle. On analysis trigger: fetches repo file tree, enqueues file jobs to Redis, and tracks overall review status.

### 5. Worker Service (Node.js + BullMQ)
Stateless background processor. Pulls jobs from Redis, calls AI API, stores results. Designed to scale horizontally — run multiple replicas to increase throughput.

### 6. Redis (BullMQ Queue Store)
Durable job queue. Jobs survive service restarts via AOF persistence.

### 7. PostgreSQL
Single relational database shared across services. Each service owns its tables. Migrations managed per-service.

---

## Communication Patterns

| Pattern | Used For |
|---|---|
| REST (HTTP) | All synchronous client-facing operations |
| BullMQ jobs | Async file analysis pipeline |
| Direct DB access | Each service queries only its own tables |

---

## Security Design

- All inter-service communication on private Docker network
- JWT validated on every protected request
- GitHub tokens encrypted before storage
- AI API keys in environment variables only — never in code
- Rate limiting on auth endpoints
- Input sanitization before SQL queries (parameterized queries only)

---

## Scalability Notes

- Worker service is the primary scaling target (AI calls are slow)
- Kubernetes HPA scales worker replicas 2–10 based on queue depth
- PostgreSQL connection pooling via PgBouncer (production)
- Redis cluster mode for high availability (production)
