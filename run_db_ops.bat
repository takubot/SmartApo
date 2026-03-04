@echo off
REM Database operations script for mitra-datascience-svc
REM DOPPELディレクトリから実行してください

echo === Database Operations Script ===
echo.

cd python\domain\mitra-datascience-svc

echo Running database operations...
uv run python src\db_ops.py

echo.
echo === Script completed ===
pause 