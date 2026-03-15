# CodeClarity — Project Execution Plan

> Detailed week-by-week engineering plan for building the AI Code Review Platform.

---

## Project Summary

| Property | Value |
|---|---|
| Project Name | CodeClarity |
| Type | Full-stack microservices platform |
| Timeline | 4 weeks |
| Team Size | Solo / Small team |
| Start Date | Week 1 |

---

## Architecture Decision Record (ADR)

### Why Microservices?
Each service (auth, repo, review, worker) has a distinct responsibility and scaling profile. The worker service is CPU/IO-bound (AI calls), while the auth service is lightweight. Separating them allows independent scaling.

### Why BullMQ + Redis?
Code analysis jobs are slow (multiple seconds per file due to AI API latency). Synchronous processing would time out. A durable queue ensures jobs survive crashes and can be retried.

### Why PostgreSQL?
Structured relational data with complex queries (join users → repos → reviews → file results). JSONB columns allow flexible AI result storage without schema rigidity.

### Why OpenAI / Claude?
State-of-the-art understanding of code across all major languages. Structured JSON output mode allows reliable parsing of results.

---

## Phase 1 — Authentication Service (Week 1, Days 1–2)

### Goal
Users can register, log in, and receive a JWT for authenticated access to all other services.

### Database Schema

```sql
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,           -- bcrypt hashed
  name        VARCHAR(255),
  github_id   VARCHAR(100),
  github_token TEXT,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);
```

### API Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Create account |
| POST | `/auth/login` | No | Login, receive JWT |
| GET | `/auth/profile` | Yes | Get user info |

### Request / Response Contracts

**POST /auth/register**
```json
// Request
{
  "email": "dev@example.com",
  "password": "SecurePass123!",
  "name": "Jane Dev"
}

// Response 201
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "dev@example.com",
    "token": "eyJhbGc..."
  }
}
```

**POST /auth/login**
```json
// Request
{
  "email": "dev@example.com",
  "password": "SecurePass123!"
}

// Response 200
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "user": { "id": "uuid", "email": "dev@example.com", "name": "Jane Dev" }
  }
}
```

### Security Considerations
- Passwords hashed with bcrypt (salt rounds: 12)
- JWT signed with RS256 or HS256 (secret min 32 chars)
- Rate limiting on `/auth/login` (max 10 req/min per IP)
- Input validation on all fields (email format, password length)

### Acceptance Criteria
- [ ] User can register with email + password
- [ ] Duplicate email returns 409 Conflict
- [ ] Login returns valid JWT
- [ ] Invalid credentials return 401
- [ ] Protected routes reject requests without valid token
- [ ] Token expiry enforced (7 days default)

---

## Phase 2 — GitHub Integration (Week 1, Days 3–5)

### Goal
Users connect their GitHub accounts and can list, select, and trigger analysis on their repositories.

### Database Schema

```sql
CREATE TABLE repositories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  github_repo_id  INTEGER NOT NULL,
  name            VARCHAR(255) NOT NULL,
  full_name       VARCHAR(255) NOT NULL,    -- e.g. "user/repo"
  private         BOOLEAN DEFAULT false,
  language        VARCHAR(100),
  description     TEXT,
  url             VARCHAR(500),
  last_analyzed   TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);
```

### OAuth Flow

```
1. User clicks "Connect GitHub"
2. Frontend redirects to:
   https://github.com/login/oauth/authorize?client_id=CLIENT_ID&scope=repo

3. GitHub redirects to callback URL with `code`
4. repo-service exchanges code for access token
5. Access token stored in users table (encrypted)
6. User's repos fetched from GitHub API and stored
```

### API Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/auth/github` | No | Start OAuth |
| GET | `/auth/github/callback` | No | OAuth callback |
| GET | `/repos` | Yes | List user's repositories |
| POST | `/repos/:id/analyze` | Yes | Queue analysis job |
| GET | `/repos/:id/commits` | Yes | Recent commits |
| GET | `/repos/:id/prs` | Yes | Open pull requests |

