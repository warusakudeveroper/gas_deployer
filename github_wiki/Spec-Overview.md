# 仕様（概要）

管理プロキシ（GAS Web アプリ）が単一の `POST …/exec` を提供し、以下を実行します。

- getContent / updateContent（全置換）
- createVersion / listVersions
- createDeployment / listDeployments / updateDeployment / undeploy
- run（scripts.run のログ/例外を正規化して返却）
- AdminShim 経由で triggers/properties を操作

共通フォーマット（レスポンス）: `{ok,data,error,logs,meta}`

CLI コマンド対応（例）

- whoami → ping
- get → getContent
- update → updateContent
- version → createVersion
- versions:list → listVersions
- deploy → createDeployment
- depl:list → listDeployments
- depl:update → updateDeployment
- trig:* / prop:* → AdminShim 経由

詳細はリポジトリ内の段階化仕様を参照：

- `obsidian_gas_deployer/draft/仕様書/01_全体概要.md`
- `obsidian_gas_deployer/draft/仕様書/02_詳細要件.md`
- `obsidian_gas_deployer/draft/仕様書/03_基本設計.md`
- `obsidian_gas_deployer/draft/仕様書/04_詳細設計.md`
- `obsidian_gas_deployer/draft/仕様書/99_付録.md`

