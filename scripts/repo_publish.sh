#!/usr/bin/env bash
set -euo pipefail

# Initialize and push the current directory to a GitHub repo.
# Usage:
#   scripts/repo_publish.sh https://github.com/<user>/<repo>.git
# or (with PAT):
#   scripts/repo_publish.sh https://<TOKEN>@github.com/<user>/<repo>.git

REMOTE_URL="${1:-}"
if [[ -z "${REMOTE_URL}" ]]; then
  echo "[ERR] Missing remote URL. Example: https://github.com/warusakudeveroper/gas_deployer.git" >&2
  exit 1
fi

if [[ ! -d .git ]]; then
  echo "[INFO] Initializing git repo..."
  git init
fi

git add .
git -c user.name="repo-bot" -c user.email="repo@example.com" commit -m "Init/Update: code, spec, guides, CLI, server, AdminShim" || true
git branch -M main || true

if ! git remote | grep -q '^origin$'; then
  git remote add origin "${REMOTE_URL}"
else
  git remote set-url origin "${REMOTE_URL}"
fi

echo "[INFO] Pushing to ${REMOTE_URL}"
git push -u origin main

echo "[OK] Repository pushed."

