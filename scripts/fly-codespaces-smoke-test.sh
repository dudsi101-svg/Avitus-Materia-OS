#!/usr/bin/env bash
set -Eeuo pipefail

required=(node curl bash)
for cmd in "${required[@]}"; do
  command -v "$cmd" >/dev/null 2>&1 || {
    echo "Missing required command: $cmd" >&2
    exit 1
  }
done

bash -n scripts/fly-codespaces-first-deploy.sh
bash -n scripts/fly-domain-setup.sh

echo "Codespaces Fly bootstrap preflight passed."
