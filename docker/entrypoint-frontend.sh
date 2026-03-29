#!/bin/sh
set -e

BACKEND_URL="${BACKEND_URL:-http://backend:8000}"

echo "ENTRYPOINT RUNNING - BACKEND_URL=${BACKEND_URL}"
sed -i "s|BACKEND_PLACEHOLDER|${BACKEND_URL}|g" /etc/nginx/conf.d/default.conf

echo "Config after replacement:"
cat /etc/nginx/conf.d/default.conf

exec nginx -g "daemon off;"
