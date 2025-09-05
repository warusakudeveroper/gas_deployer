---
title: 開発 TODO（CLI主導のGAS CI/CD）
status: wip
owner: あなた
---

# 0. スコープ

- ローカル CLI（Codex/gemini/ClaudeCode 等）から、単一 Web エンドポイント経由で GAS の取得・更新・実行・バージョン・デプロイ・トリガー・プロパティを操作できること。

# 1. 管理プロキシ（GAS Web アプリ）

- [ ] appsscript.json に必要スコープ追加（projects/deployments/scriptapp/external_request/drive.readonly）
- [ ] Code.gs：共通 HTTP（fetchJson_）と OAuth（getBearer_）
- [ ] api.getContent / updateContent / createVersion / listVersions / createDeployment / listDeployments / updateDeployment / undeploy / run
- [ ] normalizeRunResult_（scripts.run の統一レスポンス）
- [ ] ensureAdminShim_（AdminShim 未導入時の安全注入; 競合時は ERR_ADMIN_SHIM_CONFLICT）
- [ ] ルーター handle_ に全メソッド追加（ensureAdminShim/listVersions 含む）
- [ ] doPost/doGet 実装（B案: X-Admin-Token + Allowlist ガード; 設定で有効化）
- [ ] レスポンス統一（全メソッド {ok,data,error,logs,meta} で返す）

# 2. AdminShim（対象GAS）

- [ ] admin_listTriggers / admin_createTimeTrigger / admin_deleteTriggerByFunction
- [ ] admin_listProperties / admin_setProperties / admin_deleteProperty
- [ ] pickStore_('script'|'user'|'document')
- [ ] 依存権限の初回承認（注意書き）

# 3. CLI（gas-admin 互換）

- [ ] 設定: プロファイル保存（endpoint / mode / adminToken / defaultScriptId）
- [ ] コマンド: whoami/get/update/run/version/deploy/depl:list/depl:update
- [ ] コマンド: versions:list（新規）
- [ ] コマンド: shim:ensure（新規; ensureAdminShim 呼出）
- [ ] コマンド: trig:list|add|del / prop:list|set|del
- [ ] Owner-Proxy モード時、adminToken を JSON ボディに付加（{adminToken}）
- [ ] 429/5xx の指数バックオフ（最大3回; 任意）

# 4. 動作確認（最小通し）

- [ ] Web アプリをデプロイ（Owner-Proxy で試験; Token/Allowlist 設定）
- [ ] gas-admin setup → whoami → get
- [ ] versions:list が versions[] を返す
- [ ] shim:ensure が injected:true（初回）→ false（2回目）
- [ ] update（HTML含む）→ run(devMode:true) でログ・エラーが取得できる
- [ ] version → depl:list → depl:update で公開差し替え

# 5. ドキュメント

- [ ] 仕様書の API と CLI マッピングの整合
- [ ] セットアップ手順の更新（クイックスタート 5ステップ）

