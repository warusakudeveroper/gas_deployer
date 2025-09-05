# 利用ガイド（基本操作）

推奨フロー: `get` → `update` → `run` → `version` → `depl:update`

- 取得: `gas-admin get <scriptId?>`
- 更新（全置換）: `gas-admin update <scriptId?> files.json`
- 実行（デバッグ）: `gas-admin run <scriptId?> <func> '[args JSON]'`
- バージョン作成: `gas-admin version <scriptId?> "desc"`
- バージョン一覧: `gas-admin versions:list <scriptId?>`
- デプロイ新規: `gas-admin deploy <scriptId?> <version> "desc"`
- デプロイ差替: `gas-admin depl:update <scriptId?> <deploymentId> <version> "desc"`

トリガー/プロパティ（AdminShim 必須）

- シム導入: `gas-admin shim:ensure <scriptId?>`
- トリガー: `trig:list|add|del`
- プロパティ: `prop:list|set|del`

詳細はリポジトリ内: `obsidian_gas_deployer/利用ガイド.md`

