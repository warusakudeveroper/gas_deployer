# トラブルシューティング

- 401/403（認証・権限）
  - Webアプリの「実行者/アクセス権」設定、CONFIG（TOKEN/ALLOW）、共有設定を確認
- Missing required param
  - コマンドの引数や files.json の形式を確認
- ERR_ADMIN_SHIM_MISSING / CONFLICT
  - `gas-admin shim:ensure`、競合時は既存 AdminShim を確認
- 更新後にファイルが消えた
  - `update` は全置換。バックアップ→差分マージ→更新の順を徹底
- レート制限
  - 少し待って再実行。大量処理は間隔を空ける

詳しくは `obsidian_gas_deployer/利用ガイド.md` を参照。

