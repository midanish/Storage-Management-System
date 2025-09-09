const mysql = require("mysql2/promise");

async function examineDatabase() {
  const connection = await mysql.createConnection({
    host: "25w29u.h.filess.io",
    user: "Storage_atomicdig",
    password: "e7deb901d0a82bf0ed7b3089fa64a842e7b479d7",
    database: "Storage_atomicdig",
    port: 3306,
  });

  try {
    console.log("Connected to MySQL database successfully!");

    // Show all tables
    console.log("\n=== TABLES ===");
    const [tables] = await connection.execute("SHOW TABLES");
    tables.forEach(table => {
      console.log(`- ${Object.values(table)[0]}`);
    });

    // Examine each table structure
    for (const tableRow of tables) {
      const tableName = Object.values(tableRow)[0];
      console.log(`\n=== TABLE: ${tableName} ===`);
      
      // Show table structure
      const [columns] = await connection.execute(`DESCRIBE ${tableName}`);
      console.log("Columns:");
      columns.forEach(col => {
        console.log(`  ${col.Field} | ${col.Type} | ${col.Null} | ${col.Key} | ${col.Default} | ${col.Extra}`);
      });

      // Show sample data (first 3 rows)
      try {
        const [rows] = await connection.execute(`SELECT * FROM ${tableName} LIMIT 3`);
        if (rows.length > 0) {
          console.log("Sample data:");
          console.log(rows);
        } else {
          console.log("No data found");
        }
      } catch (error) {
        console.log("Error fetching data:", error.message);
      }
    }

  } catch (error) {
    console.error("Database error:", error);
  } finally {
    await connection.end();
  }
}

examineDatabase();