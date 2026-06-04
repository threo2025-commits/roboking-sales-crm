#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo "Installing backend dependencies..."
(cd backend && npm install && cp -n .env.example .env || true)
echo "Installing frontend dependencies..."
(cd frontend && npm install && cp -n .env.example .env.local || true)
echo "Edit backend/.env DATABASE_URL, then run:"
echo "cd backend && npx prisma generate && npx prisma migrate dev --name init && npm run seed && npm run start:dev"
echo "Open another terminal: cd frontend && npm run dev"
