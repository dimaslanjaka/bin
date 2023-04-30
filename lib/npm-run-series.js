const fs = require("fs");
const path = require("path");
const yargs = require("yargs/yargs");
const { minimatch } = require("minimatch");

const args = yargs(process.argv.slice(2));
const cwd = process.cwd();
const packagejson = path.resolve(cwd, "package.json");
/**
 * @type {import('../package.json')}
 */
const parse = JSON.parse(fs.readFileSync(packagejson, "utf-8"));

if (parse !== null && typeof parse === "object") {
	if ("scripts" in parse) {
		console.log("args", args);
	}
}
