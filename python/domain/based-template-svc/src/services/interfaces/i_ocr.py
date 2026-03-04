# # i_ocr.py
# from abc import ABC, abstractmethod

# import numpy as np


# class InterfaceOcrService(ABC):
#     """
#     OCRサービスの共通操作を定義する抽象クラス。
#     """

#     @abstractmethod
#     def detect_text(self, image: np.ndarray, prompt: str) -> str:
#         """
#         画像からテキストを検出し、1つの文字列として返す。
#         """
#         raise NotImplementedError("detect_textメソッドが実装されていません。")

#     @abstractmethod
#     def extract_text_from_pdf(self, file_data: bytes) -> list[str]:
#         """
#         PDFファイルの各ページをOCRし、ページごとのテキストをリストで返す。
#         """
#         raise NotImplementedError("extract_text_from_pdfメソッドが実装されていません。")

#     @abstractmethod
#     def extract_text_from_docx(self, file_data: bytes) -> list[str]:
#         """
#         DOC/DOCXファイルをOCRし、ページごとのテキストをリストで返す。
#         """
#         raise NotImplementedError("extract_text_from_docxメソッドが実装されていません。")

#     @abstractmethod
#     def extract_text_from_pptx(self, file_data: bytes) -> list[str]:
#         """
#         PPT/PPTXファイルをOCRし、ページごとのテキストをリストで返す。
#         """
#         raise NotImplementedError("extract_text_from_pptxメソッドが実装されていません。")

#     @abstractmethod
#     def detect_table_in_page(self, image: np.ndarray) -> bool:
#         """
#         画像1ページに表が含まれているかを判定する。
#         """
#         raise NotImplementedError("detect_table_in_pageメソッドが実装されていません。")
