#!/usr/bin/env python3
# ingest.py
import csv
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

# ---------- file ----------
CSV_FILE = "Dummy unit_Firewall sample.csv"   # ← change if necessary

# ---------- helpers ----------
def open_connection():
    try:
        conn = mysql.connector.connect(**CFG)
        print("MySQL", conn.get_server_info())
        return conn
    except Error as e:
        print("Connect error:", e)
        raise

def build_create_sql(headers):
    """Build CREATE TABLE with headers verbatim."""
    defs = []
    for h in headers:
        if h.lower() == "totalsample":
            defs.append(f"`{h}` INT")
        else:
            defs.append(f"`{h}` VARCHAR(255)")
    sql = f"CREATE TABLE IF NOT EXISTS firewall_samples ({', '.join(defs)})"
    return sql

def insert_many(cursor, headers, rows):
    """Efficient multi-row INSERT."""
    cols = ", ".join([f"`{h}`" for h in headers])
    placeholders = ", ".join(["%s"] * len(headers))
    sql = f"INSERT INTO firewall_samples ({cols}) VALUES ({placeholders})"
    cursor.executemany(sql, rows)

# ---------- main ----------
def main():
    conn = open_connection()
    cursor = conn.cursor()

    with open(CSV_FILE, newline="", encoding="utf-8-sig") as f:
        rdr = csv.reader(f)
        headers = next(rdr)
        print("Headers found:", len(headers))

        # create table
        cursor.execute("DROP TABLE IF EXISTS firewall_samples")
        cursor.execute(build_create_sql(headers))
        print("Table created.")

        # stream rows
        chunk, total = [], 0
        for row in rdr:
            chunk.append(row)
            if len(chunk) >= 500:               # commit every 500 rows
                insert_many(cursor, headers, chunk)
                total += len(chunk)
                chunk.clear()
                print("Inserted", total, "rows …")
        if chunk:                               # final leftover
            insert_many(cursor, headers, chunk)
            total += len(chunk)

        conn.commit()
        print("Finished – total rows inserted:", total)

    cursor.close()
    conn.close()

if __name__ == "__main__":
    main()