const { forceConnectionReset, getConnectionDetails } = require('../config/database');
const activeUsers = new Map();
const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes for faster cleanup
const HEARTBEAT_TIMEOUT = 2 * 60 * 1000; // 2 minutes heartbeat timeout
const MAX_CONCURRENT_USERS = 4; // Leave 1 connection for system operations

const trackUserActivity = (req, res, next) => {
  if (req.user) {
    const userId = req.user.id;
    const now = Date.now();
    activeUsers.set(userId, {
      lastActivity: now,
      lastHeartbeat: now,
      userId: userId,
      userAgent: req.headers['user-agent'],
      sessionId: req.headers['x-session-id'] || `session_${userId}_${now}`
    });
  }
  next();
};

const checkIdleUsers = async () => {
  const now = Date.now();
  const expiredUsers = [];
  
  for (const [userId, userData] of activeUsers) {
    const timeSinceActivity = now - userData.lastActivity;
    const timeSinceHeartbeat = now - userData.lastHeartbeat;
    
    // Remove if idle too long OR no heartbeat (tab closed)
    if (timeSinceActivity > IDLE_TIMEOUT || timeSinceHeartbeat > HEARTBEAT_TIMEOUT) {
      expiredUsers.push({
        userId,
        reason: timeSinceHeartbeat > HEARTBEAT_TIMEOUT ? 'no_heartbeat' : 'idle_timeout'
      });
    }
  }
  
  // Process expired users with connection cleanup
  for (const {userId, reason} of expiredUsers) {
    activeUsers.delete(userId);
    console.log(`Cleaned up user ${userId} - reason: ${reason}`);
    
    // Force connection cleanup for expired sessions
    if (reason === 'no_heartbeat') {
      console.log(`Tab closed detected for user ${userId} - forcing connection cleanup`);
      try {
        await forceConnectionReset();
        console.log(`Database connections reset for tab closure: ${userId}`);
      } catch (error) {
        console.error('Error resetting connections on tab closure:', error);
      }
    }
  }
  
  if (expiredUsers.length > 0) {
    console.log(`Total cleaned up: ${expiredUsers.length} user sessions`);
  }
};

const checkConnectionLimit = (req, res, next) => {
  // Clean up idle users first
  checkIdleUsers();
  
  if (req.user) {
    const currentActiveUsers = activeUsers.size;
    const userId = req.user.id;
    
    // If user already exists, update their activity
    if (activeUsers.has(userId)) {
      activeUsers.set(userId, {
        ...activeUsers.get(userId),
        lastActivity: Date.now()
      });
      return next();
    }
    
    // Check if we're at the limit
    if (currentActiveUsers >= MAX_CONCURRENT_USERS) {
      return res.status(503).json({
        error: 'Server capacity reached',
        message: 'Too many users are currently online. Please wait a moment and try again.',
        activeUsers: currentActiveUsers,
        maxUsers: MAX_CONCURRENT_USERS,
        code: 'USER_LIMIT_REACHED'
      });
    }
  }
  
  next();
};

const getActiveUserCount = () => {
  checkIdleUsers(); // Clean up before counting
  return activeUsers.size;
};

const forceLogoutUser = async (userId) => {
  console.log(`Force logging out user: ${userId}`);
  activeUsers.delete(userId);
  
  // Log connection status before cleanup
  try {
    const connDetails = await getConnectionDetails();
    console.log('Connection details before cleanup:', JSON.stringify(connDetails, null, 2));
  } catch (error) {
    console.warn('Could not get connection details before cleanup:', error);
  }
  
  // Force connection reset to kill sleep connections
  try {
    await forceConnectionReset();
    console.log(`Database connections reset for user logout: ${userId}`);
  } catch (error) {
    console.error('Error resetting connections on logout:', error);
  }
};

// Clean up idle users every 1 minute for faster cleanup
setInterval(checkIdleUsers, 1 * 60 * 1000);

const updateHeartbeat = (userId) => {
  if (activeUsers.has(userId)) {
    const userData = activeUsers.get(userId);
    userData.lastHeartbeat = Date.now();
    activeUsers.set(userId, userData);
    return true;
  }
  return false;
};

const removeUserSession = async (userId) => {
  const removed = activeUsers.delete(userId);
  if (removed) {
    console.log(`Manually removed user session: ${userId}`);
    
    // Log connection status before cleanup
    try {
      const connDetails = await getConnectionDetails();
      console.log('Connection details before session removal:', JSON.stringify(connDetails, null, 2));
    } catch (error) {
      console.warn('Could not get connection details before cleanup:', error);
    }
    
    // Force connection reset to kill sleep connections
    try {
      await forceConnectionReset();
      console.log(`Database connections reset for session removal: ${userId}`);
    } catch (error) {
      console.error('Error resetting connections on session removal:', error);
    }
  }
  return removed;
};

module.exports = {
  trackUserActivity,
  checkConnectionLimit,
  getActiveUserCount,
  forceLogoutUser,
  checkIdleUsers,
  updateHeartbeat,
  removeUserSession
};