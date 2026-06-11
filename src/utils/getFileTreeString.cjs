/**
 * Creates a directory/file tree string from an array of file paths and hashes.
 * @param {string[]} hashArray Array of strings in the format 'relative/path/to/file hash'.
 * @returns {string} Directory/file tree as a string, with file hashes.
 */
function getFileTreeString(hashArray) {
  const tree = {};
  // Map file paths to hashes for quick lookup
  const hashMap = {};
  for (const entry of hashArray) {
    const [filePath, hash] = entry.split(' ');
    hashMap[filePath] = hash;
    const parts = filePath.split('/');
    let current = tree;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        current[part] = null; // file
      } else {
        current[part] = current[part] || {};
        current = current[part];
      }
    }
  }
  function printNode(node, prefix = '', parentPath = '') {
    const keys = Object.keys(node).sort();
    let lines = [];
    keys.forEach((key, idx) => {
      const isLast = idx === keys.length - 1;
      const branch = isLast ? '└── ' : '├── ';
      const currentPath = parentPath ? parentPath + '/' + key : key;
      if (node[key] === null) {
        lines.push(prefix + branch + key + ' [' + (hashMap[currentPath] || '') + ']');
      } else {
        lines.push(prefix + branch + key + '/');
        lines = lines.concat(printNode(node[key], prefix + (isLast ? '    ' : '│   '), currentPath));
      }
    });
    return lines;
  }
  return printNode(tree, '', '').join('\n');
}

module.exports = getFileTreeString;

// Provide a "default" alias for consumers that import the compiled ESM default
module.exports.default = module.exports;
