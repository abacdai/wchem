#!/bin/bash
# WChem development server (Express + MongoDB)
# Serves the static app (index.html, lab.html) AND the /api backend.

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "🧪 Starting WChem Development Server (Express + MongoDB)..."
echo ""

# MongoDB must be reachable (local mongod, a running service/container,
# or MONGODB_URI). Probe the default port instead of checking PATH, so a
# systemd/docker MongoDB does not trigger a false warning.
if [ -z "$MONGODB_URI" ] && ! command -v mongod &> /dev/null; then
    if ! (exec 3<>/dev/tcp/127.0.0.1/27017) 2>/dev/null; then
        echo "⚠️  MongoDB không khả dụng (mongod not in PATH, port 27017 closed)."
        echo "   Start MongoDB (e.g. 'mongod --dbpath <dir>') or set MONGODB_URI."
        echo ""
    fi
fi

echo "Server running at: http://localhost:8000"
echo ""
echo "Open these URLs in your browser:"
echo "  - Main app: http://localhost:8000/index.html"
echo "  - VR Lab:   http://localhost:8000/lab.html"
echo "  - API:      http://localhost:8000/api/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

cd "$ROOT/taskflow/backend"
PORT=8000 node src/server.js
