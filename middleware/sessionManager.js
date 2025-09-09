const activeUsers = new Map();
const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const MAX_CONCURRENT_USERS = 4; // Leave 1 connection for system operations

const trackUserActivity = (req, res, next) => {
  if (req.user) {
    const userId = req.user.id;
    activeUsers.set(userId, {
      lastActivity: Date.now(),
      userId: userId,
      userAgent: req.headers['user-agent']
    });
  }
  next();
};

const checkIdleUsers = () => {
  const now = Date.now();
  const expiredUsers = [];
  
  for (const [userId, userData] of activeUsers) {
    if (now - userData.lastActivity > IDLE_TIMEOUT) {
      expiredUsers.push(userId);
    }
  }
  
  expiredUsers.forEach(userId => {
    activeUsers.delete(userId);
  });
  
  if (expiredUsers.length > 0) {
    console.log(`Cleaned up ${expiredUsers.length} idle user sessions`);
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

// Clean up idle users every 5 minutes
setInterval(checkIdleUsers, 5 * 60 * 1000);

module.exports = {
  trackUserActivity,
  checkConnectionLimit,
  getActiveUserCount,
  forceLogoutUser,
  checkIdleUsers
};