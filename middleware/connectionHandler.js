const handleDatabaseError = (error, req, res, next) => {
  if (error.parent && error.parent.code === 'ER_USER_LIMIT_REACHED') {
    return res.status(503).json({
      error: 'Server is currently busy',
      message: 'Too many users are currently online. Please wait a moment and try again.',
      code: 'CONNECTION_LIMIT_REACHED'
    });
  }
  
  if (error.name === 'SequelizeConnectionError' || error.name === 'ConnectionError') {
    return res.status(503).json({
      error: 'Database connection error',
      message: 'Unable to connect to database. Please try again in a moment.',
      code: 'DATABASE_CONNECTION_ERROR'
    });
  }
  
  next(error);
};

const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(error => {
      handleDatabaseError(error, req, res, next);
    });
  };
};

module.exports = {
  handleDatabaseError,
  asyncHandler
};