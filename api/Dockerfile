# ── Build stage ──────────────────────────────────────────────────
FROM node:22-slim AS build
WORKDIR /app

# Install deps using the api package manifest only (monorepo-friendly)
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Prune to production deps
RUN npm prune --omit=dev

# ── Runtime stage ────────────────────────────────────────────────
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

EXPOSE 4000
USER node
CMD ["node", "dist/index.js"]
