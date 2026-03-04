import urllib
from io import BytesIO

import chardet
import pandas as pd
from fastapi import HTTPException
from fastapi.responses import StreamingResponse

from ...services.interfaces.i_file_converter import IFileConverter


class PFileConverter(IFileConverter):
    """
    ファイルデータ形式の変換を抽象化するインターフェース。
    """

    def convert_csv_to_xlsx(self, file_data: bytes, file_name: str) -> StreamingResponse:
        """
        CSVファイルバイナリデータをXLSX形式に変換してStreamingResponseで返す。

        Parameters
        ----------
        file_data : bytes
            CSVファイルのバイナリデータ
        file_name : str
            元のCSVファイル名

        Returns
        -------
        StreamingResponse
            XLSXファイルをストリームで返すレスポンス

        Raises
        ------
        HTTPException
            エンコーディングを特定できない場合
        """
        detection = chardet.detect(file_data)
        encoding = detection.get("encoding")
        if not encoding:
            raise HTTPException(status_code=500, detail="ファイルのエンコーディングを検出できませんでした")

        csv_data = pd.read_csv(BytesIO(file_data), encoding=encoding)
        output = BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            csv_data.to_excel(writer, index=False, sheet_name="Sheet1")

        output.seek(0)
        xlsx_file_name = file_name.replace(".csv", ".xlsx")
        encoded_file_name = urllib.parse.quote(xlsx_file_name)

        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_file_name}"},
        )
