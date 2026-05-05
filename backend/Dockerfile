# syntax=docker/dockerfile:1.7

# ---- Base ----
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat

# ---- Deps ----
FROM base AS deps
WORKDIR /app/backend
COPY backend/package.json ./
COPY prisma /app/prisma
RUN npm install --no-audit --no-fund

# ---- Dev (used by docker-compose dev target) ----
FROM base AS dev
WORKDIR /app/backend
COPY --from=deps /app/backend/node_modules ./node_modules
COPY backend ./
COPY prisma /app/prisma
ENV NODE_ENV=development
EXPOSE 3001
CMD ["npm", "run", "start:dev"]

# ---- Build ----
FROM base AS build
WORKDIR /app/backend
COPY --from=deps /app/backend/node_modules ./node_modules
COPY backend ./
COPY prisma /app/prisma
RUN npx prisma generate --schema /app/prisma/schema.prisma
RUN npm run build

# ---- Prod ----
FROM node:20-alpine AS prod
WORKDIR /app/backend
ENV NODE_ENV=production
RUN apk add --no-cache openssl libc6-compat
COPY backend/package.json ./
COPY prisma /app/prisma
RUN npm install --omit=dev --no-audit --no-fund
COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/backend/node_modules/@prisma ./node_modules/@prisma
EXPOSE 3001
CMD ["node", "dist/main.js"]
