#==============================================================================
# DOPPEL テナント オンボーディング（統合版・複数テナント対応・完全版）
# - 0: 1〜7 で作成したコードの削除（安全な巻き戻し）
# - 1〜7: 各テナントでコード同期（FE/BE ディレクトリ作成、設定更新、Dockerfile生成）
# - 8〜11: フル実行時のみ各テナントで実行（Identity Platform / Cloud SQL / services.json / infra / gen_openapi.py）
# - 12: 1回だけ実行（npm run gen:openapi:all）
# - 13: 各テナントで実行（フロントの import 書換）
#
# 使い方:
#   # アップデート時に使用（※インフラ系はスキップするので、テーブルが書き変わる変更をしたときは注意）
#   # コード同期のみ（1〜7 → 12 → 13）
#   .\onboard_unified.ps1 -TenantName t1,t2,t3 -SyncCodeOnly -ForceDeleteExisting
#
#   # 新規テナント作成時に使用
#   # フル実行（1〜7 → 8〜11 → 12 → 13）
#   .\onboard_unified.ps1 -TenantName foo,bar
#
#   # 1〜7 で作成したコードのみ削除（FE/BE ディレクトリ削除 + ルート pyproject.toml の members から該当行を削除）
#   .\onboard_unified.ps1 -TenantName foo,bar -DeleteCodeOnly
#==============================================================================

param (
    [Parameter(Mandatory=$true, HelpMessage="Enter one or more tenant names.")]
    [string[]]$TenantName,

    # 1〜7 → 12(1回) → 13 だけ実行して終了
    [switch]$SyncCodeOnly,

    # 1〜7 の生成物を削除して終了（FE/BE ディレクトリ、ルート pyproject.toml の members エントリ）
    [switch]$DeleteCodeOnly,

    # 既存 apps/<tenant>-app, python/domain/<tenant>-svc があれば確認なしで削除
    [switch]$ForceDeleteExisting
)

# ---------------- 共通設定 ----------------
$TEMPLATE_TENANT_NAME          = "based-template"

$FRONTEND_TEMPLATE_DIR         = "apps\${TEMPLATE_TENANT_NAME}-app"
$BACKEND_TEMPLATE_DIR          = "python\domain\${TEMPLATE_TENANT_NAME}-svc"
$FRONTEND_DOCKERFILE_TEMPLATE  = "frontend.dockerfile.template"
$BACKEND_DOCKERFILE_TEMPLATE   = "backend.dockerfile.template"

$FRONTEND_PLACEHOLDER          = "__FRONTEND_APP_NAME__"
$BACKEND_PLACEHOLDER           = "__BACKEND_APP_NAME__"

$PYTHON_ROOT_PYPROJECT_PATH    = "python\pyproject.toml"
$SERVICES_JSON_PATH            = "infra\services.json"
$GEN_OPENAPI_PY_PATH           = "scripts\gen_openapi.py"

# GCP プロジェクトと Cloud SQL インスタンス（元スクリプト準拠）
$PROJECT_IDS = @(
    "doppel-dev-461016",
    "doppel-stg",
    "doppel-prod"
)
$SQL_INSTANCES = @{
    "dev"  = @{ project="doppel-dev-461016"; instance="doppel-dev-mysql-primary"  }
    "stg"  = @{ project="doppel-stg";        instance="doppel-stg-mysql-primary"  }
    "prod" = @{ project="doppel-prod";       instance="doppel-prod-mysql-primary" }
}

# ---------------- 小道具：IO ----------------
function Read-TextUtf8NoBom([string]$Path) {
    return [System.IO.File]::ReadAllText($Path, [System.Text.UTF8Encoding]::new($false))
}
function Write-TextUtf8NoBom([string]$Path, [string]$Content) {
    [System.IO.File]::WriteAllText($Path, $Content, [System.Text.UTF8Encoding]::new($false))
}

# ---------------- gcloud / ADC / Token ----------------
function Ensure-GcloudADC {
    if ($SyncCodeOnly) {
        Write-Host -ForegroundColor Yellow "ADC チェックはスキップします (-SyncCodeOnly)。"
        return
    }
    Write-Host -NoNewline "ADC を確認しています... "
    try {
        $null = & gcloud --version | Out-Null
    } catch {
        throw "gcloud が見つかりません。PATH を確認してください。"
    }

    $token = & gcloud auth application-default print-access-token 2>$null
    if (-not [string]::IsNullOrWhiteSpace($token)) {
        Write-Host -ForegroundColor Green "OK"
        return
    }

    Write-Host -ForegroundColor Yellow "未ログインです。ブラウザで ADC ログインを開始します..."
    & gcloud auth application-default login
    if ($LASTEXITCODE -ne 0) { throw "ADC ログインに失敗しました。(exit=$LASTEXITCODE)" }

    $token = & gcloud auth application-default print-access-token 2>$null
    if ([string]::IsNullOrWhiteSpace($token)) {
        throw "ADC のアクセストークン取得に失敗しました。"
    }
    Write-Host -ForegroundColor Green "OK"
}

function Get-AccessToken {
    # 1) 通常の gcloud ユーザーログインで取得
    $t1 = & gcloud auth print-access-token 2>$null
    if (-not [string]::IsNullOrWhiteSpace($t1)) {
        return $t1.Trim()
    }

    # 2) ADC から取得
    $t2 = & gcloud auth application-default print-access-token 2>$null
    if (-not [string]::IsNullOrWhiteSpace($t2)) {
        return $t2.Trim()
    }

    throw "gcloud からアクセストークンを取得できませんでした。`gcloud auth login` または `gcloud auth application-default login` を確認してください。"
}

