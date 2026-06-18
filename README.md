# 📦 Inventory & Order Management System

A production-ready, fully containerized **full-stack** application for managing products, customers, orders and live inventory tracking.

> **Stack:** React (Vite + Tailwind) · FastAPI (Python) · PostgreSQL · Docker + Docker Compose

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white">
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white">
  <img alt="Docker" src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white">
  <img alt="Tailwind" src="https://img.shields.io/badge/TailwindCSS-3-06B6D4?logo=tailwindcss&logoColor=white">
</p>

---

## 🚀 Quick Start (Docker Compose — one command)

**Prerequisites:** Docker Desktop (or Docker Engine + Compose v2).

```bash
# 1. Configure environment (change the DB password for real use)
cp .env.example .env

# 2. Build & run the whole stack (frontend + backend + PostgreSQL)
docker compose up --build
```

Then open:

| Service        | URL                                |
| -------------- | ---------------------------------- |
| 🖥️ Frontend     | http://localhost:8080              |
| ⚙️ Backend API  | http://localhost:8000              |
| 📚 API Docs     | http://localhost:8000/docs (Swagger) |

The database is automatically created, tables are migrated on startup, and a small set of **demo data** (8 products, 3 customers, 1 order) is seeded so the dashboard is populated immediately. Stop with `Ctrl+C`, tear down with `docker compose down` (add `-v` to also remove the database volume).

---

## ✨ Features

### Functionality
- **Products** — create, list, search, view, update, delete · unique SKU · live stock status (in / low / out of stock)
- **Customers** — create, list, search, view, delete · unique email
- **Orders** — create multi-product orders, list, view full details, cancel · automatic stock deduction & restore
- **Dashboard** — totals (products / customers / orders), low-stock & out-of-stock counts, total inventory value, total revenue, low-stock alerts and recent orders

### Business rules (enforced server-side)
- ✅ Product SKU is **unique** (case-insensitive)
- ✅ Customer email is **unique** (case-insensitive)
- ✅ Product quantity & price can **never be negative**
- ✅ Orders are **rejected** when inventory is insufficient
- ✅ Creating an order **automatically reduces** stock; cancelling **restores** it
- ✅ Order total is **computed by the backend** (never trusted from the client)
- ✅ Full request validation, consistent error messages and correct **HTTP status codes**

### UI / UX
- 📱 Fully **responsive** (desktop tables ↔ mobile cards, drawer navigation)
- 🎨 Clean, modern interface built with **Tailwind CSS**
- 🔔 Toast notifications for every success / error
- ⚠️ Inline **form validation** with helpful messages
- ⏳ Loading, empty and error states everywhere

---

## 🏗️ Architecture

```
                         ┌──────────────────────────────────────────┐
   Browser  ──────────►  │  Frontend container (nginx)              │
                         │  • Serves the built React SPA            │
   http://localhost:8080 │  • Proxies /api/* ──────────┐            │
                         └─────────────────────────────┼────────────┘
                                                       │ (internal network)
                         ┌─────────────────────────────▼────────────┐
                         │  Backend container (Uvicorn + FastAPI)   │
   http://localhost:8000 │  • REST API + business logic             │
                         │  • SQLAlchemy ORM ──────────┐            │
                         └─────────────────────────────┼────────────┘
                                                       │
                         ┌─────────────────────────────▼────────────┐
                         │  PostgreSQL container                    │
                         │  • Named volume `inventory_pgdata`       │
                         └──────────────────────────────────────────┘
```

The frontend talks to the backend through a **relative `/api` path**, which nginx (in Docker) and Vite (in dev) reverse-proxy to the backend. This means **no CORS issues and no rebuild** needed when moving between environments. For split cloud deployments, point `VITE_API_BASE_URL` at the full backend URL instead.

---

## 📁 Project Structure

