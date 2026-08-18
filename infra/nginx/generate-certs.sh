#!/usr/bin/env bash
# Generates a self-signed certificate for local HTTPS testing.
# For real deployments use certbot (Let's Encrypt) instead.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERT_DIR="$DIR/certs"
mkdir -p "$CERT_DIR"

openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
  -keyout "$CERT_DIR/privkey.pem" \
  -out "$CERT_DIR/fullchain.pem" \
  -subj "/CN=erp.example.com" \
  -addext "subjectAltName=DNS:erp.example.com,DNS:localhost,IP:127.0.0.1"

echo "Self-signed certificate written to $CERT_DIR"
echo "Mount $CERT_DIR into the nginx container at /etc/nginx/certs"