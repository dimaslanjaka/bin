const path = require("path");
const fs = require("fs");
const glob = require("glob");
const pkgj = require("./package.json");
const spawn = require("cross-spawn");

pkgj.bin = {
	"npm-run-series": "lib/npm-run-series.js",
};

glob
	.sync("**/*", {
		cwd: __dirname,
		ignore: [
			"**/node_modules/**",
			"**/boilerplate/**",
			"**/.git*",
			"**/yarn.lock",
			"**/package.json",
			"**/releases/**",
			"**/tmp/**",
			"**/test/**",
			"**/LICENSE",
			"**/.yarn/**",
			"**/.github/**",
			"**/*.{md,ts,js,txt,log,json,lock}",
		],
	})
	//.map((str) => path.resolve(__dirname, str))
	.filter(
		(str) =>
			![__filename].includes(path.resolve(__dirname, str)) && str !== "bin"
	)
	.forEach((str) => {
		pkgj.bin[path.basename(str)] = str;
	});

fs.writeFileSync(
	path.resolve(__dirname, "package.json"),
	JSON.stringify(pkgj, null, 2) + "\n"
);

// copy to test