```
.
├── backend/                     # FastAPI application
│   ├── app/
│   │   ├── main.py              # App factory, CORS, error handlers, startup
│   │   ├── config.py           # Env-driven settings (no hardcoded secrets)
│   │   ├── database.py         # Engine/session, URL normalization, DB wait
│   │   ├── models.py           # SQLAlchemy models (Product/Customer/Order/OrderItem)
│   │   ├── schemas.py          # Pydantic v2 request/response validation
│   │   ├── seed.py             # Demo data seeding
│   │   └── routers/            # products / customers / orders / dashboard
│   ├── test_e2e.py             # End-to-end API + business-logic test (46 checks)
│   ├── requirements.txt
│   ├── Dockerfile              # Slim, non-root, healthchecked
│   ├── .dockerignore
│   ├── fly.toml · railway.json # Backend deployment configs
│   └── .env.example
├── frontend/                    # React + Vite + Tailwind
│   ├── src/
│   │   ├── api/client.js        # Axios layer + error normalization
│   │   ├── components/          # Layout, Sidebar, Modal, StatCard, forms, …
│   │   ├── context/             # Toast notifications
│   │   ├── pages/               # Dashboard / Products / Customers / Orders
│   │   └── utils/               # Formatting helpers
│   ├── Dockerfile              # Multi-stage build → nginx
│   ├── nginx.conf              # SPA serving + /api reverse proxy
│   ├── vercel.json · netlify.toml
│   └── .env.example
├── docker-compose.yml          # 3 services + named volume + healthchecks
├── render.yaml                 # Render blueprint (backend + managed Postgres)
├── .env.example
└── README.md
```

---

## 🔌 API Reference

Base URL: `http://localhost:8000` · Interactive docs at `/docs`.

### Products
| Method   | Endpoint          | Description                              | Success |
| -------- | ----------------- | ---------------------------------------- | ------- |
| `POST`   | `/products`       | Create a product (unique SKU)            | 201     |
| `GET`    | `/products`       | List all (supports `?search=&low_stock=`)| 200     |
| `GET`    | `/products/{id}`  | Get one product                          | 200     |
| `PUT`    | `/products/{id}`  | Update product (partial)                 | 200     |
| `DELETE` | `/products/{id}`  | Delete (blocked if used by an order)     | 200     |

### Customers
| Method   | Endpoint           | Description                          | Success |
| -------- | ------------------ | ------------------------------------ | ------- |
| `POST`   | `/customers`       | Create a customer (unique email)     | 201     |
| `GET`    | `/customers`       | List all (supports `?search=`)       | 200     |
| `GET`    | `/customers/{id}`  | Get one customer                     | 200     |
| `DELETE` | `/customers/{id}`  | Delete (blocked if they have orders) | 200     |

### Orders
| Method   | Endpoint        | Description                                   | Success |
| -------- | --------------- | --------------------------------------------- | ------- |
| `POST`   | `/orders`       | Create order (validates stock, computes total)| 201     |
| `GET`    | `/orders`       | List all orders with items & customer         | 200     |
| `GET`    | `/orders/{id}`  | Get full order details                        | 200     |
| `DELETE` | `/orders/{id}`  | Cancel order (restores stock)                 | 200     |

### Dashboard & Health
| Method | Endpoint     | Description                |
| ------ | ------------ | -------------------------- |
| `GET`  | `/dashboard` | Aggregate summary metrics  |
| `GET`  | `/health`    | Liveness/readiness probe   |

### Status codes used
`200` OK · `201` Created · `400` Bad request (e.g. insufficient stock) · `404` Not found · `409` Conflict (duplicate SKU/email or referenced entity) · `422` Validation error.

<details>
<summary><b>Example requests</b></summary>

```bash
# Create a product
curl -X POST http://localhost:8000/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Desk Lamp","sku":"LAMP-01","price":29.99,"quantity":40}'

# Create a customer
curl -X POST http://localhost:8000/customers \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Dana Lee","email":"dana@example.com","phone":"+1-555-0100"}'

# Create an order (total is computed by the backend; stock is reduced)
curl -X POST http://localhost:8000/orders \
  -H "Content-Type: application/json" \
  -d '{"customer_id":1,"items":[{"product_id":1,"quantity":2}]}'
```
</details>

---

## 💻 Local Development (without Docker)

### Backend
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Runs with zero setup on a local SQLite file by default:
uvicorn app.main:app --reload
# → http://localhost:8000  (docs at /docs)
```
To use PostgreSQL instead, set `DATABASE_URL` (see `backend/.env.example`).

### Frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173  (proxies /api to http://localhost:8000)
```

---

## ⚙️ Environment Variables

**Root (`.env`, used by docker-compose)**

