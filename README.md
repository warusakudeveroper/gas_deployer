# GAS Deployer (CLI-driven GAS CI/CD)

This repository provides a minimal yet complete workflow to manage Google Apps Script (GAS) projects from local CLIs (Codex CLI, gemini CLI, ClaudeCode, etc.). It exposes a single GAS Web App endpoint (“management proxy”) that performs:

- Source get/update (full-replace)
- Versions create/list
- Deployments create/list/update/delete
- Function run with logs and normalized errors
- Triggers/Properties operations via AdminShim

The design targets easy onboarding and robust, scriptId-scoped authorization for local AI/CLI-driven CI/CD.

## Quick Links

- 導入ガイド (easy onboarding): `docs/導入ガイド.md`
- 利用ガイド (everyday usage): `docs/利用ガイド.md`
- 仕様書（段階化）: `docs/draft/仕様書/`
  - 01_全体概要, 02_詳細要件, 03_基本設計, 04_詳細設計, 99_付録, DEV_TODO

## What’s in here

- GAS Web App (management proxy)
  - `code/gas_web_proxy/Code.gs`
  - `code/gas_web_proxy/appsscript.json`
- AdminShim for target GAS
  - `code/admin_shim/AdminShim.gs`
- Local CLI (gas-admin compatible; extended)
  - `code/cli/cli.js`
  - `code/cli/package.json`

## Quickstart (Owner-Proxy mode, easiest)

1) Create a new GAS project → paste `appsscript.json` and `Code.gs` → deploy as Web App.
2) In `Code.gs`, set `CONFIG.ENABLE_GUARD = true`, a strong `TOKEN`, and an `ALLOW` list of scriptIds.
3) Copy the Web App URL (`…/exec`).
4) Install CLI: `cd code/cli && npm i && chmod +x cli.js && npm link`.
5) Configure: `gas-admin setup` → enter endpoint and token.
6) Test: `gas-admin whoami`, `gas-admin get <scriptId>`, `gas-admin shim:ensure <scriptId>`.

## CLI Commands

- whoami / get / update / run / version / versions:list
- deploy / depl:list / depl:update
- shim:ensure
- trig:list|add|del, prop:list|set|del

See `obsidian_gas_deployer/利用ガイド.md` for step-by-step usage and troubleshooting.

## Security

- Owner-Proxy (recommended for local CLIs): one strong token + allowlist on the server (GAS Web App).
- User-Session mode is also supported but requires Google login session handling.

## Contributing / Roadmap

- See DEV_TODO in `obsidian_gas_deployer/draft/仕様書/DEV_TODO.md`.
- Planned: optional exponential backoff in CLI; richer diff/merge helpers before updateContent.

## License

Proprietary/internal unless specified otherwise by the repository owner.
