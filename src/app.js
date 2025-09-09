const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const { handleDatabaseError } = require('../middleware/connectionHandler');
const { getActiveUserCount, updateHeartbeat, removeUserSession } = require('../middleware/sessionManager');
const { getConnectionStatus } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '../public')));

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Storage Management System API',
      version: '1.0.0',
      description: 'API for managing storage items, borrowing, and returns',
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./routes/*.js'],
};

const specs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    activeUsers: getActiveUserCount(),
    dbConnections: getConnectionStatus(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
    }
  });
});

// Connection status endpoint for debugging
app.get('/api/connection-status', authenticateToken, async (req, res) => {
  try {
    const { getConnectionDetails } = require('../config/database');
    const connDetails = await getConnectionDetails();
    
    res.json({
      success: true,
      connectionDetails: connDetails,
      activeUsers: getActiveUserCount(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting connection status:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting connection status',
      error: error.message
    });
  }
});

// Heartbeat endpoint to detect active tabs
app.post('/api/heartbeat', authenticateToken, (req, res) => {
  const updated = updateHeartbeat(req.user.id);
  res.json({ 
    success: updated,
    timestamp: new Date().toISOString(),
    message: updated ? 'Heartbeat updated' : 'Session not found'
  });
});

// Manual logout endpoint
app.post('/api/logout', authenticateToken, async (req, res) => {
  try {
    const removed = await removeUserSession(req.user.id);
    res.json({
      success: true,
      sessionRemoved: removed,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({
      success: false,
      message: 'Error during logout',
      error: error.message
    });
  }
});

const authRoutes = require('../routes/auth');
const itemRoutes = require('../routes/items');
const borrowRoutes = require('../routes/borrow');
const returnRoutes = require('../routes/return');
const adminRoutes = require('../routes/admin');

app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/borrow', borrowRoutes);
app.use('/api/return', returnRoutes);
app.use('/api/admin', adminRoutes);

// Database error handler middleware
app.use(handleDatabaseError);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = app;