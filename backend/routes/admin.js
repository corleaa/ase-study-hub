'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/authenticate');
const { getAdminStats } = require('../db/client');

function requireAdmin(req, res, next) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Access denied.' });
  }
  next();
}

router.get('/stats', authenticate, requireAdmin, (req, res, next) => {
  try {
    res.json(getAdminStats());
  } catch (e) {
    next(e);
  }
});

module.exports = router;
