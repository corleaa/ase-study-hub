'use strict';
const jwt = require('jsonwebtoken');
const { findUserById, isTokenRevoked } = require('../db/client');

function authenticate(req, res, next) {
  let token = null;
  const authHeader = req.headers['authorization'];
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }
  if (!token) return res.status(401).json({ error: 'Authentication required.' });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  if (payload.jti && isTokenRevoked(payload.jti)) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  // FIX: findUserById returnează doar id și email (fără locked_until)
  const user = findUserById(payload.sub);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  req.userId = payload.sub;
  req.user = { id: payload.sub, email: user.email };
  next();
}

module.exports = authenticate;
