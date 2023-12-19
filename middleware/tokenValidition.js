require('dotenv').config()
const jwt = require('jsonwebtoken');

// Middleware for verifying JWT tokens
function verifyToken(req, res, next) {
  const authHeaders = req.headers.authorization; // Use lowercase 'authorization'
  const token = authHeaders && authHeaders.split(' ')[1]

  if (token === null) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, user) => {
    if (err) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    req.user = user;
    next();
  });
}

module.exports = {
  verifyToken
};
