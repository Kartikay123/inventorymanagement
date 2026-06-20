# Inventory & Order Management System

A full-stack app to manage products, customers, orders and stock levels. React
frontend, FastAPI backend, PostgreSQL database, all containerized with Docker
Compose.

## Stack

- Frontend: React (Vite), Tailwind CSS, React Router, Axios
- Backend: FastAPI, SQLAlchemy, Pydantic
- Database: PostgreSQL (falls back to SQLite for zero-setup local dev)
- Tooling: Docker, Docker Compose, nginx

## Run with Docker

Needs Docker and Docker Compose.

```bash
cp .env.example .env        # set a Postgres password
docker compose up --build
```

- Frontend: http://localhost:8080
- API: http://localhost:8000
- API docs: http://localhost:8000/docs

Tables are created on startup, and some demo data (8 products, 3 customers, 1
order) is seeded so the dashboard isn't empty on first run. `docker compose down`
stops everything; add `-v` to also drop the database volume.

## Run locally without Docker

Backend:

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload      # http://localhost:8000
```

This uses a local SQLite file by default, so there's nothing else to set up. To
point it at Postgres, set `DATABASE_URL` (see `backend/.env.example`).

Frontend:

```bash
cd frontend
npm install
npm run dev                        # http://localhost:5173
```

The dev server proxies `/api` to `http://localhost:8000`. If the backend is on a
different port, set the target, e.g.
`VITE_DEV_API_TARGET=http://localhost:8001 npm run dev`.

## API

Base URL `http://localhost:8000`; interactive docs at `/docs`.

Products

- `POST /products` — create (SKU must be unique)
- `GET /products` — list, supports `?search=` and `?low_stock=true`
- `GET /products/{id}` — get one
- `PUT /products/{id}` — update
- `DELETE /products/{id}` — delete (blocked if the product is in an order)

Customers

- `POST /customers` — create (email must be unique)
- `GET /customers` — list, supports `?search=`
- `GET /customers/{id}` — get one
- `DELETE /customers/{id}` — delete (blocked if the customer has orders)

Orders

- `POST /orders` — create; checks stock, decrements it, computes the total
- `GET /orders` — list with items and customer
- `GET /orders/{id}` — full details
- `DELETE /orders/{id}` — cancel and return stock to inventory

Other

- `GET /dashboard` — totals plus low-stock and recent-order lists
- `GET /health` — health check

Status codes: `201` created, `400` bad request (e.g. not enough stock), `404`
not found, `409` conflict (duplicate SKU/email, or deleting a referenced record),
`422` validation error.

## Business rules

- SKU and email are unique (case-insensitive).
- Price and quantity can't go negative.
- An order is rejected if any line exceeds available stock.
- Placing an order reduces stock; cancelling an order restores it.
- The order total is calculated on the server from current prices, not trusted
  from the request.

## Environment variables

Root `.env` (Docker Compose): `POSTGRES_USER`, `POSTGRES_PASSWORD`,
`POSTGRES_DB`, `BACKEND_PORT` (8000), `FRONTEND_PORT` (8080), `CORS_ORIGINS`,
`LOW_STOCK_THRESHOLD` (10), `SEED_DATA`.

Backend: `DATABASE_URL`, `CORS_ORIGINS`, `LOW_STOCK_THRESHOLD`, `SEED_DATA`,
`DEBUG`. Frontend: `VITE_API_BASE_URL` (default `/api`), `VITE_DEV_API_TARGET`.

See the `.env.example` files for details. No secrets are committed or baked into
images.

## Tests

`backend/test_e2e.py` runs every endpoint and business rule against SQLite, no
external services required:

```bash
cd backend && source .venv/bin/activate
pip install httpx
DATABASE_URL="sqlite:///./e2e.db" SEED_DATA=false python test_e2e.py
```

## Deployment

The frontend calls a relative `/api` path that nginx (Docker) and Vite (dev)
proxy to the backend, so there are no CORS issues in those setups. For a split
deploy, set `VITE_API_BASE_URL` to the backend's full URL at build time.

- Backend: `render.yaml` is a Render blueprint that provisions the API and a
  managed Postgres and wires up `DATABASE_URL`. Configs for Railway
  (`backend/railway.json`) and Fly.io (`backend/fly.toml`) are also included.
- Frontend: deploy `frontend/` to Vercel or Netlify (`vercel.json` /
  `netlify.toml` handle the build and SPA routing) and set `VITE_API_BASE_URL`
  to the backend URL.

After both are live, set the backend's `CORS_ORIGINS` to the frontend URL.

## Layout

```
backend/             FastAPI app (app/), Dockerfile, tests, deploy configs
  app/
    main.py          app setup, CORS, error handlers, startup
    config.py        settings from environment
    database.py      engine/session
    models.py        SQLAlchemy models
    schemas.py       Pydantic schemas
    seed.py          demo data
    routers/         products, customers, orders, dashboard
frontend/            React app (src/), Dockerfile, nginx.conf, deploy configs
  src/
    api/             axios client
    components/      layout and UI pieces
    pages/           Dashboard, Products, Customers, Orders
docker-compose.yml
```
