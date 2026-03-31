'use strict';
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const { findUserById, isTokenRevoked } = require('../db/client');

function _ipHash(req) {
  return crypto.createHash('sha256').update(req.ip || '').digest('hex');
}

function _extractToken(req) {
  const authHeader = req.headers['authorization'];
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  if (req.cookies?.accessToken) return req.cookies.accessToken;
  return null;
}

// ── Strict authenticate — requires valid JWT, returns 401 otherwise ──
function authenticate(req, res, next) {
  req.clientIpHash = _ipHash(req);

  const token = _extractToken(req);
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

  const user = findUserById(payload.sub);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  req.userId   = payload.sub;
  req.userRole = user.role || 'free';
  req.user     = { id: payload.sub, email: user.email, role: req.userRole };
  next();
}

// ── Optional auth — attaches user if JWT is valid, falls back to guest ──
function optionalAuth(req, res, next) {
  req.clientIpHash = _ipHash(req);

  const token = _extractToken(req);
  if (!token) {
    req.user     = null;
    req.userId   = null;
    req.userRole = 'guest';
    return next();
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    req.user     = null;
    req.userId   = null;
    req.userRole = 'guest';
    return next();
  }

  const user = findUserById(payload.sub);
  if (!user) {
    req.user     = null;
    req.userId   = null;
    req.userRole = 'guest';
    return next();
  }

  req.userId   = payload.sub;
  req.userRole = user.role || 'free';
  req.user     = { id: payload.sub, email: user.email, role: req.userRole };
  next();
}

module.exports = authenticate;
module.exports.authenticate  = authenticate;
module.exports.optionalAuth  = optionalAuth;
