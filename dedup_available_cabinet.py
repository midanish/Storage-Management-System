#!/usr/bin/env python3
# dedup_available_cabinet.py
import mysql.connector
from mysql.connector import Error

CFG = dict(
    host="25w29u.h.filess.io",
    port=3306,
    user="Storage_atomicdig",
    password="e7deb901d0a82bf0ed7b3089fa64a842e7b479d7",
    database="Storage_atomicdig",
)

def main():
    try:
        conn = mysql.connector.connect(**CFG)
        cur = conn.cursor()
        
        # Step 1: Get list of all unique Temporary Cabinets that have duplicates
        print("Step 1: Identifying duplicate Available Cabinet entries...")
        duplicate_check_sql = """
        SELECT `Temporary Cabinet`, COUNT(*) as count
        FROM firewall_samples 
        WHERE TRIM(LOWER(`Category`)) = 'available cabinet'
        GROUP BY `Temporary Cabinet`
        HAVING COUNT(*) > 1
        """
        cur.execute(duplicate_check_sql)
        duplicates = cur.fetchall()
        
        if not duplicates:
            print("No duplicate Available Cabinet entries found. Nothing to do.")
            return
        
        print(f"Found {len(duplicates)} cabinets with duplicate Available Cabinet entries:")
        for cabinet, count in duplicates:
            print(f"  Cabinet '{cabinet}': {count} entries")
        
        # Step 2: For each cabinet with duplicates, keep only one entry
        print("\nStep 2: Removing duplicate entries...")
        total_deleted = 0
        
        for cabinet, count in duplicates:
            # Delete all but one entry for this cabinet
            delete_sql = """
            DELETE FROM firewall_samples 
            WHERE TRIM(LOWER(`Category`)) = 'available cabinet' 
            AND `Temporary Cabinet` = %s
            LIMIT %s
            """
            # Delete all duplicates except one (count - 1)
            cur.execute(delete_sql, (cabinet, count - 1))
            deleted = cur.rowcount
            total_deleted += deleted
            print(f"  Deleted {deleted} duplicate entries for cabinet '{cabinet}'")
        
        print(f"Total deleted: {total_deleted} duplicate entries")
        
        # Step 3: Verify the results
        print("\nStep 3: Verifying results...")
        cur.execute(duplicate_check_sql)
        remaining_duplicates = cur.fetchall()
        
        if remaining_duplicates:
            print("WARNING: Still found duplicates after cleanup:")
            for cabinet, count in remaining_duplicates:
                print(f"  Cabinet '{cabinet}': {count} entries")
        else:
            print("SUCCESS: No duplicate Available Cabinet entries found!")
        
        # Final count
        cur.execute("SELECT COUNT(*) FROM firewall_samples WHERE TRIM(LOWER(`Category`)) = 'available cabinet'")
        final_count = cur.fetchone()[0]
        print(f"Final count of Available Cabinet entries: {final_count}")
        
        # Show breakdown by cabinet
        print("\nBreakdown by cabinet:")
        cur.execute("""
        SELECT `Temporary Cabinet`, COUNT(*) as count
        FROM firewall_samples 
        WHERE TRIM(LOWER(`Category`)) = 'available cabinet'
        GROUP BY `Temporary Cabinet`
        ORDER BY `Temporary Cabinet`
        """)
        breakdown = cur.fetchall()
        for cabinet, count in breakdown:
            print(f"  Cabinet '{cabinet}': {count} entry")
        
        conn.commit()
        print("\nAvailable-Cabinet deduplication completed successfully.")
        
    except Error as e:
        print("MySQL error:", e)
        if 'conn' in locals() and conn.is_connected():
            conn.rollback()
    finally:
        if 'conn' in locals() and conn.is_connected():
            cur.close()
            conn.close()
            print("Database connection closed.")

if __name__ == "__main__":
    main()