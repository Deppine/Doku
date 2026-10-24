# Doku: ตัวเว็บ (Next.js production)
# ใช้คู่กับ docker-compose.yml:  docker compose --profile app up -d --build

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# ค่า NEXT_PUBLIC_* ถูกฝังตอน build
ARG NEXT_PUBLIC_APP_NAME=Doku
ARG NEXT_PUBLIC_BASE_URL=http://localhost:3000
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/package.json /app/next.config.ts /app/tsconfig.json ./
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/db ./db
RUN mkdir -p uploads && chown -R node:node /app/uploads
USER node
EXPOSE 3000
CMD ["node_modules/.bin/next", "start", "-p", "3000"]
