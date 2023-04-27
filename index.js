const path = require("path");
const fs = require("fs");
const glob = require("glob");
const pkgj = require("./package.json");

const reads = glob
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
			"**/LICENSE",
			"**/.yarn/**",
			"**/.github/**",
			"**/*.{md,ts}",
		],
	})
	//.map((str) => path.resolve(__dirname, str))
	.filter((str) => ![__filename].includes(path.resolve(__dirname, str)))
	.forEach((str) => {
		pkgj.bin[str] = str;
	});

fs.writeFileSync(
	path.resolve(__dirname, "package.json"),
	JSON.stringify(pkgj, null, 2) + "\n"
);
