# Stage 1: build the React app
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first for better layer caching.
COPY package*.json ./
RUN npm ci

# Base URL the bundle uses to reach the API. Defaults to "/api", which nginx
# proxies to the backend (see nginx.conf). Override at build time for split
# deployments, e.g. --build-arg VITE_API_BASE_URL=https://api.example.com
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY . .
RUN npm run build

# Stage 2: serve with nginx
FROM nginx:1.27-alpine AS runtime

# Replace the default site config with our SPA + API-proxy config.
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/app.conf

# Copy the compiled static assets.
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# Use 127.0.0.1 (not "localhost") so the check always uses IPv4 — nginx listens
# on IPv4 only, while "localhost" can resolve to IPv6 (::1) inside the container.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
