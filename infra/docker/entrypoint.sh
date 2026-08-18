#!/bin/sh
set -e

echo "Waiting for PostgreSQL..."
node /wait-for-db.js

echo "Applying database migrations..."
npx --no-install prisma migrate deploy

echo "Seeding if the database is empty..."
node /seed-if-empty.js

echo "Starting Engineering Resource Planner on :${PORT}..."
exec node /app/apps/server/dist/src/index.js