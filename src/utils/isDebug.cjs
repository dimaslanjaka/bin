/**
 * @description Check if the application is running in debug mode.
 * @returns {boolean}
 */
function isDebug() {
  if (globalThis.DEBUG !== undefined) {
    if (typeof globalThis.DEBUG === 'boolean') {
      return globalThis.DEBUG;
    }
    return globalThis.DEBUG === 'true' || globalThis.DEBUG === '1';
  }
  return process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development' || process.env.DEBUG === '1';
}

module.exports = isDebug;
module.exports.default = isDebug;
module.exports.isDebug = isDebug;
