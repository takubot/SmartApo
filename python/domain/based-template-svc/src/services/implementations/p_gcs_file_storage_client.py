import logging
import mimetypes
from datetime import datetime, timedelta
from io import BytesIO

import google.auth
import google.auth.transport.requests
from fastapi import HTTPException
from google.cloud import storage

from ...common.env_config import get_settings
from ...services.interfaces.i_file_storage_client import IFileStorageClient

# 追加の拡張子→MIMEタイプマッピング（Windows環境等で不足するケースの補完）
_EXTENSION_TO_MIME: dict[str, str] = {
    ".pdf": "application/pdf",
    ".csv": "text/csv",
    ".tsv": "text/tab-separated-values",
    ".txt": "text/plain",
    ".json": "application/json",
    ".xml": "application/xml",
    ".html": "text/html",
    ".htm": "text/html",
    ".md": "text/markdown",
    # Office Open XML
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xlsm": "application/vnd.ms-excel.sheet.macroEnabled.12",
    ".xltx": "application/vnd.openxmlformats-officedocument.spreadsheetml.template",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".pptm": "application/vnd.ms-powerpoint.presentation.macroEnabled.12",
    ".potx": "application/vnd.openxmlformats-officedocument.presentationml.template",
    ".ppsx": "application/vnd.openxmlformats-officedocument.presentationml.slideshow",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".docm": "application/vnd.ms-word.document.macroEnabled.12",
    ".dotx": "application/vnd.openxmlformats-officedocument.wordprocessingml.template",
    # 旧Office
    ".xls": "application/vnd.ms-excel",
    ".ppt": "application/vnd.ms-powerpoint",
    ".doc": "application/msword",
    # 画像/その他（念のため）
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".mp4": "video/mp4",
    ".mp3": "audio/mpeg",
}

# 標準のmimetypesに不足分を追加（strict=False で既存衝突を許容）
for _ext, _mime in _EXTENSION_TO_MIME.items():
    try:
        mimetypes.add_type(_mime, _ext, strict=False)
    except Exception:
        pass

env = get_settings().env
gcp_project_id = get_settings().gcp_project_id


