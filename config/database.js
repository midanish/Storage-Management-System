const { Sequelize } = require('sequelize');

// Global singleton instance
let sequelize = null;
let connectionPromise = null;

function getSequelizeInstance() {
  if (!sequelize) {
    sequelize = new Sequelize(
      'Storage_atomicdig',
      'Storage_atomicdig',
      'e7deb901d0a82bf0ed7b3089fa64a842e7b479d7',
      {
        host: '25w29u.h.filess.io',
        port: 3306,
        dialect: 'mysql',
        dialectModule: require('mysql2'),
        logging: false,
        dialectOptions: {
          connectTimeout: 60000,
          ssl: false,
          // Force single connection reuse
          flags: ['-FOUND_ROWS']
        },
        pool: {
          max: 1,
          min: 0,
          acquire: 30000,
          idle: 300000, // 5 minutes idle time
          evict: 300000,
          handleDisconnects: true
        },
        // Prevent multiple connections
        define: {
          charset: 'utf8',
          timestamps: true
        },
        // Connection retry logic
        retry: {
          match: [
            /ECONNRESET/,
            /ENOTFOUND/,
            /ECONNREFUSED/,
            /ETIMEDOUT/,
            /max_user_connections/,
            /ER_USER_LIMIT_REACHED/
          ],
          max: 2
        }
      }
    );

    // Don't authenticate here - let it be lazy loaded
    console.log('Database instance created (connection will be established on first use)');
  }
  return sequelize;
}

// Graceful shutdown
async function closeConnection() {
  if (sequelize) {
    try {
      await sequelize.close();
      console.log('Database connection closed');
    } catch (error) {
      console.error('Error closing database connection:', error);
    }
    sequelize = null;
    connectionPromise = null;
  }
}

// Process exit handlers
process.on('SIGTERM', closeConnection);
process.on('SIGINT', closeConnection);
process.on('beforeExit', closeConnection);

module.exports = {
  sequelize: getSequelizeInstance(),
  closeConnection,
  getConnectionStatus: () => {
    try {
      if (!sequelize) return 0;
      // Try to get connection pool status
      const pool = sequelize.connectionManager.pool;
      return pool ? pool.size || 0 : 0;
    } catch (error) {
      return sequelize ? 1 : 0; // Fallback: return 1 if sequelize exists
    }
  }
};