# ---------------- 0: 1〜7で作成されたコードの削除（各テナント） ----------------
function Step0_DeleteGeneratedCode([string]$Tenant) {
    $frontendDir = "apps\${Tenant}-app"
    $backendDir  = "python\domain\${Tenant}-svc"

    # Frontend dir deletion
    if (Test-Path $frontendDir) {
        $deleteFe = $true
        if (-not $ForceDeleteExisting) {
            $ans = Read-Host "[$Tenant] '$frontendDir' を削除しますか？ (y/N)"
            if ($ans -notin @('y','Y')) { $deleteFe = $false }
        }
        if ($deleteFe) {
            try {
                Remove-Item -Path $frontendDir -Recurse -Force
                Write-Host -ForegroundColor Green "[$Tenant] フロントエンドを削除しました: $frontendDir"
            } catch {
                Write-Host -ForegroundColor Red "[$Tenant] フロントエンド削除に失敗: $($_.Exception.Message)"
                throw
            }
        } else {
            Write-Host -ForegroundColor Yellow "[$Tenant] フロントエンド削除をスキップしました。"
        }
    } else {
        Write-Host -ForegroundColor Yellow "[$Tenant] フロントエンドは存在しません: $frontendDir"
    }

    # Backend dir deletion
    if (Test-Path $backendDir) {
        $deleteBe = $true
        if (-not $ForceDeleteExisting) {
            $ans = Read-Host "[$Tenant] '$backendDir' を削除しますか？ (y/N)"
            if ($ans -notin @('y','Y')) { $deleteBe = $false }
        }
        if ($deleteBe) {
            try {
                Remove-Item -Path $backendDir -Recurse -Force
                Write-Host -ForegroundColor Green "[$Tenant] バックエンドを削除しました: $backendDir"
            } catch {
                Write-Host -ForegroundColor Red "[$Tenant] バックエンド削除に失敗: $($_.Exception.Message)"
                throw
            }
        } else {
            Write-Host -ForegroundColor Yellow "[$Tenant] バックエンド削除をスキップしました。"
        }
    } else {
        Write-Host -ForegroundColor Yellow "[$Tenant] バックエンドは存在しません: $backendDir"
    }

    # Remove from root python/pyproject.toml members
    if (Test-Path $PYTHON_ROOT_PYPROJECT_PATH) {
        try {
            $content = Read-TextUtf8NoBom $PYTHON_ROOT_PYPROJECT_PATH
            $entry = "domain/${Tenant}-svc"
            $pattern = '^(?m)\s*"' + [regex]::Escape($entry) + '"\s*,?\s*$'
            $updatedContent = [System.Text.RegularExpressions.Regex]::Replace($content, $pattern, "", [System.Text.RegularExpressions.RegexOptions]::Multiline)

            if ($updatedContent -ne $content) {
                Write-TextUtf8NoBom $PYTHON_ROOT_PYPROJECT_PATH $updatedContent
                Write-Host -ForegroundColor Green "[$Tenant] ルート pyproject.toml から members エントリを削除しました: \"$entry\""
            } else {
                Write-Host -ForegroundColor Yellow "[$Tenant] ルート pyproject.toml に対象エントリが見つかりませんでした: \"$entry\""
            }
        } catch {
            Write-Host -ForegroundColor Red "[$Tenant] ルート pyproject.toml の更新に失敗: $($_.Exception.Message)"
            throw
        }
    } else {
        Write-Host -ForegroundColor Yellow "[$Tenant] ルート pyproject.toml が見つかりません: $PYTHON_ROOT_PYPROJECT_PATH"
    }
}

# ---------------- Identity Platform API（元ロジック移植） ----------------
function New-IdentityPlatformTenant {
    param(
        [Parameter(Mandatory=$true)][string]$ProjectId,
        [Parameter(Mandatory=$true)][string]$DisplayName
    )
    try {
        $accessToken = Get-AccessToken
    }
    catch {
        throw "gcloudからのアクセストークン取得に失敗しました。`gcloud auth login` または `gcloud auth application-default login` を実行してください。"
    }

    $uri   = "https://identitytoolkit.googleapis.com/v2/projects/$ProjectId/tenants"
    $body = @{ displayName = $DisplayName } | ConvertTo-Json -Compress

    try {
        $response = Invoke-RestMethod -Method Post -Uri $uri -Headers @{
            "Authorization"       = "Bearer $accessToken"
            "Content-Type"        = "application/json"
            "x-goog-user-project" = $ProjectId
        } -Body $body

        $tenantId = ($response.name -split "/")[-1]
        return $tenantId
    }
    catch {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $streamReader = New-Object System.IO.StreamReader($errorResponse)
        $errorBody = $streamReader.ReadToEnd()
        $streamReader.Close()
        throw "Identity Platform テナント作成に失敗しました。: $($errorBody)"
    }
}

function Find-IdentityPlatformTenantByName {
    param(
        [Parameter(Mandatory=$true)][string]$ProjectId,
        [Parameter(Mandatory=$true)][string]$DisplayName
    )
    try {
        $accessToken = Get-AccessToken
    }
    catch {
        throw "gcloudからのアクセストークン取得に失敗しました。`gcloud auth login` または `gcloud auth application-default login` を実行してください。"
    }

    $uri = "https://identitytoolkit.googleapis.com/v2/projects/$ProjectId/tenants?pageSize=1000"

    try {
        $response = Invoke-RestMethod -Method Get -Uri $uri -Headers @{
            "Authorization"       = "Bearer $accessToken"
            "Content-Type"        = "application/json"
            "x-goog-user-project" = $ProjectId
        }

        $foundTenant = $response.tenants | Where-Object { $_.displayName -eq $DisplayName } | Select-Object -First 1

        if ($foundTenant) {
            return ($foundTenant.name -split "/")[-1]
        } else {
            return $null
        }
    }
    catch {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $streamReader = New-Object System.IO.StreamReader($errorResponse)
        $errorBody = $streamReader.ReadToEnd()
        $streamReader.Close()
        throw "Identity Platform テナントの検索に失敗しました。: $($errorBody)"
    }
}

