#!/bin/sh
set -e

echo "ENTRYPOINT RUNNING - BACKEND_URL=${BACKEND_URL}"

BACKEND_URL="${BACKEND_URL:-http://backend:8000}"

# Inject backend URL
sed -i "s|BACKEND_PLACEHOLDER|${BACKEND_URL}|g" /etc/nginx/conf.d/default.conf

# Inject the container's actual DNS resolver so nginx can resolve the backend hostname at request time
RESOLVER=$(grep '^nameserver' /etc/resolv.conf | head -1 | awk '{print $2}')
echo "Using DNS resolver: ${RESOLVER}"
sed -i "s|RESOLVER_PLACEHOLDER|${RESOLVER}|g" /etc/nginx/conf.d/default.conf

echo "Config after replacement:"
cat /etc/nginx/conf.d/default.conf

exec nginx -g "daemon off;"
