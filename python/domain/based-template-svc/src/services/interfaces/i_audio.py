# # services/interfaces/i_audio.py

# from abc import ABC, abstractmethod


# class IAudio(ABC):
#     """
#     音声ファイル(または動画ファイル)を受け取り、
#     必要に応じて動画→音声変換し、Deepgram で文字起こしを行うためのインターフェース。
#     話者分離(diarization)も行うことを想定。
#     """

#     @abstractmethod
#     def transcribe(self, file_data: bytes, is_video: bool = False) -> str:
#         """
#         Parameters
#         ----------
#         file_data : bytes
#             音声または動画ファイルのバイナリデータ。
#         is_video : bool
#             True の場合は動画とみなし、音声抽出を行う。

#         Returns
#         -------
#         str
#             話者分離済みテキスト。
#             例:
#             Speaker 0: Hello ...
#             Speaker 1: Hi ...
#         """
#         pass