# ---------------- 1〜7: コード同期（各テナント） ----------------
function Step1_CopyFrontend([string]$Tenant) {
    $newFrontendDir = "apps\${Tenant}-app"
    if (Test-Path $newFrontendDir) {
        if ($ForceDeleteExisting) {
            Remove-Item -Path $newFrontendDir -Recurse -Force
        } else {
            $ans = Read-Host "[$Tenant] '$newFrontendDir' が存在します。削除して続行しますか？ (y/N)"
            if ($ans -notin @('y','Y')) { throw "[$Tenant] フロントのコピーを中止しました。" }
            Remove-Item -Path $newFrontendDir -Recurse -Force
        }
    }
    New-Item -ItemType Directory -Path $newFrontendDir -Force | Out-Null
    $robocopyResult = robocopy ".\$FRONTEND_TEMPLATE_DIR" $newFrontendDir /E /NFL /NDL /NJH /NJS /NC /NS /NP
    if ($robocopyResult -gt 7) { throw "[$Tenant] フロントエンドディレクトリのコピーに失敗しました (robocopy=$robocopyResult)。" }
}

function Step2_UpdateFrontendPackageJson([string]$Tenant) {
    $newFrontendDir = "apps\${Tenant}-app"
    $packageJsonPath = Join-Path $newFrontendDir 'package.json'
    if (-not (Test-Path $packageJsonPath)) { Write-Host -ForegroundColor Yellow "[$Tenant] package.json が見つからないためスキップ"; return }
    $content = Read-TextUtf8NoBom $packageJsonPath
    $pkg = $content | ConvertFrom-Json
    $pkg.PSObject.Properties['name'].Value = "${Tenant}-app"
    Write-TextUtf8NoBom $packageJsonPath ($pkg | ConvertTo-Json -Depth 10)
}

function Step3_CopyBackend([string]$Tenant) {
    $newBackendDir = "python\domain\${Tenant}-svc"
    if (Test-Path $newBackendDir) {
        if ($ForceDeleteExisting) {
            Remove-Item -Path $newBackendDir -Recurse -Force
        } else {
            $ans = Read-Host "[$Tenant] '$newBackendDir' が存在します。削除して続行しますか？ (y/N)"
            if ($ans -notin @('y','Y')) { throw "[$Tenant] バックエンドのコピーを中止しました。" }
            Remove-Item -Path $newBackendDir -Recurse -Force
        }
    }
    New-Item -ItemType Directory -Path $newBackendDir -Force | Out-Null
    $robocopyResult = robocopy ".\$BACKEND_TEMPLATE_DIR" $newBackendDir /E /NFL /NDL /NJH /NJS /NC /NS /NP /XD ".venv"
    if ($robocopyResult -gt 7) { throw "[$Tenant] バックエンドディレクトリのコピーに失敗しました (robocopy=$robocopyResult)。" }
}

function Step4_UpdateBackendPyProject([string]$Tenant) {
    $newBackendDir = "python\domain\${Tenant}-svc"
    $backendPyProjectPath = Join-Path $newBackendDir 'pyproject.toml'
    if (-not (Test-Path $backendPyProjectPath)) { Write-Host -ForegroundColor Yellow "[$Tenant] backend pyproject.toml が見つからないためスキップ"; return }
    $content = Read-TextUtf8NoBom $backendPyProjectPath
    $templateBackendName = "${TEMPLATE_TENANT_NAME}-svc"
    $updatedContent = $content -replace "name\s*=\s*`"$templateBackendName`"", ('name = "{0}"' -f "${Tenant}-svc")
    Write-TextUtf8NoBom $backendPyProjectPath $updatedContent
}

function Step5_UpdateRootMembers([string]$Tenant) {
    if (-not (Test-Path $PYTHON_ROOT_PYPROJECT_PATH)) { Write-Host -ForegroundColor Yellow "[$Tenant] ルート pyproject.toml が見つからないためスキップ"; return }
    $content = Read-TextUtf8NoBom $PYTHON_ROOT_PYPROJECT_PATH
    $newMemberEntry = "domain/${Tenant}-svc"
    if ($content -match [regex]::Escape('"' + $newMemberEntry + '"')) { Write-Host -ForegroundColor Yellow "[$Tenant] 既に members に存在します"; return }

    $lines = [System.Collections.ArrayList]@($content -split "`r?`n")
    $inMembersSection = $false
    $insertionIndex = -1
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match '^\s*members\s*=\s*\[') { $inMembersSection = $true }
        if ($inMembersSection -and $lines[$i] -match '^\s*\]') {
            $insertionIndex = $i
            break
        }
    }
    if ($insertionIndex -eq -1) { throw "[$Tenant] members セクションの終端 ']' が見つかりません。" }
    $lines.Insert($insertionIndex, ('     "{0}",' -f $newMemberEntry))
    $updatedContent = $lines -join "`n"
    Write-TextUtf8NoBom $PYTHON_ROOT_PYPROJECT_PATH $updatedContent
}

function Step6_GenerateFrontendDockerfile([string]$Tenant) {
    $newFrontendDir = "apps\${Tenant}-app"
    if (-not (Test-Path $FRONTEND_DOCKERFILE_TEMPLATE)) { throw "[$Tenant] フロント Dockerfile テンプレートが見つかりません: $FRONTEND_DOCKERFILE_TEMPLATE" }
    $frontendTemplateContent = Read-TextUtf8NoBom $FRONTEND_DOCKERFILE_TEMPLATE
    $frontendDockerContent = $frontendTemplateContent.replace($FRONTEND_PLACEHOLDER, "${Tenant}-app")
    Write-TextUtf8NoBom (Join-Path $newFrontendDir 'dockerfile') $frontendDockerContent
}

