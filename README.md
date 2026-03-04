【第1部】プレディクティブコール SaaS システム 要件定義書

1. システム概要
   本システムは、アウトバウンドコール業務の効率を最大化するためのSaaS型プレディクティブダイヤラーシステムです。システムが自動で顧客リストへ発信し、人間が応答した通話のみを待機中のオペレーターに接続します。

2. 技術スタック
   フロントエンド: Next.js (App Router推奨), React, Tailwind CSS

バックエンド: FastAPI (Python), WebSocket (リアルタイム通信用)

データベース: MySQL (ORM: SQLAlchemy)

認証基盤: Google OAuth (NextAuth.js / Auth.js または FastAPI側でのトークン検証)

テレフォニー/通信: Twilio (Programmable Voice, TaskRouter, Answering Machine Detection)

非同期処理/キュー: Redis + Celery または RQ (プレディクティブエンジンの発信ループとキューイング用)

3. ユーザーロール
   システム管理者 (System Admin): SaaS全体の管理、テナント（契約企業）の管理。

テナント管理者 (Tenant Admin): 自社のオペレーター管理、架電リストのアップロード、レポートの閲覧。

オペレーター (Agent): 架電業務の実行、通話結果の入力。

4. 機能要件
   4.1. 認証・認可機能
   Googleアカウントを利用したシングルサインオン (SSO)。

ロールベースのアクセス制御 (RBAC)。
