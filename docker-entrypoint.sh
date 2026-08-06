#!/bin/sh
set -e

cat <<EOF > /usr/share/nginx/html/config.js
window.APP_CONFIG = {
  API_URL: "${VITE_API_URL:-${API_URL:-}}",
  STORE_APP_URL: "${VITE_STORE_APP_URL:-${STORE_APP_URL:-}}"
};
EOF

exec "$@"
