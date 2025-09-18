# ----- Build Stage -----
FROM oven/bun:1.2-slim AS builder

# Set working directory
WORKDIR /app

# Copy package files and lockfile
COPY package.json bun.lock ./

# Install dependencies
RUN bun install

# Copy the rest of the application code
COPY . .

# Build the Next.js app
RUN bun x --no-install next build

# --- Serve Stage ---
# FROM oven/bun:1.2.20 AS runner
FROM oven/bun:1.2-slim AS runner

WORKDIR /app

# Only copy the static output and public assets
COPY --from=builder /app/out ./out
COPY --from=builder /app/public ./public

RUN bun add serve

# Expose the default Next.js port
EXPOSE 3000

CMD ["bun", "x", "serve", "out", "-l", "3000"]