function Step7_GenerateBackendDockerfile([string]$Tenant) {
    $newBackendDir = "python\domain\${Tenant}-svc"
    if (-not (Test-Path $BACKEND_DOCKERFILE_TEMPLATE)) { throw "[$Tenant] バックエンド Dockerfile テンプレートが見つかりません: $BACKEND_DOCKERFILE_TEMPLATE" }
    $backendTemplateContent = Read-TextUtf8NoBom $BACKEND_DOCKERFILE_TEMPLATE
    $backendDockerContent = $backendTemplateContent.replace($BACKEND_PLACEHOLDER, "${Tenant}-svc")
    Write-TextUtf8NoBom (Join-Path $newBackendDir 'dockerfile') $backendDockerContent
}

# ---------------- 8〜11: フル実行時のみ（各テナント） ----------------
function Step8_FindOrCreateIdentityTenant([string]$Tenant) {
    Write-Host "8. Identity Platformのテナントを環境ごとに確認または作成しています... (Tenant=$Tenant)"
    $tenantIdsByProject = @{}

    foreach ($ProjectId in $PROJECT_IDS) {
        Write-Host ""
        Write-Host "   [$ProjectId] テナント名「$Tenant」を調査中..."

        try {
            $existingTenantId = Find-IdentityPlatformTenantByName -ProjectId $ProjectId -DisplayName $Tenant
        }
        catch {
            Write-Host -ForegroundColor Red "   -> 調査に失敗: $($_.Exception.Message)"
            continue
        }

        if ($existingTenantId) {
            Write-Host -ForegroundColor Yellow "   -> 既に存在します。テナントID: $existingTenantId"
            $tenantIdsByProject[$ProjectId] = $existingTenantId
            continue
        }

        $answer = Read-Host "   -> 見つかりません。新規作成しますか？ (Y/n)"
        if ([string]::IsNullOrWhiteSpace($answer) -or $answer -match '^[Yy]$') {
            try {
                Write-Host -NoNewline "   -> 作成中... "
                $newTenantId = New-IdentityPlatformTenant -ProjectId $ProjectId -DisplayName $Tenant
                Write-Host -ForegroundColor Green "完了。テナントID: $newTenantId"
                $tenantIdsByProject[$ProjectId] = $newTenantId
            }
            catch {
                Write-Host -ForegroundColor Red "`n   -> 作成に失敗: $($_.Exception.Message)"
            }
        }
        else {
            Write-Host -ForegroundColor Yellow "   -> 作成をスキップしました。"
        }
    }

    if ($tenantIdsByProject.Count -gt 0) {
        Write-Host ""
        Write-Host -ForegroundColor Cyan "   -> 確認/作成結果サマリ:"
        foreach ($kvp in $tenantIdsByProject.GetEnumerator()) {
            Write-Host -ForegroundColor Cyan ("       {0} : {1}" -f $kvp.Key, $kvp.Value)
        }
    }
    else {
        Write-Host -ForegroundColor Yellow "   -> テナントの確認/作成結果はありませんでした。"
    }

    $devProjectId = "doppel-dev-461016"
    $primaryTenantId = $null
    if ($tenantIdsByProject.ContainsKey($devProjectId)) {
        $primaryTenantId = $tenantIdsByProject[$devProjectId]
    } elseif ($tenantIdsByProject.Count -gt 0) {
        $primaryTenantId = ($tenantIdsByProject.Values | Select-Object -First 1)
    }

    if ($primaryTenantId) {
        Write-Host -ForegroundColor Cyan "   -> 後続ステップで使用するテナントID: $primaryTenantId"
    } else {
        Write-Host -ForegroundColor Yellow "   -> テナントIDが取得できなかったため、services.jsonの更新は一部スキップされる可能性があります。"
    }

    return @{ tenantIdsByProject = $tenantIdsByProject; primaryTenantId = $primaryTenantId }
}

