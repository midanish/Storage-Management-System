#!/usr/bin/env python3
# ingest_users.py
import pandas as pd
import mysql.connector
from mysql.connector import Error

# ---------- connection details ----------
CFG = dict(
    host="25w29u.h.filess.io",
    port=3306,
    user="Storage_atomicdig",
    password="e7deb901d0a82bf0ed7b3089fa64a842e7b479d7",
    database="Storage_atomicdig",
)

# ---------- helpers ----------
def open_connection():
    try:
        conn = mysql.connector.connect(**CFG)
        print("MySQL", conn.get_server_info())
        return conn
    except Error as e:
        print("Connect error:", e)
        raise

def main():
    # 1. read Excel (skip duplicate header inside the file)
    df = pd.read_excel(
        "Process Team Credentials.xlsx",
        engine="openpyxl",
        dtype=str,          # treat every cell as string
    )
    # drop the duplicated header row if it exists
    df = df[df["Email"] != "Email"].copy()

    # 2. friendly role names
    df["role"] = df["Level"].map({"1": "admin", "2": "user"})

    # 3. push to MySQL
    conn = open_connection()
    cursor = conn.cursor()

    cursor.execute("DROP TABLE IF EXISTS users")
    cursor.execute(
        """
        CREATE TABLE users (
            id        VARCHAR(50) PRIMARY KEY,
            email     VARCHAR(100) UNIQUE,
            role      ENUM('admin','user'),
            password  VARCHAR(100)
        )
        """
    )

    sql = """
        INSERT INTO users (id, email, role, password)
        VALUES (%s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            email=VALUES(email),
            role=VALUES(role),
            password=VALUES(password)
    """
    rows = df[["ID", "Email", "role", "password"]].values.tolist()
    cursor.executemany(sql, rows)
    conn.commit()

    print("Inserted / updated", cursor.rowcount, "user rows.")
    cursor.close()
    conn.close()

if __name__ == "__main__":
    main()