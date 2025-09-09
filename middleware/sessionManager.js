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

const checkIdleUsers = () => {
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
  
  expiredUsers.forEach(({userId, reason}) => {
    activeUsers.delete(userId);
    console.log(`Cleaned up user ${userId} - reason: ${reason}`);
  });
  
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

const forceLogoutUser = (userId) => {
  activeUsers.delete(userId);
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

const removeUserSession = (userId) => {
  const removed = activeUsers.delete(userId);
  if (removed) {
    console.log(`Manually removed user session: ${userId}`);
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