function Step9A_EnsureCloudSqlDatabases([string]$Tenant) {
    function Ensure-CloudSqlDatabase {
        param(
            [Parameter(Mandatory=$true)][string]$ProjectId,
            [Parameter(Mandatory=$true)][string]$InstanceId,
            [Parameter(Mandatory=$true)][string]$DbName,
            [string]$Charset = "utf8mb4",
            [string]$Collation = "utf8mb4_0900_ai_ci"
        )
        try {
            $existing = (& gcloud sql databases list `
                --project $ProjectId `
                --instance $InstanceId `
                --format="value(name)")
            $names = @()
            if ($existing) { $names = $existing -split "`r?`n" }

            if ($names -contains $DbName) {
                Write-Host -ForegroundColor Yellow "   -> [$ProjectId/$InstanceId] データベース '$DbName' は既に存在します。スキップします。"
                return
            }

            $answer = Read-Host "   -> [$ProjectId/$InstanceId] データベース '$DbName' を作成しますか？ (Y/n)"
            if ([string]::IsNullOrWhiteSpace($answer) -or $answer -match '^[Yy]$') {
                Write-Host -NoNewline "      -> 作成中... (charset=$Charset, collation=$Collation) "
                & gcloud sql databases create $DbName `
                    --project $ProjectId `
                    --instance $InstanceId `
                    --charset $Charset `
                    --collation $Collation | Out-Null
                if ($LASTEXITCODE -ne 0) {
                    throw "gcloud がエラーコード $LASTEXITCODE で終了しました。"
                }
                Write-Host -ForegroundColor Green "完了"
            } else {
                Write-Host -ForegroundColor Yellow "      -> 作成をスキップしました。"
            }
        }
        catch {
            Write-Host -ForegroundColor Red "失敗: $($_.Exception.Message)"
            throw
        }
    }

    # DB名生成（小文字化＋ハイフン等→アンダースコア）
    $DbNameBase = ($Tenant.ToLower() -replace '[-]', '_' -replace '[^a-z0-9_]', '_')
    $DbName_dev  = "${DbNameBase}_dev_db"
    $DbName_stg  = "${DbNameBase}_stg_db"
    $DbName_prod = "${DbNameBase}_prod_db"

    Write-Host "9-A. Cloud SQL データベースの作成を開始します... (Tenant=$Tenant)"
    Write-Host "   -> DB名プレビュー:"
    Write-Host "      - dev : $DbName_dev"
    Write-Host "      - stg : $DbName_stg"
    Write-Host "      - prod: $DbName_prod"

    Ensure-CloudSqlDatabase -ProjectId $SQL_INSTANCES.dev.project  -InstanceId $SQL_INSTANCES.dev.instance  -DbName $DbName_dev
    Ensure-CloudSqlDatabase -ProjectId $SQL_INSTANCES.stg.project  -InstanceId $SQL_INSTANCES.stg.instance  -DbName $DbName_stg
    Ensure-CloudSqlDatabase -ProjectId $SQL_INSTANCES.prod.project -InstanceId $SQL_INSTANCES.prod.instance -DbName $DbName_prod
}

function Step9_UpdateServicesJson([string]$Tenant, $tenantIdsByProject, $primaryTenantId) {
    Write-Host -NoNewline "9. サービス定義を '$SERVICES_JSON_PATH' に追記/更新しています... "
    $services = @()
    if (Test-Path $SERVICES_JSON_PATH) {
        try {
            $content = Read-TextUtf8NoBom $SERVICES_JSON_PATH
            $services = $content | ConvertFrom-Json
            if ($null -eq $services) { $services = @() }
            if ($services -isnot [System.Array]) { $services = @($services) }
        } catch {
            Write-Warning "既存の '$SERVICES_JSON_PATH' は有効なJSONではありません。新しい内容で上書きします。"
            $services = @()
        }
    }

    $newFrontendAppName = "${Tenant}-app"
    $newBackendAppName  = "${Tenant}-svc"

    # 環境ごとのテナントID（見つからなければ primaryTenantId でフォールバック）
    $DevTenantId  = $tenantIdsByProject["doppel-dev-461016"]; if (-not $DevTenantId)  { $DevTenantId  = $primaryTenantId }
    $StgTenantId  = $tenantIdsByProject["doppel-stg"];        if (-not $StgTenantId)  { $StgTenantId  = $primaryTenantId }
    $ProdTenantId = $tenantIdsByProject["doppel-prod"];       if (-not $ProdTenantId) { $ProdTenantId = $primaryTenantId }

    # --- apps エントリ（フロントエンド） ---
    $frontendService = [ordered]@{
        type         = "apps"
        service_name = $newFrontendAppName
        dockerfile   = "apps/$newFrontendAppName/dockerfile"
        envs         = [ordered]@{
            dev  = [ordered]@{
                runtime_project = "doppel-dev-461016"
                build_args = [ordered]@{
                    NEXT_PUBLIC_TENANT_ID            = $DevTenantId
                    NEXT_PUBLIC_API_URL              = "https://$newBackendAppName-1090554569112.asia-northeast1.run.app"
                    NEXT_PUBLIC_SITE_URL             = "https://$newFrontendAppName-1090554569112.asia-northeast1.run.app"
                    NEXT_PUBLIC_FIREBASE_API_KEY     = "AIzaSyB26jmyy9GqgOtkC8NLxfaMir9bFgZXvnw"
                    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = "doppel-dev-461016.firebaseapp.com"
                    NEXT_PUBLIC_LOGO_IMG_URL         = "doppel_logo.png"
                    NEXT_PUBLIC_PRIMARY_COLOR        = "#6366f1"
                    NEXT_PUBLIC_SIDEBAR_COLOR        = "#6366f1"
                    NEXT_PUBLIC_FAVICON              = "doppel.ico"
                    NEXT_PUBLIC_META_TITLE           = "DOPPEL｜自社データ学習型AIチャットボットで業務を自動化"
                    NEXT_PUBLIC_META_DESCRIPTION      = "DOPPEL（ドッペル）は、マニュアルやFAQなどの自社データを学習し、高精度な回答を実現するAIチャットボットです。24時間365日の自動応答で、カスタマーサポートの工数削減や社内のナレッジ共有を効率化。組織の生産性を最大化します。"
                    NEXT_PUBLIC_OG_IMAGE_PATH         = "doppel-og.png"
                }
                exec_account = "cd-exec@doppel-dev-461016.iam.gserviceaccount.com"
                network = [ordered]@{
                    vpc_access_egress   = "all-traffic"
                    network_interfaces  = "[{`"network`":`"projects/mitra-shared-network/global/networks/mitra-vpc-main-shared`",`"subnetwork`":`"projects/mitra-shared-network/regions/asia-northeast1/subnetworks/mitra-subnet-dev-tokyo-doppel-frontend`"}]"
                }
            }
            stg  = [ordered]@{
                runtime_project = "doppel-stg"
                build_args = [ordered]@{
                    NEXT_PUBLIC_TENANT_ID            = $StgTenantId
                    NEXT_PUBLIC_API_URL              = "https://$newBackendAppName-638194985906.asia-northeast1.run.app"
                    NEXT_PUBLIC_SITE_URL             = "https://$newFrontendAppName-638194985906.asia-northeast1.run.app"
                    NEXT_PUBLIC_FIREBASE_API_KEY     = "AIzaSyA2TcKRSZaU9rQAsLs0c-CLDVz4O9y7xps"
                    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = "doppel-stg.firebaseapp.com"
                    NEXT_PUBLIC_LOGO_IMG_URL         = "doppel_logo.png"
                    NEXT_PUBLIC_PRIMARY_COLOR        = "#6366f1"
                    NEXT_PUBLIC_SIDEBAR_COLOR        = "#6366f1"
                    NEXT_PUBLIC_FAVICON              = "doppel.ico"
                    NEXT_PUBLIC_META_TITLE           = "DOPPEL｜自社データ学習型AIチャットボットで業務を自動化"
                    NEXT_PUBLIC_META_DESCRIPTION      = "DOPPEL（ドッペル）は、マニュアルやFAQなどの自社データを学習し、高精度な回答を実現するAIチャットボットです。24時間365日の自動応答で、カスタマーサポートの工数削減や社内のナレッジ共有を効率化。組織の生産性を最大化します。"
                    NEXT_PUBLIC_OG_IMAGE_PATH         = "doppel-og.png"
                }
                exec_account = "cd-exec@doppel-stg.iam.gserviceaccount.com"
                network = [ordered]@{
                    vpc_access_egress   = "all-traffic"
                    network_interfaces  = "[{`"network`":`"projects/mitra-shared-network/global/networks/mitra-vpc-main-shared`",`"subnetwork`":`"projects/mitra-shared-network/regions/asia-northeast1/subnetworks/mitra-subnet-stg-tokyo-doppel-frontend`"}]"
                }
            }
            prod = [ordered]@{
                runtime_project = "doppel-prod"
                build_args = [ordered]@{
                    NEXT_PUBLIC_TENANT_ID            = $ProdTenantId
                    NEXT_PUBLIC_API_URL              = "https://$newBackendAppName-646682719623.asia-northeast1.run.app"
                    NEXT_PUBLIC_SITE_URL             = "https://$newFrontendAppName-646682719623.asia-northeast1.run.app"
                    NEXT_PUBLIC_FIREBASE_API_KEY     = "AIzaSyAeC7Rfg1CoKY63rB0fT3HL7wAXyAIItUA"
                    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = "doppel-prod.firebaseapp.com"
                    NEXT_PUBLIC_LOGO_IMG_URL         = "doppel_logo.png"
                    NEXT_PUBLIC_PRIMARY_COLOR        = "#6366f1"
                    NEXT_PUBLIC_SIDEBAR_COLOR        = "#6366f1"
                    NEXT_PUBLIC_FAVICON              = "doppel.ico"
                    NEXT_PUBLIC_META_TITLE           = "DOPPEL｜自社データ学習型AIチャットボットで業務を自動化"
                    NEXT_PUBLIC_META_DESCRIPTION      = "DOPPEL（ドッペル）は、マニュアルやFAQなどの自社データを学習し、高精度な回答を実現するAIチャットボットです。24時間365日の自動応答で、カスタマーサポートの工数削減や社内のナレッジ共有を効率化。組織の生産性を最大化します。"
                    NEXT_PUBLIC_OG_IMAGE_PATH         = "doppel-og.png"
                }
                exec_account = "cd-exec@doppel-prod.iam.gserviceaccount.com"
                network = [ordered]@{
                    vpc_access_egress   = "all-traffic"
                    network_interfaces  = "[{`"network`":`"projects/mitra-shared-network/global/networks/mitra-vpc-main-shared`",`"subnetwork`":`"projects/mitra-shared-network/regions/asia-northeast1/subnetworks/mitra-subnet-prod-tokyo-doppel-frontend`"}]"
                }
            }
        }
    }

    # --- services エントリ（バックエンド） ---
    $backendService = [ordered]@{
        type         = "services"
        service_name = $newBackendAppName
        dockerfile   = "python/domain/$newBackendAppName/dockerfile"
        envs         = [ordered]@{
            dev  = [ordered]@{
                runtime_project    = "doppel-dev-461016"
                cloud_sql_instance = "doppel-dev-461016:asia-northeast1:doppel-dev-mysql-primary"
                exec_account       = "cd-exec@doppel-dev-461016.iam.gserviceaccount.com"
                network = [ordered]@{
                    vpc_access_egress   = "private-ranges-only"
                    network_interfaces  = "[{`"network`":`"projects/mitra-shared-network/global/networks/mitra-vpc-main-shared`",`"subnetwork`":`"projects/mitra-shared-network/regions/asia-northeast1/subnetworks/mitra-subnet-dev-tokyo-doppel-domain`"}]"
                }
                env_vars = [ordered]@{
                    ENV         = "dev"
                    TENANT_ID   = $DevTenantId
                    TENANT_NAME = $Tenant
                    ALLOW_ORIGINS = @("https://$newFrontendAppName-1090554569112.asia-northeast1.run.app")
                }
            }
            stg  = [ordered]@{
                runtime_project    = "doppel-stg"
                cloud_sql_instance = "doppel-stg:asia-northeast1:doppel-stg-mysql-primary"
                exec_account       = "cd-exec@doppel-stg.iam.gserviceaccount.com"
                network = [ordered]@{
                    vpc_access_egress   = "private-ranges-only"
                    network_interfaces  = "[{`"network`":`"projects/mitra-shared-network/global/networks/mitra-vpc-main-shared`",`"subnetwork`":`"projects/mitra-shared-network/regions/asia-northeast1/subnetworks/mitra-subnet-stg-tokyo-doppel-domain`"}]"
                }
                env_vars = [ordered]@{
                    ENV         = "stg"
                    TENANT_ID   = $StgTenantId
                    TENANT_NAME = $Tenant
                    ALLOW_ORIGINS = @("https://$newFrontendAppName-638194985906.asia-northeast1.run.app")
                }
            }
            prod = [ordered]@{
                runtime_project    = "doppel-prod"
                cloud_sql_instance = "doppel-prod:asia-northeast1:doppel-prod-mysql-primary"
                exec_account       = "cd-exec@doppel-prod.iam.gserviceaccount.com"
                network = [ordered]@{
                    vpc_access_egress   = "private-ranges-only"
                    network_interfaces  = "[{`"network`":`"projects/mitra-shared-network/global/networks/mitra-vpc-main-shared`",`"subnetwork`":`"projects/mitra-shared-network/regions/asia-northeast1/subnetworks/mitra-subnet-prod-tokyo-doppel-domain`"}]"
                }
                specs = [ordered]@{
                    min_scale   = "1"
                    max_scale   = "20"
                    cpu_target  = "75"
                    concurrency = "80"
                    timeout     = 600
                    cpu         = "2000m"
                    memory      = "2Gi"
                }
                env_vars = [ordered]@{
                    ENV         = "prod"
                    TENANT_ID   = $ProdTenantId
                    TENANT_NAME = $Tenant
                    ALLOW_ORIGINS = @("https://$newFrontendAppName-646682719623.asia-northeast1.run.app")
                }
            }
        }
    }

    # 既存の同名サービスを除外してから差し替え（idempotent）
    $services = @($services | Where-Object { $_.service_name -ne $newFrontendAppName -and $_.service_name -ne $newBackendAppName })
    $services += $frontendService
    $services += $backendService

    $jsonContent = $services | ConvertTo-Json -Depth 20
    Write-TextUtf8NoBom $SERVICES_JSON_PATH $jsonContent
    Write-Host -ForegroundColor Green "完了"
    Write-Host -ForegroundColor Cyan "   -> '$SERVICES_JSON_PATH' を envs 形式で更新しました。"
}

function Step10_GenServiceInfra([string]$Tenant) {
    $newFrontendAppName = "${Tenant}-app"
    $newBackendAppName  = "${Tenant}-svc"
    Write-Host -NoNewline "10. サービスインフラ定義を生成しています (scripts\gen_service_infra.py)... "
    try {
        python scripts\gen_service_infra.py --target-services $newFrontendAppName $newBackendAppName
        if ($LASTEXITCODE -ne 0) { throw "Pythonスクリプトがエラーコード $LASTEXITCODE で終了しました。" }
        Write-Host -ForegroundColor Green "完了"
        Write-Host -ForegroundColor Cyan "   -> 新しく追加されたサービスのみを処理しました: $newFrontendAppName, $newBackendAppName"
    }
    catch {
        Write-Host -ForegroundColor Red "`nエラー: scripts\gen_service_infra.py の実行に失敗しました。"
        throw $_
    }
}

