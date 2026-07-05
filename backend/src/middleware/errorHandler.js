const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Structured operational/programming logging
  console.error(`[Error Handler] [${new Date().toISOString()}] [${req.method}] [${req.originalUrl}]`);
  console.error(`Status Code: ${err.statusCode} | Message: ${err.message}`);
  if (err.stack) {
    console.error(err.stack);
  }

  // Consistent API responses
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    // stack is only visible in development environments
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler;
