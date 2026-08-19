# syntax=docker/dockerfile:1

FROM node:24-alpine AS build
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

COPY . .

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

FROM nginx:stable-alpine
WORKDIR /app

# Alpine's nodejs uses system ICU. Without icu-data-full, en-CA date
# strings can be M/D/YYYY and Date#toISOString throws RangeError.
RUN apk add --no-cache nodejs icu-data-full tzdata libc6-compat
ENV TZ=UTC

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 80;
    listen [::]:80;
    server_name _;
    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

COPY <<'EOF' /start.sh
#!/bin/sh
set -e
export NODE_ENV=production
export PORT=3000
export HOSTNAME=0.0.0.0
node /app/server.js &
exec nginx -g "daemon off;"
EOF

RUN chmod +x /start.sh

EXPOSE 80

ENTRYPOINT ["/start.sh"]
