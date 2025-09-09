const mysql = require("mysql2/promise");

async function createBorrowHistoryTable() {
  const connection = await mysql.createConnection({
    host: "25w29u.h.filess.io",
    user: "Storage_atomicdig",
    password: "e7deb901d0a82bf0ed7b3089fa64a842e7b479d7",
    database: "Storage_atomicdig",
    port: 3306,
  });

  try {
    console.log("Connected to MySQL database successfully!");

    // Create borrow_history table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS borrow_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cabinet_location VARCHAR(255) NOT NULL,
        package_code VARCHAR(255),
        user_id VARCHAR(50) NOT NULL,
        borrowed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        due_at DATETIME NOT NULL,
        returned_at DATETIME NULL,
        return_status ENUM('Borrowed', 'In Progress', 'Returned') NOT NULL DEFAULT 'Borrowed',
        expected_samples INT NOT NULL,
        returned_samples INT NULL,
        justification TEXT NULL,
        admin_approved BOOLEAN NULL,
        admin_comments TEXT NULL,
        reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_cabinet_location (cabinet_location),
        INDEX idx_return_status (return_status),
        INDEX idx_due_at (due_at)
      )
    `;

    await connection.execute(createTableSQL);
    console.log("borrow_history table created successfully!");

    // Show table structure
    const [columns] = await connection.execute("DESCRIBE borrow_history");
    console.log("\nTable structure:");
    columns.forEach(col => {
      console.log(`  ${col.Field} | ${col.Type} | ${col.Null} | ${col.Key} | ${col.Default} | ${col.Extra}`);
    });

  } catch (error) {
    console.error("Database error:", error);
  } finally {
    await connection.end();
  }
}

createBorrowHistoryTable();