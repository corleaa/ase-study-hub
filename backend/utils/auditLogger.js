'use strict';
const { logger } = require('./logger');
function auditLog(event, data) {
  logger.info('AUDIT', { event, ...data, ts: new Date().toISOString() });
}
module.exports = { auditLog };
