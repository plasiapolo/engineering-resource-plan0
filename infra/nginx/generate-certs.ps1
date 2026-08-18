# Generates a self-signed certificate for local HTTPS testing.
# For real deployments use certbot (Let's Encrypt) instead.
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CertDir = Join-Path $ScriptDir "certs"
New-Item -ItemType Directory -Force -Path $CertDir | Out-Null

$PrivKey = Join-Path $CertDir "privkey.pem"
$FullChain = Join-Path $CertDir "fullchain.pem"

& openssl req -x509 -nodes -newkey rsa:2048 -days 365 `
  -keyout $PrivKey `
  -out $FullChain `
  -subj "/CN=erp.example.com" `
  -addext "subjectAltName=DNS:erp.example.com,DNS:localhost,IP:127.0.0.1"

Write-Host "Self-signed certificate written to $CertDir"
Write-Host "Mount $CertDir into the nginx container at /etc/nginx/certs"