function Step11_UpdateGenOpenapiPy([string]$Tenant) {
    Write-Host -NoNewline "11. OpenAPI定義スクリプトを更新しています ($GEN_OPENAPI_PY_PATH)... "
    if (Test-Path $GEN_OPENAPI_PY_PATH) {
        try {
            $snake = ($Tenant -replace '-', '_')
            $newAppEntry = "     ('" + $snake + "', 'python.domain." + $Tenant + "-svc.src.main', 'app'),"
            $content = Read-TextUtf8NoBom $GEN_OPENAPI_PY_PATH
            if ($content -match [regex]::Escape("'" + $snake + "'")) {
                Write-Host -ForegroundColor Yellow "完了 (既に存在します)"
            } else {
                $lines = [System.Collections.ArrayList]@($content -split "`r?`n")
                $insertionIndex = -1
                for ($i = 0; $i -lt $lines.Count; $i++) {
                    if ($lines[$i] -match '^\s*APPS\s*=\s*\[') { $insertionIndex = $i + 1; break }
                }
                if ($insertionIndex -ne -1) {
                    $lines.Insert($insertionIndex, $newAppEntry)
                    $updatedContent = $lines -join "`n"
                    Write-TextUtf8NoBom $GEN_OPENAPI_PY_PATH $updatedContent
                    Write-Host -ForegroundColor Green "完了"
                } else {
                    Write-Host -ForegroundColor Red "エラー ('APPS = [' 行が見つかりませんでした)"
                }
            }
        }
        catch {
            Write-Host -ForegroundColor Red "`nエラー: $GEN_OPENAPI_PY_PATH の更新に失敗しました。"
            throw $_
        }
    } else {
        Write-Host -ForegroundColor Yellow "スキップ ($GEN_OPENAPI_PY_PATH が見つかりません)"
    }
}