### Acceptance Criteria
- [ ] GitHub OAuth flow completes successfully
- [ ] Access token stored securely (encrypted at rest)
- [ ] Repository list fetched and persisted
- [ ] Private repositories accessible with valid token
- [ ] Analysis job created on POST to `/repos/:id/analyze`

---

## Phase 3 — Code Analysis Pipeline (Week 2, Days 1–3)

### Goal
When a user triggers analysis, all repository files are extracted, queued, processed by AI, and results stored.

### Database Schema

```sql
CREATE TABLE reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id     UUID REFERENCES repositories(id) ON DELETE CASCADE,
  status      VARCHAR(50) DEFAULT 'pending',   -- pending, processing, completed, failed
  score       INTEGER,                          -- 0–100 aggregate score
  total_files INTEGER DEFAULT 0,
  created_at  TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE TABLE file_reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id   UUID REFERENCES reviews(id) ON DELETE CASCADE,
  file_path   VARCHAR(500) NOT NULL,
  language    VARCHAR(100),
  score       INTEGER,
  bugs        JSONB DEFAULT '[]',
  security    JSONB DEFAULT '[]',
  performance JSONB DEFAULT '[]',
  improvements JSONB DEFAULT '[]',
  raw_response TEXT,
  processed_at TIMESTAMP DEFAULT NOW()
);
```

### Job Payload

```typescript
interface AnalyzeFileJob {
  jobId: string;
  reviewId: string;
  repoId: string;
  filePath: string;
  fileContent: string;
  language: 'javascript' | 'typescript' | 'python' | 'java' | string;
  userId: string;
}
```

### Worker Processing Steps

```
1. Receive job from reviewQueue
2. Detect file language (from extension)
3. Truncate file to 4000 tokens (AI context window management)
4. Build prompt with language-specific instructions
5. Call OpenAI chat completions with JSON mode
6. Parse response JSON
7. Calculate file-level score
8. INSERT into file_reviews table
9. UPDATE review aggregate score
10. Mark job complete
11. If last file in review → update review.status = 'completed'
```

### Scoring Formula

```javascript
function calculateScore(results) {
  let score = 100;
  score -= results.bugs.filter(b => b.severity === 'critical').length * 15;
  score -= results.bugs.filter(b => b.severity === 'high').length * 8;
  score -= results.security.length * 10;
  score -= results.performance.length * 5;
  score -= results.improvements.length * 2;
  return Math.max(0, score);
}
```

### Acceptance Criteria
- [ ] Triggering analysis creates a review record
- [ ] All eligible files pushed to queue
- [ ] Worker processes jobs and stores results
- [ ] Failed jobs retried up to 3 times
- [ ] Review status updated to `completed` when all files processed
- [ ] Aggregate score calculated correctly

---

## Phase 4 — React Frontend (Week 3)

### Goal
Developers can log in, view their repositories, trigger analysis, and see AI review results.

### Component Tree

```
App
 ├── AuthProvider
 ├── Routes
 │    ├── / (Login)
 │    ├── /signup (Signup)
 │    ├── /dashboard (Dashboard)
 │    │    ├── MetricCard
 │    │    ├── RecentReviews
 │    │    └── QuickActions
 │    ├── /repos (RepositoryList)
 │    │    ├── RepoCard
 │    │    └── ConnectGitHub
 │    ├── /reviews/:id (ReviewResults)
 │    │    ├── ScoreGauge
 │    │    ├── IssueList
 │    │    └── FileAccordion
 │    └── /insights/:repoId (Insights)
 │         ├── TrendChart
 │         └── LanguageBreakdown
 └── Layout
      ├── Navbar
      └── Sidebar
```

### State Management
- React Context for auth state (user, token)
- React Query (TanStack Query) for server state (repos, reviews)
- Local state for UI interactions

