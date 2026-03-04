# services/interfaces/i_file_storage.py
from abc import ABC, abstractmethod

from fastapi.responses import StreamingResponse


class IFileConverter(ABC):
    """
    ファイルデータ形式の変換を抽象化するインターフェース。
    """

    @abstractmethod
    def convert_csv_to_xlsx(self, file_data: bytes, file_name: str) -> StreamingResponse:
        """
        CSVファイルデータをXLSX形式に変換し、StreamingResponseで返す。

        Parameters
        ----------
        file_data : bytes
            CSVファイルのバイナリデータ
        file_name : str
            元のCSVファイル名

        Returns
        -------
        StreamingResponse
            XLSXファイルをストリームで返すレスポンスオブジェクト
        """
        pass