# ---------------- 12: OpenAPI 生成（1回だけ） ----------------
function Step12_RunOpenApiOnce {
    Write-Host -NoNewline "12. OpenAPI 定義を生成しています (npm run gen:openapi:all)... "
    try {
        npm run gen:openapi:all
        if ($LASTEXITCODE -ne 0) { throw "npm スクリプトがエラーコード $LASTEXITCODE で終了しました。" }
        Write-Host -ForegroundColor Green "完了"
    } catch {
        Write-Host -ForegroundColor Red "`nエラー: OpenAPI 定義の生成に失敗しました。"
        throw $_
    }
}

# ---------------- 13: フロント import 書換（各テナント） ----------------
function Step13_UpdateFrontendImports([string]$Tenant) {
    $newFrontendDir = "apps\${Tenant}-app"
    if (-not (Test-Path $newFrontendDir)) { Write-Host -ForegroundColor Yellow "[$Tenant] フロントディレクトリがないため import 書換をスキップ"; return }

    $snakeCaseTenant     = $Tenant -replace '-', '_'
    $templateSnake       = $TEMPLATE_TENANT_NAME -replace '-', '_'

    $tsxFiles = Get-ChildItem -Path $newFrontendDir -Recurse -Include "*.tsx", "*.ts" | Where-Object { $_.FullName -notlike "*node_modules*" }
    $updated = 0
    foreach ($file in $tsxFiles) {
        $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
        $encoding = $null
        if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
            $encoding = [System.Text.Encoding]::UTF8
            $content = [System.Text.Encoding]::UTF8.GetString($bytes, 3, $bytes.Length - 3)
        }
        elseif ($bytes.Length -ge 2 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) {
            $encoding = [System.Text.Encoding]::Unicode
            $content = [System.Text.Encoding]::Unicode.GetString($bytes, 2, $bytes.Length - 2)
        }
        elseif ($bytes.Length -ge 2 -and $bytes[0] -eq 0xFE -and $bytes[1] -eq 0xFF) {
            $encoding = [System.Text.Encoding]::BigEndianUnicode
            $content = [System.Text.Encoding]::BigEndianUnicode.GetString($bytes, 2, $bytes.Length - 2)
        }
        else {
            $encoding = [System.Text.Encoding]::UTF8
            $content = [System.Text.Encoding]::UTF8.GetString($bytes)
        }

        $originalContent = $content

        $content = $content -replace "`"@repo/api-contracts/$templateSnake/services`"", "`"@repo/api-contracts/$snakeCaseTenant/services`""
        $content = $content -replace "`"@repo/api-contracts/$templateSnake/type`"",     "`"@repo/api-contracts/$snakeCaseTenant/type`""
        $content = $content -replace "`"@repo/api-contracts/$templateSnake/zschema`"",  "`"@repo/api-contracts/$snakeCaseTenant/zschema`""

        if ($content -ne $originalContent) {
            Write-TextUtf8NoBom $file.FullName $content
            $updated++
        }
    }
    Write-Host -ForegroundColor Cyan "[$Tenant] import 書換: $updated ファイル更新"
}

