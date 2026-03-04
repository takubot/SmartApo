# services/interfaces/i_file_storage.py
from abc import ABC, abstractmethod
from typing import Any


class IFileStorageClient(ABC):
    """
    ファイルストレージ上のファイル操作やファイル変換機能を抽象化するインターフェース。

    このインターフェースを実装するクラスは、特定のストレージ(GCSやS3など)を介して
    ファイルをダウンロード、アップロード、削除したり、CSV->XLSX変換、
    PDFファイル取得などのユーティリティ機能を提供する。
    """

    @abstractmethod
    def upload_file(self, file_obj: Any, file_path: str, file_name: str, bucket_name: str | None = None) -> str:
        """
        ファイルオブジェクトを指定ストレージにアップロードする。

        Parameters
        ----------
        file_obj : Any
            アップロード対象ファイルオブジェクト (FastAPIのUploadFileなど)
        file_path : str
            バケット内パス（例: "group_id/xxx"）。"gs://..."を渡した場合は
            クライアント側設定のバケット名で上書きし正規化する。
        file_name : str
            アップロードするファイル名
        bucket_name : str | None
            使用するバケット名。指定があればこの呼び出しに限り self.bucket_name を上書き。

        Returns
        -------
        str
            アップロード後のフルパス (例: "gs://<bucket>/<path>")
        """
        pass

    @abstractmethod
    def download_file_as_bytes(self, file_url: str) -> bytes:
        """
        指定したパスからファイルをバイナリデータとしてダウンロードする。

        Parameters
        ----------
        file_url : str
            "gs://..."などのストレージパス

        Returns
        -------
        bytes
            ダウンロードしたファイルのバイナリデータ
        """
        pass

    @abstractmethod
    def delete_file(self, tenant_id: str, file_url: str) -> bool:
        """
        指定ストレージ上のファイルを削除する。

        Parameters
        ----------
        tenant_id : str
            対象バケット名
        file_url : str
            削除対象ファイルのストレージパス

        Returns
        -------
        bool
            削除成功時True、失敗時False
        """
        pass

    @abstractmethod
    def generate_signed_url(self, gcs_path: str, expiration_minutes: int = 30, method: str = "GET", content_type: str | None = None) -> str:
        """
        指定したファイルの署名付きURLを生成する。

        Parameters
        ----------
        gcs_path : str
            GCSのフルパス（例: "gs://bucket/path"）または相対パス（例: "group_id/xxx"）
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
        pass