| Variable             | Default              | Description                          |
| -------------------- | -------------------- | ------------------------------------ |
| `POSTGRES_USER`      | `inventory`          | Database user                        |
| `POSTGRES_PASSWORD`  | `change_me…`         | Database password **(change it!)**   |
| `POSTGRES_DB`        | `inventory`          | Database name                        |
| `BACKEND_PORT`       | `8000`               | Host port for the API                |
| `FRONTEND_PORT`      | `8080`               | Host port for the web app            |
| `CORS_ORIGINS`       | `*`                  | Allowed origins (set to frontend URL)|
| `LOW_STOCK_THRESHOLD`| `10`                 | Quantity at/below which = low stock  |
| `SEED_DATA`          | `true`               | Seed demo data on first run          |

**Backend** (`backend/.env.example`): `DATABASE_URL`, `CORS_ORIGINS`, `LOW_STOCK_THRESHOLD`, `SEED_DATA`, `DEBUG`.
**Frontend** (`frontend/.env.example`): `VITE_API_BASE_URL` (default `/api`).

No credentials are ever hardcoded — everything is read from the environment.

---

## 🧪 Testing

A self-contained end-to-end suite exercises **every endpoint and business rule** (CRUD, unique constraints, negative-value rejection, insufficient-stock handling, automatic total calculation, stock reduction & restoration, referential-integrity guards, dashboard aggregation) — 46 assertions, no external services required (uses SQLite):

```bash
cd backend
source .venv/bin/activate
pip install httpx                       # test-only dependency
DATABASE_URL="sqlite:///./e2e.db" SEED_DATA=false python test_e2e.py
# → 46 passed, 0 failed
```

---

## ☁️ Deployment

### Backend → Render (recommended, blueprint included)
1. Push this repo to GitHub.
2. Render → **New +** → **Blueprint** → select the repo. `render.yaml` provisions the **backend** + a **managed PostgreSQL** and wires `DATABASE_URL` automatically.
3. After the frontend is live, set the backend's `CORS_ORIGINS` to the frontend URL and redeploy.

<details>
<summary><b>Backend → Railway</b></summary>

1. Railway → **New Project** → **Deploy from GitHub repo** → set root directory to `backend` (it auto-detects the `Dockerfile` via `railway.json`).
2. Add a **PostgreSQL** plugin → Railway sets `DATABASE_URL`.
3. Add variable `CORS_ORIGINS=<your frontend URL>`.
</details>

<details>
<summary><b>Backend → Fly.io</b></summary>

```bash
cd backend
fly launch --no-deploy           # uses the included fly.toml
fly postgres create              # then: fly postgres attach <db-name>
fly secrets set CORS_ORIGINS="https://your-frontend.vercel.app"
fly deploy
```
</details>

### Frontend → Vercel (or Netlify)
1. Import the repo, set **Root Directory** = `frontend` (config auto-detected via `vercel.json` / `netlify.toml`).
2. Add an environment variable **`VITE_API_BASE_URL`** = your live backend URL (e.g. `https://inventory-backend.onrender.com`).
3. Deploy. The SPA rewrite rules are already configured.

### 🐳 Publish the backend image to Docker Hub
```bash
docker build -t <your-dockerhub-username>/inventory-backend:latest ./backend
docker login
docker push <your-dockerhub-username>/inventory-backend:latest
```

---

## 📋 Submission Checklist

- [x] React frontend · Python (FastAPI) backend · PostgreSQL database
- [x] Full CRUD for products, customers, orders + dashboard
- [x] All business rules + validation + correct HTTP status codes
- [x] Responsive, professional UI with proper state management
- [x] Production-ready Dockerfiles (backend + frontend), `.dockerignore`, env config
- [x] `docker-compose.yml` running all three services with a named volume
- [x] Slim base images · non-root backend · no hardcoded credentials
- [x] Deployment configs for Render / Railway / Fly.io + Vercel / Netlify
- [ ] GitHub repository link _(add after pushing)_
- [ ] Docker Hub image link _(add after pushing)_
- [ ] Live frontend URL _(add after deploying)_
- [ ] Live backend URL _(add after deploying)_

---

## 🧰 Tech Stack

| Layer            | Technology                                              |
| ---------------- | ------------------------------------------------------- |
| Frontend         | React 18, Vite, React Router, Tailwind CSS, Axios, lucide-react |
| Backend          | Python, FastAPI, Uvicorn, SQLAlchemy 2.0, Pydantic v2   |
| Database         | PostgreSQL 16 (SQLite for zero-config local dev)        |
| Containerization | Docker, Docker Compose, nginx                           |

---

Built as a technical assessment — _Production-Ready Containerized Inventory & Order Management System_.
