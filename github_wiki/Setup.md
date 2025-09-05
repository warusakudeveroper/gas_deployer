# 導入ガイド（かんたん版）

この手順で、GAS の Web アプリ（管理プロキシ）を作り、ローカル CLI から操作できるようにします。

1) 新規 GAS プロジェクト作成 → `appsscript.json` を設定（scopes あり）
2) `Code.gs`（管理プロキシ本体）を貼り付け → ウェブアプリとしてデプロイ
3) （推奨）`CONFIG.ENABLE_GUARD=true`、強い `TOKEN`、`ALLOW` に許可する scriptId を設定
4) URL（…/exec）を控える
5) CLI セットアップ: `cd code/cli && npm i && chmod +x cli.js && npm link`
6) `gas-admin setup` → endpoint と token を登録
7) `gas-admin whoami` / `gas-admin get <scriptId>` / `gas-admin shim:ensure <scriptId>` で確認

詳細はリポジトリ内: `obsidian_gas_deployer/導入ガイド.md`

