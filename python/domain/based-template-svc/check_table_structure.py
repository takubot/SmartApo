#!/usr/bin/env python3
"""テーブル構造を確認するスクリプト"""

import pymysql


def check_table_structure():
    """user_chat_logテーブルの構造を確認"""
    try:
        # データベースに接続
        connection = pymysql.connect(
            host="localhost",
            user="root",
            password="rootpass",
            database="based-template-vbf6m_prod_fix_db",
            charset="utf8mb4",
        )

        with connection.cursor() as cursor:
            # テーブル構造を確認
            cursor.execute("DESCRIBE user_chat_log")
            columns = cursor.fetchall()

            print("=== user_chat_log テーブル構造 ===")
            for column in columns:
                print(
                    f"Field: {column[0]}, Type: {column[1]}, Null: {column[2]}, Key: {column[3]}, Default: {column[4]}, Extra: {column[5]}"
                )

            # file_infoとform_infoカラムが存在するかチェック
            column_names = [col[0] for col in columns]
            print("\n=== カラム存在チェック ===")
            print(f"file_info exists: {'file_info' in column_names}")
            print(f"form_info exists: {'form_info' in column_names}")

            # 存在する場合は削除
            if "file_info" in column_names:
                print("file_infoカラムを削除します...")
                cursor.execute("ALTER TABLE user_chat_log DROP COLUMN file_info")
                print("file_infoカラムを削除しました")

            if "form_info" in column_names:
                print("form_infoカラムを削除します...")
                cursor.execute("ALTER TABLE user_chat_log DROP COLUMN form_info")
                print("form_infoカラムを削除しました")

            # 変更をコミット
            connection.commit()

    except Exception as e:
        print(f"エラーが発生しました: {e}")
    finally:
        if "connection" in locals():
            connection.close()


if __name__ == "__main__":
    check_table_structure()
