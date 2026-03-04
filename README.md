<!-- フロント -->

npm run dev:filter --filter=based-template-app

<!-- バック -->

npm run uv:dev:filter --uvdev=based-template-svc

npm run uv:lint:filter --uvdev=based-template-svc
npm run uv:format:filter --uvdev=based-template-svc

python -m pip install パッケージ名

<!-- マイグレーション -->

cd .\python\domain\based-template-svc\

uv run alembic revision -m "変更内容" --autogenerate

<!-- 新テナント作成 -->

コマンド：.\onboard_tenant.ps1 -TenantName "based-template"

1. identity platform(dev, stg, prod)にテナントを作成
2. apps\based-appをコピー
3. コピーしたディレクトリの名前をapps\tenant_name-appに変更
4. apps\tenant_name-app\dockerfileを編集：ディレクトリのパスを修正
5. apps\tenant_name-app\package.jsonを編集：nameの修正
6. python\domain\based-svcをコピー
7. コピーしたディレクトリの名前をpython\domain\tenant_nameに変更
8. python\domain\tenant_name\dockerfileを編集：ディレクトリのパスを修正
9. python\domain\tenant_name-svc\pyproject.tomlを編集：nameの修正

SQLのDB作成(dev, stg, prod)：テナント名\_{env}\_db 10. infra\services.jsonにテナント情報を追記11. scripts\gen_service_infra.pyを実行12. scripts\gen_openapi.pyにテナントのパスを追記13. npm run gen:openapi:allを実行

<!-- 新テナント作成 -->

<!-- シークレットマネージャーはテラフォームで作成し、中身は手動 -->

新環境デプロイ時メモ
・package.jsonが、UTF-8BOMみたいな形式で保存されていてエラーが出る可能性があるので、UTF-8で保存するとよい

<!-- 手動作成リソース -->

シークレットマネージャーはテラフォームで作成
dev, stg, prodのシークレットの値

apps\based-template-app\src\lib\firebase.tsのauth.tenantId = process.env.NEXT_PUBLIC_TENANT_ID ?? "based-template-vbf6m";を書き換える
バックエンドのapp.pyとmain.pyを書き換える必要あり

マイグレーションでテーブルの作成(dev, stg, prod)
1人目のuser(dev, stg, prod)：SQL直接

【エラー】
Traceback (most recent call last):
File "C:\Users\zekus\AppData\Local\Google\Cloud SDK\google-cloud-sdk\lib\gcloud.py", line 110, in gcloud_exception_handler
yield
File "C:\Users\zekus\AppData\Local\Google\Cloud SDK\google-cloud-sdk\lib\gcloud.py", line 187, in main
gcloud_main = \_import_gcloud_main()
File "C:\Users\zekus\AppData\Local\Google\Cloud SDK\google-cloud-sdk\lib\gcloud.py", line 90, in \_import_gcloud_main
import googlecloudsdk.gcloud_main
File "C:\Users\zekus\AppData\Local\Google\Cloud SDK\google-cloud-sdk\lib\googlecloudsdk\gcloud_main.py", line 34, in <module>
from googlecloudsdk.calliope import base
File "C:\Users\zekus\AppData\Local\Google\Cloud SDK\google-cloud-sdk\lib\googlecloudsdk\calliope\base.py", line 32, in <module>
from googlecloudsdk.calliope import arg_parsers
File "C:\Users\zekus\AppData\Local\Google\Cloud SDK\google-cloud-sdk\lib\googlecloudsdk\calliope\arg_parsers.py", line 64, in <module>  
 from googlecloudsdk.core import log
File "C:\Users\zekus\AppData\Local\Google\Cloud SDK\google-cloud-sdk\lib\googlecloudsdk\core\log.py", line 32, in <module>
from googlecloudsdk.core import properties
File "C:\Users\zekus\AppData\Local\Google\Cloud SDK\google-cloud-sdk\lib\googlecloudsdk\core\properties.py", line 29, in <module>  
 from googlecloudsdk.core import config
File "C:\Users\zekus\AppData\Local\Google\Cloud SDK\google-cloud-sdk\lib\ from googlecloudsdk.core import properties
File "C:\Users\zekus\AppData\Local\Google\Cloud SDK\google-cloud-sdk\lib\googlecloudsdk\core\properties.py", line 29, in <module> に失敗しまし
from googlecloudsdk.core import config
g.py", line 25, in <module>
import sqlite3
ModuleNotFoundError: No module named 'sqlite3'
gcloud auth application-default login に失敗しました。(exit=1)

$env:CLOUDSDK_PYTHON="C:\Users\zekus\scoop\apps\python\current\python.exe";

cd .\python\domain\based-template-svc\
uv run alembic revision -m "メッセージ（追加した内容など）" --autogenerate

2025/10/04
devにつなげてマイグレーションを実行するべき

2025/10/06
cloud storage署名url
signerのサービスアカウントのプリンシパルの
cd-exec@doppel-dev-461016.iam.gserviceaccount.comこれに、
サービスアカウント トークン作成者を追記

% エディタでタブ開いているとエラーが出たりする。
.\onboard_unified.ps1 -TenantName doshisha,freeplay,goda-kanko-shoji,imjp,kitepro,mitradata,miyakoya,toshibatec,tp-prime-members,vertex-e,vertex-p,b-lightgroup,adviser-ai -SyncCodeOnly -ForceDeleteExisting

2025/12/08
401エラーでログインできない場合、IPチェックが先に走ってしまっている可能性がある

2026/01/24
スマホ開発の時は、index.htmlに埋め込むスクリプトも、ip v4のホストにしないといけない

% 2026/02/05
.\onboard_unified.ps1 -TenantName doshisha,freeplay,goda-kanko-shoji,imjp,kitepro,mitradata,miyakoya,toshibatec,tp-prime-members,vertex-e,vertex-p,adviser-ai,astecpaints -SyncCodeOnly -ForceDeleteExisting

% モック作成コマンド
npm run uv:create:mock --group-id=d6764fe5-87bb-41e6-b43d-7b1955d9385f
