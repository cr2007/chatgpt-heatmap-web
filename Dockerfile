FROM oven/bun:1 AS builder

WORKDIR /app

# Install dependencies with bun
COPY package.json bun.lock* ./
RUN bun install --no-save --frozen-lockfile

COPY . .

# Builds the app (outputs to '/app/out')
RUN bun run build

# Production Build
FROM nginx:1.29-alpine AS runner
WORKDIR /usr/share/nginx/html
COPY --from=builder /app/out ./

# Optional: change default port to 3000
RUN sed -i 's/80/3000/' /etc/nginx/conf.d/default.conf

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