class PGCSFileStoragClient(IFileStorageClient):
    """
    Google Cloud Storage上のファイル操作およびファイル形式変換を行う実装クラス。

    `IFileStorageClient`インターフェースを実装するクラスで、GCS上のファイルの
    ダウンロード、アップロード、削除やCSV->XLSX変換、PDF取得など
    ファイルに関する様々な操作を提供する。
    """

    def __init__(self, bucket_name: str | None = f"doppel-{env}-bucket"):
        # 本番環境ではデフォルトの認証を使用（IAMロール）
        self.client = storage.Client()

        # 署名付きURL生成用のサービスアカウント
        self.signer_service_account = f"signer@{gcp_project_id}.iam.gserviceaccount.com"
        # 認証情報をキャッシュしてパフォーマンスを向上
        self._credentials = None
        self._credentials_refresh_time = None

        self.bucket_name = bucket_name

    def _get_cached_credentials(self):
        """
        認証情報をキャッシュしてパフォーマンスを向上させる。
        5分間キャッシュを保持する。
        """
        now = datetime.utcnow()

        # キャッシュが存在し、5分以内の場合は再利用
        if (
            self._credentials
            and self._credentials_refresh_time
            and (now - self._credentials_refresh_time).total_seconds() < 300
        ):
            return self._credentials

        # 認証情報を取得・更新
        credentials, _ = google.auth.default()
        credentials.refresh(google.auth.transport.requests.Request())

        # キャッシュを更新
        self._credentials = credentials
        self._credentials_refresh_time = now

        return credentials

    def _detect_mime_type(self, file_obj: object, file_name: str) -> str:
        """
        MIMEタイプをできる限り正確に判定する。

        優先度:
        1) UploadFile などの content_type（かつ application/octet-stream 以外）
        2) 拡張子の明示的マッピング
        3) mimetypes.guess_type による推定
        4) application/octet-stream（最後の手段）
        """
        # 1) ブラウザ/クライアントが送ってくる content_type を最優先
        try:
            content_type = getattr(file_obj, "content_type", None)
            if content_type and content_type != "application/octet-stream":
                return content_type
        except Exception:
            pass

        # 2) 拡張子マッピング
        ext = ""
        lower_name = (file_name or "").lower()
        if "." in lower_name:
            ext = "." + lower_name.rsplit(".", 1)[-1]
        if ext in _EXTENSION_TO_MIME:
            return _EXTENSION_TO_MIME[ext]

        # 3) mimetypes による推定
        guessed, _ = mimetypes.guess_type(lower_name)
        if guessed:
            return guessed

        # 4) フォールバック
        return "application/octet-stream"

    def upload_file(self, file_obj: object, file_path: str, file_name: str, bucket_name: str | None = None) -> str:
        """
        バイナリデータをGCSにアップロードし、アップロードしたファイルのパスを返す。

        Parameters
        ----------
        file_obj : UploadFile
            アップロード対象ファイルオブジェクト(FastAPIのUploadFile)
        file_path : str
            バケット内パス（例: "group_id/xxx"）。"gs://..."を渡しても可。
        file_name : str
            アップロードするファイル名
        bucket_name : str | None
            使用するバケット名。指定があればこの呼び出しに限り self.bucket_name を上書き。

        Returns
        -------
        str
            gs://パス
        """
        self.bucket_name = bucket_name or self.bucket_name

        # ファイル内容をBytesIOに正規化
        if hasattr(file_obj, "file") and hasattr(file_obj.file, "read"):
            # FastAPI UploadFile 等

            file_content = file_obj.file.read()
            byte_stream = BytesIO(file_content)
        elif hasattr(file_obj, "read"):
            # 任意のファイルライクオブジェクト

            byte_stream = BytesIO(file_obj.read())
        elif isinstance(file_obj, bytes):
            byte_stream = BytesIO(file_obj)
        elif isinstance(file_obj, str):
            byte_stream = BytesIO(file_obj.encode("utf-8"))
        else:
            raise ValueError(f"Unsupported file object type: {type(file_obj)}")
        byte_stream.seek(0)

        # MIMEタイプを判定（強化版）
        mime_type = self._detect_mime_type(file_obj=file_obj, file_name=file_name)

        # 渡された file_path が gs:// の場合でもバケット名をこのクライアント設定に正規化
        gcs_blob_path = file_path
        if gcs_blob_path.startswith("gs://"):
            gcs_blob_path = gcs_blob_path[len("gs://") :]
            # 先頭の bucket 名を除去してパス部分のみを抽出
            if "/" in gcs_blob_path:
                _, gcs_blob_path = gcs_blob_path.split("/", 1)
        gcs_blob_path = gcs_blob_path.lstrip("/")

        # バケットとBlobを取得しファイルをアップロード
        bucket = self.client.bucket(self.bucket_name)
        blob = bucket.blob(gcs_blob_path)

        blob.upload_from_file(byte_stream, content_type=mime_type)

        # gs://パスを返す
        gcs_path = f"gs://{self.bucket_name}/{gcs_blob_path}"

        return gcs_path

    def download_file_as_bytes(self, file_url: str) -> bytes:
        """
        GCS上の指定パスからファイルをバイナリとして取得する。
        """
        if not file_url.startswith("gs://"):
            raise ValueError("GCS path must start with 'gs://'")

        file_url_local = file_url[5:]
        tenant_id, file_path = file_url_local.split("/", 1)
        bucket = self.client.bucket(tenant_id)
        blob = bucket.blob(file_path)

        if not blob.exists():
            raise ValueError(f"ファイルがGCSに存在しません: {file_url}")

        # バイナリデータを取得
        file_data = blob.download_as_bytes()

        # バイナリデータの完全性を確認
        if not file_data:
            raise ValueError(f"ダウンロードしたファイルが空です: {file_url}")

        return file_data

    def delete_file(self, tenant_id: str, file_url: str) -> bool:
        """
        GCS上の指定ファイルを削除する。
        """
        try:
            if file_url.startswith("gs://"):
                file_url_local = file_url[5:]
                tenant_id, object_name = file_url_local.split("/", 1)
            else:
                object_name = file_url

            bucket = self.client.bucket(tenant_id)
            blob = bucket.blob(object_name)

            if not blob.exists():
                return False

            blob.delete()
            return True
        except Exception as e:
            logging.error(f"Failed to delete file {file_url} from GCS: {e}")
            return False

    def generate_signed_url(self, gcs_path: str, expiration_minutes: int = 30, method: str = "GET", content_type: str | None = None) -> str:
        """
        指定したファイルの署名付きURLを生成する。

        Parameters
        ----------
        gcs_path : str
            GCSのフルパス（例: "gs://bucket/path"）
        expiration_minutes : int
            署名付きURLの有効期限（分）。デフォルトは30分。
        method : str
            HTTPメソッド（GET, PUT等）。デフォルトはGET。
        content_type : str | None
            Content-Type（PUTの場合などに指定）。

        Returns
        -------
        str
            署名付きURL
        """
        if gcs_path == "/botIcon/default.ico":
            return "/botIcon/default.ico"
        try:
            normalized_method = (method or "GET").upper()
            normalized_content_type = content_type.strip() if isinstance(content_type, str) and content_type.strip() else None

            # gcs_path は "gs://bucket/path" または "relative/path" の両方を許容
            if gcs_path.startswith("gs://"):
                path_parts = gcs_path[5:].split("/", 1)
                if len(path_parts) != 2:
                    raise ValueError(f"Invalid gs:// path format: {gcs_path}")
                target_bucket = path_parts[0]
                file_path = path_parts[1]
            else:
                target_bucket = self.bucket_name
                file_path = gcs_path.lstrip("/")
                if not file_path:
                    raise ValueError(f"Invalid relative path format: {gcs_path}")

            # バケットとオブジェクトを取得
            bucket = self.client.bucket(target_bucket)
            blob = bucket.blob(file_path)

            # ファイルの存在確認 (GETの場合のみ)
            if normalized_method == "GET" and not blob.exists():
                raise HTTPException(status_code=404, detail=f"ファイルが見つかりません: {file_path}")

            # 署名付きURLを生成（ローカル・本番環境共通）
            expiration_time = datetime.utcnow() + timedelta(minutes=expiration_minutes)

            # キャッシュされた認証情報を取得
            credentials = self._get_cached_credentials()

            # 署名付きURLを生成
            signed_url = blob.generate_signed_url(
                version="v4",
                expiration=expiration_time,
                method=normalized_method,
                service_account_email=self.signer_service_account,
                access_token=credentials.token,
                content_type=normalized_content_type,
            )

            return signed_url

        except HTTPException:
            # HTTPExceptionはそのまま再発生
            raise
        except Exception as e:
            # 署名付きURL生成に失敗した場合はエラーを返す
            logging.error(f"Failed to generate signed URL for {gcs_path}: {e}")
            raise HTTPException(status_code=500, detail=f"署名付きURLの生成に失敗しました: {str(e)}")
