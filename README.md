# CodeClarity — AI Code Review Platform

> A production-style platform where developers connect their GitHub repositories and receive AI-generated code reviews that detect bugs, security vulnerabilities, performance issues, and code quality improvements.

---

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Services](#services)
- [Getting Started](#getting-started)
- [Development Phases](#development-phases)
- [API Reference](#api-reference)
- [AI Review Logic](#ai-review-logic)
- [Queue System](#queue-system)
- [Frontend Dashboard](#frontend-dashboard)
- [Docker Setup](#docker-setup)
- [Kubernetes Deployment](#kubernetes-deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Monitoring](#monitoring)
- [Advanced Features](#advanced-features)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**CodeClarity** is a full-stack AI-powered code review platform designed to demonstrate real-world software engineering practices. It integrates GitHub OAuth, asynchronous job queues, LLM-based code analysis, and a React dashboard into a unified microservices system.

### What it does

| Feature | Description |
|---|---|
| GitHub Integration | Connect repositories via OAuth |
| AI Code Analysis | LLM-powered review for bugs, security, performance |
| Async Pipeline | Redis/BullMQ queue-based processing |
| Dashboard | Real-time review results and repository health |
| Multi-language | Supports JS, TS, Python, Java |
| PR Bot | Auto-comments on GitHub pull requests |

---

## System Architecture

```
Developer
   │
   ▼
Frontend (React Dashboard)
   │
   ▼
API Gateway
   │
   ├── Auth Service        → JWT authentication, user management
   ├── Repository Service  → GitHub OAuth, repo fetching
   ├── Review Service      → Review orchestration, result storage
   └── Worker Service
            │
            ▼
       Redis Queue (BullMQ)
            │
            ▼
      AI Code Analyzer (OpenAI / Claude)
            │
            ▼
        PostgreSQL (results, users, repos)
```

### Data Flow

```
User selects repository
      ↓
Repository files extracted via GitHub API
      ↓
Files pushed to Redis queue (reviewQueue)
      ↓
Worker pulls and processes jobs
      ↓
AI analyzes each file
      ↓
Results stored in PostgreSQL
      ↓
Dashboard displays results in real time
```

---

## Technology Stack

### Frontend
| Technology | Purpose |
|---|---|
| React | UI framework |
| Vite | Build tool |
| Tailwind CSS | Styling |
| Axios | HTTP client |

### Backend
| Technology | Purpose |
|---|---|
| Node.js | Runtime |
| Express / Fastify | HTTP framework |
| JWT | Authentication tokens |
| PostgreSQL | Primary database |

### Queue & Messaging
| Technology | Purpose |
|---|---|
| Redis | In-memory queue store |
| BullMQ | Job queue management |

### AI Integration
| Technology | Purpose |
|---|---|
| OpenAI API | GPT-based code analysis |
| Claude API | Alternative LLM |

### DevOps & Infrastructure
| Technology | Purpose |
|---|---|
| Docker | Containerization |
| Kubernetes | Orchestration |
| GitHub Actions | CI/CD pipelines |
| Prometheus | Metrics collection |
| Grafana | Metrics visualization |

---

## Project Structure

```
CodeClarity/
│
├── frontend/                        # React dashboard
│   ├── public/
│   └── src/
│       ├── components/              # Reusable UI components
│       └── pages/                   # Route-level pages
│           ├── Login.jsx
│           ├── Dashboard.jsx
│           ├── Repositories.jsx
│           ├── ReviewResults.jsx
│           └── Insights.jsx
│
├── backend/                         # Shared utilities / API gateway config
│
├── services/
│   ├── auth-service/                # User registration, login, JWT
│   │   └── src/
│   │       ├── routes/
│   │       ├── controllers/
│   │       ├── middleware/
│   │       └── models/
│   │
│   ├── repo-service/                # GitHub OAuth & repo management
│   │   └── src/
│   │       ├── routes/
│   │       ├── controllers/
│   │       └── github/
│   │
│   ├── review-service/              # Review orchestration & result API
│   │   └── src/
│   │       ├── routes/
│   │       ├── controllers/
│   │       └── queue/
│   │
│   └── worker-service/              # Background job processor
│       └── src/
│           ├── workers/
│           ├── ai/
│           └── queue/
│
├── infra/
│   ├── docker/
│   │   └── docker-compose.yml
│   └── kubernetes/
│       ├── deployment.yaml
│       ├── service.yaml
│       └── ingress.yaml
│
├── docs/
│   ├── architecture.md
│   ├── api-reference.md
│   └── deployment-guide.md
│
├── .github/
│   └── workflows/
│       └── deploy.yml
│
├── README.md
└── PROJECT_PLAN.md
```

---

## Services

### Auth Service
Handles user identity, registration, login, and token issuance.

**Endpoints:**
```
POST /auth/register     → Create new account
POST /auth/login        → Login and receive JWT
GET  /auth/profile      → Get current user profile (protected)
```

**Tech:** Node.js, Express, PostgreSQL, bcrypt, JWT

---

### Repository Service
Handles GitHub OAuth flow and repository management.

**Endpoints:**
```
GET  /repos             → List connected repositories
POST /repos/connect     → Connect GitHub account via OAuth
POST /repos/analyze     → Trigger analysis on a repository
GET  /repos/:id/commits → Fetch recent commits
GET  /repos/:id/prs     → Fetch open pull requests
```

**Tech:** Node.js, Express, GitHub REST API

---

### Review Service
Manages the review lifecycle — queuing, status tracking, and result retrieval.

**Endpoints:**
```
GET  /reviews/:repoId         → Get all reviews for a repository
GET  /reviews/:id/results     → Get detailed results of a review
GET  /reviews/:id/status      → Poll review job status
```

**Tech:** Node.js, Express, PostgreSQL, BullMQ

---

### Worker Service
Background processor that consumes jobs from the Redis queue.

**Responsibilities:**
- Pull file jobs from `reviewQueue`
- Send code to AI API with structured prompt
- Parse and score AI response
- Store results in PostgreSQL

**Tech:** Node.js, BullMQ, Redis, OpenAI/Claude API

---

## Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+
- GitHub OAuth App credentials
- OpenAI or Anthropic API key

### Environment Variables

Create `.env` files in each service directory. Example for `auth-service`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/codeclarity
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
PORT=3001
```

Example for `repo-service`:

```env
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3002/auth/github/callback
PORT=3002
```

Example for `worker-service`:

```env
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=your_openai_key
DATABASE_URL=postgresql://user:password@localhost:5432/codeclarity
PORT=3004
```

### Local Development (with Docker)

```bash
# Clone the repository
git clone https://github.com/your-username/CodeClarity.git
cd CodeClarity

# Start all services
docker-compose up

# Services will be available at:
# Frontend:        http://localhost:5173
# Auth Service:    http://localhost:3001
# Repo Service:    http://localhost:3002
# Review Service:  http://localhost:3003
# Worker Service:  http://localhost:3004
# Grafana:         http://localhost:3000
# Prometheus:      http://localhost:9090
```

### Manual Setup (without Docker)

```bash
# Install dependencies per service
cd services/auth-service && npm install
cd ../repo-service && npm install
cd ../review-service && npm install
cd ../worker-service && npm install
cd ../../frontend && npm install

# Run database migrations
cd services/auth-service && npm run migrate

# Start each service
npm run dev
```

---

## API Reference

See [docs/api-reference.md](docs/api-reference.md) for full API documentation.

### Authentication

All protected endpoints require the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

### Response Format

```json
{
  "success": true,
  "data": { },
  "message": "Operation successful"
}
```

Error response:

```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

---

## AI Review Logic

Each file submitted for analysis is sent to an LLM with a structured prompt.

### Prompt Template

```
You are a senior software engineer with expertise in code security, performance, and quality.

Analyze the following {language} code and identify:
1. Bugs — logic errors, runtime exceptions, edge cases
2. Security vulnerabilities — injections, data exposure, improper auth
3. Performance issues — inefficient loops, blocking I/O, memory leaks
4. Code quality improvements — readability, maintainability, best practices

Respond in structured JSON format:
{
  "bugs": [...],
  "security": [...],
  "performance": [...],
  "improvements": [...],
  "score": 0-100
}

Code:
{code}
```

### Scoring Algorithm

```
Base score: 100

Deductions:
  - Critical bug:          -15 points
  - Security issue:        -10 points
  - Performance warning:    -5 points
  - Code quality issue:     -2 points

Final score = max(0, base - deductions)
```

### Example AI Output

```json
{
  "bugs": [
    { "line": 42, "severity": "high", "description": "Null pointer dereference possible when user is undefined" }
  ],
  "security": [
    { "line": 18, "severity": "critical", "description": "SQL query built with string concatenation — SQL injection risk" }
  ],
  "performance": [
    { "line": 67, "severity": "medium", "description": "Nested loop with O(n²) complexity, consider using a Map" }
  ],
  "improvements": [
    { "line": 91, "severity": "low", "description": "Use async/await instead of nested Promise callbacks" }
  ],
  "score": 64
}
```

---

## Queue System

**BullMQ + Redis** powers the asynchronous analysis pipeline.

### Queue: `reviewQueue`

```
Job: analyzeFile
Payload: {
  jobId:      string,
  repoId:     string,
  filePath:   string,
  fileContent: string,
  language:   string
}
```

### Worker Lifecycle

```
1. Worker connects to Redis
2. Listens for jobs on reviewQueue
3. On job received:
   a. Extract file content
   b. Detect language
   c. Build AI prompt
   d. Call OpenAI/Claude API
   e. Parse structured response
   f. Calculate quality score
   g. Store result in PostgreSQL
   h. Mark job complete
4. On failure: retry with exponential backoff (max 3 attempts)
```

### Queue Configuration

```javascript
const reviewQueue = new Queue('reviewQueue', {
  connection: { host: 'redis', port: 6379 },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50
  }
});
```

---

## Frontend Dashboard

### Pages

| Page | Route | Description |
|---|---|---|
| Login / Signup | `/` | Auth forms |
| Dashboard | `/dashboard` | Overview metrics |
| Repositories | `/repos` | Connected repo list |
| Review Results | `/reviews/:id` | Per-file analysis |
| Insights | `/insights/:repoId` | Repository health trends |

### Dashboard Metrics

```
┌─────────────────────────────────────────────┐
│  Repository: SmartDine                      │
│                                             │
│  Code Quality Score:     81 / 100  ████░    │
│  Security Issues:        2         ⚠        │
│  Performance Warnings:   3         ⚡       │
│  Bug Detections:         1         🐛       │
│  AI Suggestions:         7         💡       │
└─────────────────────────────────────────────┘
```

---

## Docker Setup

Each service runs in its own container. All services are orchestrated via Docker Compose.

```
Services:
  ├── frontend          (port 5173)
  ├── auth-service      (port 3001)
  ├── repo-service      (port 3002)
  ├── review-service    (port 3003)
  ├── worker-service    (port 3004)
  ├── redis             (port 6379)
  ├── postgres          (port 5432)
  ├── prometheus        (port 9090)
  └── grafana           (port 3000)
```

```bash
# Start all services
docker-compose up --build

# Stop all services
docker-compose down

# View logs of a specific service
docker-compose logs -f worker-service
```

---

## Kubernetes Deployment

Manifest files are located in `infra/kubernetes/`.

```bash
# Apply all resources
kubectl apply -f infra/kubernetes/

# Check pod status
kubectl get pods -n codeclarity

# View logs
kubectl logs -f deployment/worker-service -n codeclarity
```

### Resources Created

| Resource | File |
|---|---|
| Deployments | `deployment.yaml` |
| Services | `service.yaml` |
| Ingress rules | `ingress.yaml` |
| ConfigMaps | `configmap.yaml` |
| Secrets | `secrets.yaml` |

---

## CI/CD Pipeline

GitHub Actions pipeline at `.github/workflows/deploy.yml`.

```
Code Push to main
      ↓
Run Unit Tests (all services)
      ↓
Run Integration Tests
      ↓
Build Docker Images
      ↓
Push to Docker Registry (GHCR / DockerHub)
      ↓
Deploy to Kubernetes Cluster
      ↓
Run Smoke Tests
      ↓
Notify (Slack / Email)
```

---

## Monitoring

### Prometheus Metrics Tracked

| Metric | Description |
|---|---|
| `api_request_duration_ms` | Response time per endpoint |
| `review_queue_size` | Current pending jobs |
| `worker_jobs_processed_total` | Completed jobs counter |
| `worker_jobs_failed_total` | Failed jobs counter |
| `ai_api_latency_ms` | Time spent waiting for AI response |
| `system_uptime_seconds` | Service uptime |

### Grafana Dashboards

- **API Performance** — request rates, latency percentiles
- **Queue Health** — job throughput, failure rates
- **Worker Metrics** — processing speed, AI API performance
- **System Overview** — CPU, memory, uptime across services

---

## Advanced Features

### Code Quality Score

Calculated per-repository based on aggregated file scores:

```
Repository Score = average(file scores) − penalty(critical issues)
```

### Pull Request Review Bot

Automatically posts review comments on GitHub PRs:

```
AI Review — CodeClarity Bot

Line 34: [HIGH] Potential memory leak detected.
          Suggestion: Call cleanup() in the finally block.

Line 52: [MEDIUM] Nested callbacks reduce readability.
          Suggestion: Refactor using async/await pattern.

Overall Score: 74/100
```

### Multi-Language Support

| Language | Extensions | Supported |
|---|---|---|
| JavaScript | `.js`, `.mjs` | Yes |
| TypeScript | `.ts`, `.tsx` | Yes |
| Python | `.py` | Yes |
| Java | `.java` | Yes |
| Go | `.go` | Planned |
| Rust | `.rs` | Planned |

---

## Development Timeline

### Week 1 — Foundation
- [x] Project scaffolding and folder structure
- [ ] PostgreSQL schema design
- [ ] Auth service (register, login, JWT)
- [ ] GitHub OAuth integration
- [ ] Repository fetching via GitHub API

### Week 2 — Core Pipeline
- [ ] Redis + BullMQ setup
- [ ] Worker service scaffold
- [ ] AI prompt engineering
- [ ] File analysis pipeline (end-to-end)
- [ ] Review result storage

### Week 3 — Frontend
- [ ] React + Vite setup with Tailwind
- [ ] Auth pages (login, signup)
- [ ] Dashboard with metrics
- [ ] Repository list and analysis trigger
- [ ] Review results display

### Week 4 — DevOps & Polish
- [ ] Dockerfile per service
- [ ] Docker Compose configuration
- [ ] GitHub Actions CI/CD pipeline
- [ ] Kubernetes manifests
- [ ] Prometheus + Grafana setup
- [ ] PR review bot
- [ ] Documentation

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

See [docs/architecture.md](docs/architecture.md) for system design details.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

*Built to demonstrate production-grade software engineering: microservices, distributed processing, AI integration, and DevOps workflows.*