### Key User Flows

**Flow 1 — First-time user**
```
Visit / → Signup → Connect GitHub → Select Repo → Trigger Analysis → View Results
```

**Flow 2 — Returning user**
```
Visit / → Login → Dashboard → View existing reviews → Drill into file results
```

### Acceptance Criteria
- [ ] Login and signup forms with validation
- [ ] GitHub OAuth button connects account
- [ ] Repository list shows connected repos
- [ ] Analyze button triggers job and shows loading state
- [ ] Results page shows file list with issues per file
- [ ] Score displayed as visual gauge (0–100)
- [ ] Issues filterable by severity (critical, high, medium, low)

---

## Phase 5 — DevOps Setup (Week 4)

### Dockerfile Template (per service)

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3001
CMD ["node", "src/index.js"]
```

### Docker Compose Overview

```yaml
services:
  postgres:     postgres:15-alpine
  redis:        redis:7-alpine
  auth-service: ./services/auth-service
  repo-service: ./services/repo-service
  review-service: ./services/review-service
  worker-service: ./services/worker-service
  frontend:     ./frontend
  prometheus:   prom/prometheus
  grafana:      grafana/grafana
```

### GitHub Actions Pipeline Stages

| Stage | Trigger | Action |
|---|---|---|
| Test | Push to any branch | `npm test` all services |
| Lint | Push to any branch | ESLint + Prettier check |
| Build | Push to `main` | Build Docker images |
| Push | Push to `main` | Push images to GHCR |
| Deploy | Push to `main` | `kubectl apply` to cluster |
| Smoke Test | Post-deploy | Health check all endpoints |

### Kubernetes Resources Per Service

```
deployment.yaml   → replicas, container image, env vars, resource limits
service.yaml      → ClusterIP for internal, LoadBalancer for external
ingress.yaml      → NGINX ingress rules for routing
configmap.yaml    → Non-secret environment config
secrets.yaml      → Database URLs, JWT secrets, API keys
hpa.yaml          → Horizontal Pod Autoscaler (worker-service scales 2–10 pods)
```

### Acceptance Criteria
- [ ] All services start with `docker-compose up`
- [ ] No hardcoded secrets (all from env vars)
- [ ] GitHub Actions pipeline passes on push to main
- [ ] Kubernetes manifests valid (kubectl dry-run passes)
- [ ] Prometheus scraping metrics from all services
- [ ] Grafana dashboard shows live metrics

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| AI API rate limiting | Medium | High | Queue with backoff, cache results |
| Large repo files exceed token limit | High | Medium | Chunk files, analyze 4000 tokens at a time |
| GitHub token expiry | Medium | High | Refresh token flow + re-auth prompt |
| Redis crash loses queue | Low | High | Redis persistence (AOF), job deduplication |
| AI response not valid JSON | Medium | High | JSON mode enforcement, fallback parser |
| PostgreSQL slow queries | Medium | Medium | Add indexes on user_id, repo_id, review_id |

---

## Definition of Done

A feature is considered **done** when:

1. Code written and peer-reviewed (or self-reviewed)
2. Unit tests written and passing
3. Integration test covers the happy path
4. Endpoint documented in `docs/api-reference.md`
5. Docker Compose service starts cleanly
6. No critical or high security issues in code review

---

## Milestones

| Milestone | Target | Key Deliverable |
|---|---|---|
| M1 | Week 1 | Auth service working end-to-end |
| M2 | Week 1 | GitHub OAuth + repo listing |
| M3 | Week 2 | First file analyzed by AI and stored |
| M4 | Week 2 | Full async pipeline operational |
| M5 | Week 3 | Frontend displays real review results |
| M6 | Week 4 | Platform runs fully in Docker |
| M7 | Week 4 | CI/CD pipeline deployed |
| M8 | Week 4 | Monitoring dashboards live |
