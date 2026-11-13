# dist/ is the same on every platform: build once, natively, not under arm64 emulation.
FROM --platform=$BUILDPLATFORM oven/bun:1.4.4 AS builder

WORKDIR /app

# Install dependencies with bun
COPY package.json bun.lock* ./
RUN bun install --no-save --frozen-lockfile

COPY . .

# Builds the app (outputs to '/app/dist')
RUN bun --bun run build

# BusyBox httpd sends "file.gz" when the browser accepts gzip, so the JS goes
# over the network as 79 kB, not 249 kB. Image only: GitHub Pages does its own gzip.
RUN bun -e 'for (const f of new Bun.Glob("dist/{*.js,*.css,index.html}").scanSync()) await Bun.write(`${f}.gz`, Bun.gzipSync(await Bun.file(f).bytes(), { level: 9 }))'

# Production image: BusyBox httpd serves the static files (2 MB; nginx:alpine is 63 MB).
FROM busybox:musl AS runner
COPY --from=builder /app/dist /www

# Types that BusyBox httpd does not know; without them it sends no Content-Type.
# Syntax (busybox networking/httpd.c): ".ext:mime/type", one per line.
COPY <<EOF /etc/httpd.conf
.woff2:font/woff2
.ico:image/x-icon
EOF

# 65534 is "nobody" in the busybox image. Port 3000 needs no privileges.
USER 65534:65534
EXPOSE 3000

# httpd as PID 1 ignores SIGTERM, so "docker stop" would wait 10 s for SIGKILL.
# The shell traps TERM and INT and stops httpd, so the container stops at once.
CMD ["sh", "-c", "trap 'kill $!' TERM INT; httpd -f -v -p 3000 -h /www -c /etc/httpd.conf & wait $!"]
