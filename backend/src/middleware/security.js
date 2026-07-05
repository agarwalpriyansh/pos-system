// Simple in-memory IP Rate Limiter (No external dependency)
const rateLimits = {};

const rateLimiter = (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();
  const timeframe = 15 * 60 * 1000; // 15 minutes window
  const maxRequests = 100; // Maximum 100 requests per IP per window

  if (!rateLimits[ip]) {
    rateLimits[ip] = [];
  }

  // Filter timestamps older than the timeframe
  rateLimits[ip] = rateLimits[ip].filter(timestamp => now - timestamp < timeframe);

  if (rateLimits[ip].length >= maxRequests) {
    return res.status(429).json({
      error: 'Too many requests from this IP. Please try again after 15 minutes.'
    });
  }

  rateLimits[ip].push(now);
  next();
};

// Zero-dependency HTML Sanitizer helper to prevent XSS in text inputs
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
};

const sanitizeInput = (req, res, next) => {
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(req.body[key]);
      } else if (Array.isArray(req.body[key])) {
        req.body[key] = req.body[key].map(item => {
          if (typeof item === 'string') return sanitizeString(item);
          return item;
        });
      }
    }
  }
  next();
};

module.exports = {
  rateLimiter,
  sanitizeInput,
  sanitizeString
};
