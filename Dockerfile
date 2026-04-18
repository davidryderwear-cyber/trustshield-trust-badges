# Build stage: install all deps (including dev) and build
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including dev) for the build
RUN npm install && npx prisma generate

COPY . .

RUN npm run build

# Prune dev dependencies after build to reduce final image size
RUN npm prune --omit=dev

# Runtime stage: copy built artifacts and production deps
FROM node:18-alpine

EXPOSE 3000
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

ENV NODE_ENV=production

CMD ["npm", "run", "docker-start"]
