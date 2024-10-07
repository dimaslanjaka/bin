/**
 * Asynchronously finds all "node_modules" directories within the given directory.
 *
 * @param {string} [dir=process.cwd()] - The directory to start the search from. Defaults to the current working directory.
 * @param {function} [callback=null] - Optional callback function that gets called with each found "node_modules" path.
 * @returns {Promise<string[]>} - A promise that resolves to an array of full paths to "node_modules" directories.
 */
declare function findNodeModules(dir?: string, callback?: Function): Promise<string[]>;

export { findNodeModules as default };
