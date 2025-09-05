#!/usr/bin/env bash
set -euo pipefail

# Publish local wiki Markdown files in github_wiki/ to the GitHub Wiki repo.
# Usage:
#   scripts/wiki_publish.sh https://github.com/<user>/<repo>.wiki.git
# or (with PAT):
#   scripts/wiki_publish.sh https://<TOKEN>@github.com/<user>/<repo>.wiki.git

WIKI_REMOTE_URL="${1:-}"
if [[ -z "${WIKI_REMOTE_URL}" ]]; then
  echo "[ERR] Missing wiki remote URL. Example: https://github.com/warusakudeveroper/gas_deployer.wiki.git" >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

echo "[INFO] Preparing temporary wiki worktree: ${TMP_DIR}"
git init -q "${TMP_DIR}"
cp -f github_wiki/*.md "${TMP_DIR}" 2>/dev/null || true

pushd "${TMP_DIR}" >/dev/null
git add .
git -c user.name="wiki-bot" -c user.email="wiki@example.com" commit -m "Update wiki pages" >/dev/null || true
git branch -M master >/dev/null 2>&1 || true
git remote add origin "${WIKI_REMOTE_URL}"
echo "[INFO] Pushing to ${WIKI_REMOTE_URL} (branch: master)"
git push -u origin master
popd >/dev/null

echo "[OK] Wiki published."
