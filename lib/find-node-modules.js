const glob = require("glob");
const path = require("path");
/**
 * Asynchronously finds all "node_modules" directories within the given directory.
 *
 * @param {string} [dir=process.cwd()] - The directory to start the search from. Defaults to the current working directory.
 * @param {function} [callback=null] - Optional callback function that gets called with each found "node_modules" path.
 * @returns {Promise<string[]>} - A promise that resolves to an array of full paths to "node_modules" directories.
 */
function findNodeModules(dir = process.cwd(), callback = null) {
    const finalDir = typeof dir === "string" ? dir : process.cwd();
    return new Promise((resolve, reject) => {
        const results = [];
        const g3 = new glob.Glob("**/node_modules", {
            withFileTypes: false,
            cwd: finalDir,
            ignore: ["**/.git*", "**/vendor/**"]
        });
        const stream = g3.stream();
        stream.on("data", (result) => {
            const fullPath = path.resolve(finalDir, result);
            if (typeof callback === "function") {
                try {
                    callback(fullPath); // Safely invoke callback
                }
                catch (err) {
                    console.error("findNodeModules callback error:", err);
                }
            }
            results.push(fullPath);
        });
        stream.on("error", (err) => reject(err)); // Handle errors
        stream.on("end", () => {
            if (results.length === 0) {
                console.log("No node_modules directories found.");
            }
            resolve(results); // Resolve the full array when the stream ends
        });
    });
}
module.exports = findNodeModules;
