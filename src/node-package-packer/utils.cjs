/**
 * Slugify a package name for use in filenames.
 *
 * Replaces `@` and `/` characters with `-` so that scoped npm package names
 * (e.g. `@scope/name`) become safe filename segments (e.g. `scope-name`).
 *
 * @param {string} str - The package name to slugify.
 * @returns {string} The slugified name safe for use in file paths.
 * @example
 * slugifyPkgName('@scope/name')        // => 'scope-name'
 * slugifyPkgName('simple-package')     // => 'simple-package'
 * slugifyPkgName('@a/b/c')            // => 'a-b-c'
 */
function slugifyPkgName(str) {
  return str.replace(/\//g, '-').replace(/@/g, '');
}

module.exports = { slugifyPkgName };
