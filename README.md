# 🚀 GitHub Release Notifier API

**🟢 Live Demo:** [https://github-email-notifier.rsukhanov.com](https://github-email-notifier.rsukhanov.com)  
**📘 Swagger API Docs:** [https://github-email-notifier.rsukhanov.com/api-docs](https://github-email-notifier.rsukhanov.com/api-docs)

A production-ready REST API service that allows users to subscribe to email notifications about new releases of their favorite GitHub repositories. 

Built as a test assignment, this project demonstrates a deep understanding of backend architecture, caching strategies, background processing, monitoring, and containerization.

It is currently deployed on a cloud Ubuntu VPS.

---

## 📌 Table of Contents
- [Architecture & Logic](#-architecture--logic)
- [Database Schema](#-database-schema-postgresql--prisma)
- [Caching Strategy (Redis)](#-caching-strategy-redis)
- [Authentication (API Key)](#-authentication-api-key)
- [Error Handling](#-error-handling)
- [Monitoring (Prometheus)](#-monitoring-prometheus)
- [Testing](#-testing)
- [CI/CD](#-cicd)
- [User Interface (Static HTML)](#-user-interface-static-html)
- [API Endpoints](#-api-endpoints)
- [Environment Variables](#-environment-variables)
- [Getting Started (Docker)](#-getting-started-docker)

---

## 🏗 Architecture & Logic

The application follows a modular, classic **3-Tier Monolith Architecture** (Controllers -> Services -> Data Access) built on Express.js and TypeScript.

**Core Workflow:**
1. **Subscription:** A user submits an email and a repository (`owner/repo`). The system validates the repository via the GitHub API.
2. **Confirmation:** To prevent spam, the system sends an email with a unique confirmation token. The subscription remains `confirmed: false` until the user clicks the link.
3. **Background Scanner:** A scheduled Cron Job (`ScannerService`) runs periodically. It fetches the latest release tag for all tracked repositories from GitHub.
4. **Notification:** If the fetched tag differs from the `last_seen_tag` in the database, the system triggers the `NotifierService` to send emails to all confirmed subscribers and updates the tag in the database.

---

## 🗄 Database Schema (PostgreSQL + Prisma)

The database structure is optimized for fast lookups during the scanning process. It utilizes **Prisma ORM** for strict type safety and migrations.

* **Repository Model:**
  * `id` (UUID) - Id, Unique, Auto generation
  * `name` (String) - Unique
  * `lastSeenTag` (String) - Null by default
  * `createdAt` (DateTime)
  * `updatedAt` (DateTime)

  * `subscriptions` (relation Subscription[])

* **Subscription Model:**
  * `id` (UUID) - Id, Unique, Auto generation
  * `email` (String) - 
  * `status` (enum: PENDING / ACTIVE) - PENDING by default
  * `token` (UUID) - Auto generation
  * `createdAt` (DateTime)

  * `repositoryId` (String) - Id from repository
  * `repository` (relation Repository)

  * **Rule:** A single email can only have one subscription per repository. This is enforced at the database level using a composite unique constraint (`@@unique([email, repositoryId])`).

*Note: Migrations are executed automatically when the Docker container starts, ensuring the DB is always in sync with the Prisma schema.*

---

## ⚡ Caching Strategy (Redis)

GitHub API has strict rate limits (60 requests per hour for unauthenticated users). To prevent the `ScannerService` from exhausting this limit, **Redis** is implemented as a caching layer.

* **Logic:** When the scanner or a user requests repository data, the system first checks Redis. If the data is cached and fresh (TTL), it returns it immediately. If not, it fetches from GitHub, caches it, and then returns it.
* **Benefit:** Dramatically reduces external HTTP calls, speeds up response times, and ensures the service does not get IP-banned by GitHub.

---

## 🔐 Authentication (API Key)

The API includes a configurable security layer for public endpoints to prevent abuse.

* Controlled via the `REQUIRE_API_KEY` environment variable.
* If set to `true`, all sensitive public endpoints require a valid `x-api-key` header matching the `API_KEY` env variable.
* If set to `false`, the API is completely open.
* *Bonus:* The static HTML frontend dynamically adjusts to this setting. It fetches the configuration via `/api/config` and displays an API Key input field only if required by the backend.

---

## 🛠 Error Handling

The application uses a centralized error-handling mechanism via a custom `HttpException` class and a global error middleware.

* **Validation:** Returns `400 Bad Request` for invalid emails, missing fields, tokens, or incorrect repository formats.
* **Not Found:** Returns `404 Not Found` if the GitHub repository does not exist or a confirmation token is invalid.
* **Conflicts:** Returns `409 Conflict` if the user is already subscribed to the repository.
* The error responses strictly follow the required JSON contract: `{ "error": "Error message" }`.

---

## 📊 Monitoring (Prometheus)

Observability is implemented using `prom-client`. The application exposes a `/metrics` endpoint (accessible without authentication) that Prometheus can scrape.

Collected metrics include:
* **System Metrics:** Node.js Event Loop lag, CPU usage, and Memory (RAM) consumption.
* **Business/HTTP Metrics:** Custom counters and histograms tracking the total number of HTTP requests, their routes, status codes, and response durations.

---

## 🧪 Testing

Quality assurance is built into the workflow.

* **Unit Tests:** The core business logic (`SubscriptionService`, `GithubService`, `ScannerService`) is fully covered by **Jest**.
* **Mocking:** Both PostgreSQL (Prisma) and Redis are completely mocked during tests. This ensures tests are blazing fast and do not require external containers to run.

---

## 🔄 CI/CD

* **CI/CD Pipeline:** A **GitHub Actions** workflow (`.github/workflows/ci.yml`) is configured to automatically run `ESLint` and `Jest` on every `push` and `pull_request` to the main branch.

---

## 🌐 User Interface (Static HTML)

Instead of just providing raw API endpoints, the application serves a modern, responsive UI directly from the backend (Static serving via Express).

* Located in the `/public` folder.
* **`index.html`:** A user-friendly form to subscribe to repositories. It gracefully handles API Key requirements and displays inline success/error messages.
* **`confirm.html`:** An elegant landing page that handles the email confirmation link. It calls the API in the background to ensure HTTP 200 contract compliance while providing a good User Experience.

---

## 🚦 API Endpoints

Following the provided Swagger specification:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/subscribe` | Subscribes an email to a repository. |
| `GET`  | `/api/confirm/:token` | Confirms a subscription via token. |
| `GET`  | `/api/unsubscribe/:token`| Unsubscribes a user via token. |
| `GET`  | `/api/subscriptions` | Returns all subscriptions for an email. |
| `GET`  | `/api/config` | UI Helper: Returns API Key requirements. |
| `GET`  | `/metrics` | Prometheus metrics export. |
| `GET`  | `/api-docs` | Interactive Swagger UI documentation. |

---

## ⚙️ Environment Variables

To run the project, create a `.env` file in the root directory:

```env
# Application
PORT=4200
DOMAIN_URL="https://github-email-notifier.rsukhanov.com"

# Database (PostgreSQL)
DATABASE_URL="postgresql://user:Aa123456@db:5432/github-email-notifier-db?schema=public"

# Cache (Redis)
REDIS_URL="redis://redis:6379"

# Email Provider (Mailtrap / SMTP)
MAILTRAP_TOKEN=your_mailtrap_token_123
EMAIL_DOMAIN=rsukhanov.com

# Security
REQUIRE_API_KEY=false
API_KEY=your_secret_api_key_456

# GitHub (Optional, but recommended for higher rate limits)
GITHUB_TOKEN=your_github_personal_access_token

# Tunnel & Domain 
CLOUDFLARE_TUNNEL_TOKEN=your_cloudflare_tunnel_token_789
```

---

## 🐳 Getting Started (Docker)

The absolute easiest way to run the application is using Docker. The `docker-compose.yml` file orchestrates the Node.js API, PostgreSQL database, Redis cache, and the Cloudflare Tunnel.

**Important:** The application container utilizes a healthcheck to wait for PostgreSQL and Redis to be fully ready before starting. This guarantees that Prisma database migrations (npx prisma migrate deploy) run successfully on startup without crashing the app.

1. Clone the repository to your local machine.
2. Configure your .env file based on the environment variables listed above.
3. Run the following command to build and start all services in detached mode:

`docker-compose up --build -d`

Once started, the application will be available at:

* **UI:** http://localhost:4200 (or domain configured by your CLOUDFLARE_TUNNEL_TOKEN)
* **Swagger Docs:** http://localhost:4200/api-docs
* **Metrics:** http://localhost:4200/metrics

*Developed by Roman Sukhanov*