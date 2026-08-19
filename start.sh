#!/bin/sh
set -e

export NODE_ENV=production
export PORT=3000
export HOSTNAME=0.0.0.0

node /app/server.js &
exec nginx -g "daemon off;"
