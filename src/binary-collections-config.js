/**
 * Centralized configuration for binary-collections
 * This module provides a consistent way to handle temporary directories and other configuration across the project.
 *
 * Usage:
 * const { getTempDir, getTempPath } = require('./binary-collections-config');
 *
 * // Get base temp directory
 * const tempDir = getTempDir();
 *
 * // Get specific temp path
 * const myTempPath = getTempPath('my-module', 'output.txt');
 */

const path = require("path");

/**
 * Get the base temporary directory path
 * Can be overridden via TEMP_DIR environment variable
 * @returns {string} The base temporary directory path
 */
function getTempDir() {
  return process.env.TEMP_DIR || "tmp";
}

/**
 * Get a temporary file or directory path
 * @param {...string} segments - Path segments to join with the temp directory
 * @returns {string} The full temporary path
 */
function getTempPath(...segments) {
  return path.join(getTempDir(), ...segments);
}

/**
 * Legacy aliases for backward compatibility
 */
const TEMP_BASE_DIR = getTempDir();

module.exports = {
  getTempDir,
  getTempPath,
  TEMP_BASE_DIR
};
