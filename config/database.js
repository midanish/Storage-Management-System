const { Sequelize } = require('sequelize');
const dns = require('dns');

// Global singleton instance
let sequelize = null;
let connectionPromise = null;

// DNS resolver for Vercel - use Cloudflare DNS
dns.setServers(['1.1.1.1', '1.0.0.1']);

function getSequelizeInstance() {
  if (!sequelize) {
    console.log('Attempting connection to primary database...');
    sequelize = new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASS,
      {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        dialect: process.env.DB_DIALECT || 'mysql',
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
          acquire: 10000,
          idle: 5000, // 5 seconds idle time for serverless
          evict: 5000,
          handleDisconnects: true,
          // Optimize for serverless
          acquireTimeoutRetries: 0,
          testOnBorrow: false
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

// Create backup database instance
function createBackupSequelizeInstance() {
  console.log('Creating backup database connection...');
  return new Sequelize(
    process.env.BACKUP_DB_NAME,
    process.env.BACKUP_DB_USER,
    process.env.BACKUP_DB_PASS,
    {
      host: process.env.BACKUP_DB_HOST,
      port: process.env.BACKUP_DB_PORT || 3306,
      dialect: process.env.BACKUP_DB_DIALECT || 'mysql',
      dialectModule: require('mysql2'),
      logging: false,
      dialectOptions: {
        connectTimeout: 60000,
        ssl: false,
        flags: ['-FOUND_ROWS']
      },
      pool: {
        max: 1,
        min: 0,
        acquire: 10000,
        idle: 5000,
        evict: 5000,
        handleDisconnects: true,
        acquireTimeoutRetries: 0,
        testOnBorrow: false
      },
      define: {
        charset: 'utf8',
        timestamps: true
      },
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
}

// Test database connection with fallback
async function testDatabaseConnection() {
  try {
    console.log('Testing primary database connection...');
    await sequelize.authenticate();
    console.log('Primary database connection successful');
    return { success: true, usingBackup: false };
  } catch (error) {
    console.warn('Primary database connection failed:', error.message);
    console.log('Attempting backup database connection...');

    try {
      // Create a test backup connection
      const backupInstance = createBackupSequelizeInstance();
      await backupInstance.authenticate();
      await backupInstance.close();

      console.log('Backup database connection test successful');
      console.log('Switching to backup database...');

      // Simply replace the global instance without closing
      sequelize = createBackupSequelizeInstance();

      console.log('Backup database connection active');
      return { success: true, usingBackup: true };
    } catch (backupError) {
      console.error('Backup database connection also failed:', backupError.message);
      return { success: false, error: backupError };
    }
  }
}

// Force close all connections
async function closeConnection() {
  if (sequelize) {
    try {
      // Force close all connections in the pool
      await sequelize.connectionManager.close();
      console.log('All database connections closed');
    } catch (error) {
      console.error('Error closing database connections:', error);
    }
    sequelize = null;
    connectionPromise = null;
  }
}

// Force drain and close connection pool
async function drainConnectionPool() {
  if (sequelize && sequelize.connectionManager.pool) {
    try {
      const pool = sequelize.connectionManager.pool;
      
      // Get all connections and close them
      const connections = pool._allConnections || [];
      console.log(`Closing ${connections.length} active connections`);
      
      for (const connection of connections) {
        try {
          if (connection && connection.end) {
            await connection.end();
          } else if (connection && connection.destroy) {
            connection.destroy();
          }
        } catch (err) {
          console.warn('Error closing individual connection:', err);
        }
      }
      
      // Clear the pool
      if (pool.clear) {
        await pool.clear();
      }
      
      console.log('Connection pool drained successfully');
      return true;
    } catch (error) {
      console.error('Error draining connection pool:', error);
      return false;
    }
  }
  return false;
}

// Kill specific connection by user session
async function killUserConnection(userId) {
  try {
    if (sequelize) {
      // Get current connection ID and kill it
      const [result] = await sequelize.query(`SELECT CONNECTION_ID() as connId`, {
        type: sequelize.QueryTypes.SELECT
      });
      
      if (result && result.connId) {
        await sequelize.query(`KILL ${result.connId}`, {
          type: sequelize.QueryTypes.RAW
        });
        console.log(`Killed database connection ${result.connId} for user: ${userId}`);
        return true;
      }
    }
  } catch (error) {
    console.warn(`Could not kill connection for user ${userId}:`, error);
  }
  return false;
}

// Force close and recreate connection pool
async function forceConnectionReset() {
  try {
    if (sequelize) {
      console.log('Force resetting database connection pool...');
      
      // First try to drain the connection pool without destroying the connection manager
      const drainSuccess = await drainConnectionPool();
      
      if (drainSuccess) {
        console.log('Database connection pool drained successfully');
        return true;
      }
      
      // If draining fails, fall back to closing connection manager
      console.log('Draining failed, closing connection manager...');
      await sequelize.connectionManager.close();
      
      // Clear the singleton instance
      sequelize = null;
      connectionPromise = null;
      
      console.log('Database connection pool reset complete');
      return true;
    }
  } catch (error) {
    console.error('Error resetting connection pool:', error);
    return false;
  }
}

// Get detailed connection status for debugging
async function getConnectionDetails() {
  try {
    if (sequelize) {
      const [connections] = await sequelize.query(`
        SELECT
          ID as connectionId,
          USER as user,
          HOST as host,
          DB as databaseName,
          COMMAND as command,
          TIME as timeInSeconds,
          STATE as state
        FROM INFORMATION_SCHEMA.PROCESSLIST
        WHERE USER = 'Storage_atomicdig' AND COMMAND != 'Sleep'
        ORDER BY TIME DESC
      `, { type: sequelize.QueryTypes.SELECT });
      
      const pool = sequelize.connectionManager.pool;
      const poolStats = {
        size: pool ? pool.size : 0,
        available: pool ? pool.available : 0,
        using: pool ? pool.using : 0,
        waiting: pool ? pool.waiting : 0
      };
      
      return {
        activeConnections: connections,
        poolStats: poolStats,
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    console.error('Error getting connection details:', error);
    return { error: error.message };
  }
}

// Process exit handlers
process.on('SIGTERM', closeConnection);
process.on('SIGINT', closeConnection);
process.on('beforeExit', closeConnection);

module.exports = {
  get sequelize() {
    return getSequelizeInstance();
  },
  testDatabaseConnection,
  closeConnection,
  drainConnectionPool,
  forceConnectionReset,
  getConnectionDetails,
  killUserConnection,
  getConnectionStatus: () => {
    try {
      const instance = getSequelizeInstance();
      if (!instance) return 0;
      // Try to get connection pool status
      const pool = instance.connectionManager.pool;
      return pool ? pool.size || 0 : 0;
    } catch (error) {
      return sequelize ? 1 : 0; // Fallback: return 1 if sequelize exists
    }
  }
};