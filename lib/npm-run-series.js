#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { minimatch } = require("minimatch");

const args = require("minimist")(process.argv.slice(2));
const cwd = process.cwd();
const packagejson = path.join(cwd, "package.json");

if (fs.existsSync(packagejson)) {
	/**
	 * @type {import('../package.json')}
	 */
	const parse = JSON.parse(fs.readFileSync(packagejson, "utf-8"));

	if (parse !== null && typeof parse === "object") {
		if ("scripts" in parse) {
			console.log(args);
		}
	}
}