# ======================== メインフロー ========================
$tenants = $TenantName | Where-Object { $_ -and $_.Trim() -ne "" } | ForEach-Object { $_.Trim() }
if ($tenants.Count -eq 0) { throw "テナント名が指定されていません。" }

# DeleteCodeOnly の場合は 0 を各テナントで実行して終了
if ($DeleteCodeOnly) {
    foreach ($t in $tenants) {
        Write-Host "--------------------------------------------------"
        Write-Host "[$t] 0. 生成コード削除（1〜7の巻き戻し）を実行します..."
        Write-Host "--------------------------------------------------"
        try {
            Step0_DeleteGeneratedCode $t
        } catch {
            Write-Host -ForegroundColor Red "`n[$t] 0 でエラー: $($_.Exception.Message)"
            continue
        }
    }
    Write-Host -ForegroundColor Green "✅ 完了（DeleteCodeOnly）"
    exit 0
}

# ADC は必要な場合のみ最初に一度だけ
Ensure-GcloudADC

# フェーズA: 1〜7 を各テナントで
foreach ($t in $tenants) {
    Write-Host "--------------------------------------------------"
    Write-Host "[$t] コード同期 (1〜7) を開始します..."
    Write-Host "--------------------------------------------------"
    try {
        Write-Host -NoNewline "1. FEコピー... "; Step1_CopyFrontend $t;                Write-Host -ForegroundColor Green "完了"
        Write-Host -NoNewline "2. FE package.json 更新... "; Step2_UpdateFrontendPackageJson $t; Write-Host -ForegroundColor Green "完了"
        Write-Host -NoNewline "3. BEコピー... "; Step3_CopyBackend $t;                  Write-Host -ForegroundColor Green "完了"
        Write-Host -NoNewline "4. BE pyproject.toml 更新... "; Step4_UpdateBackendPyProject $t;   Write-Host -ForegroundColor Green "完了"
        Write-Host -NoNewline "5. ルート pyproject.toml members 追加... "; Step5_UpdateRootMembers $t; Write-Host -ForegroundColor Green "完了"
        Write-Host -NoNewline "6. FE Dockerfile 生成... "; Step6_GenerateFrontendDockerfile $t;   Write-Host -ForegroundColor Green "完了"
        Write-Host -NoNewline "7. BE Dockerfile 生成... "; Step7_GenerateBackendDockerfile $t;    Write-Host -ForegroundColor Green "完了"
    } catch {
        Write-Host -ForegroundColor Red "`n[$t] 1〜7 でエラー: $($_.Exception.Message)"
        continue
    }
}

# SyncCodeOnly の場合は 12(1回) → 13(各テナント) で終了
if ($SyncCodeOnly) {
    Write-Host "=================================================="
    Write-Host "SyncCodeOnly: 12 を1回 → 13 を各テナントで実行して終了"
    Write-Host "=================================================="
    Step12_RunOpenApiOnce
    foreach ($t in $tenants) {
        Write-Host "--------------------------------------------------"
        Write-Host "[$t] 13. import 書換 実行"
        Write-Host "--------------------------------------------------"
        try { Step13_UpdateFrontendImports $t } catch { Write-Host -ForegroundColor Red "`n[$t] 13 でエラー: $($_.Exception.Message)" }
    }
    Write-Host -ForegroundColor Green "✅ 完了（SyncCodeOnly）"
    exit 0
}

# フェーズB: フル実行時のみ、各テナントで 8〜11
$results = @{}  # $results[$t] = @{ tenantIdsByProject=..; primaryTenantId=.. }
foreach ($t in $tenants) {
    Write-Host "--------------------------------------------------"
    Write-Host "[$t] 8〜11 を実行します..."
    Write-Host "--------------------------------------------------"
    try {
        $res = Step8_FindOrCreateIdentityTenant $t
        $results[$t] = $res

        Step9A_EnsureCloudSqlDatabases $t
        Step9_UpdateServicesJson $t $res.tenantIdsByProject $res.primaryTenantId
        Step10_GenServiceInfra $t
        Step11_UpdateGenOpenapiPy $t
    } catch {
        Write-Host -ForegroundColor Red "`n[$t] 8〜11 でエラー: $($_.Exception.Message)"
        continue
    }
}

# フェーズC: 12 は 1回だけ
Write-Host "=================================================="
Write-Host "12 を 1回だけ実行"
Write-Host "=================================================="
Step12_RunOpenApiOnce

# フェーズD: 13 は各テナントで
foreach ($t in $tenants) {
    Write-Host "--------------------------------------------------"
    Write-Host "[$t] 13. import 書換 実行"
    Write-Host "--------------------------------------------------"
    try { Step13_UpdateFrontendImports $t } catch { Write-Host -ForegroundColor Red "`n[$t] 13 でエラー: $($_.Exception.Message)" }
}

Write-Host -ForegroundColor Green "✅ 完了（フル実行）"
