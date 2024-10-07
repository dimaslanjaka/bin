const glob = require("glob");
const { delStream } = require("./utils");
const g3 = new glob.Glob(["**/.yarn/cache*", "**/.yarn/*.gz"], {
    withFileTypes: false,
    cwd: process.cwd(),
    ignore: ["**/.git*", "**/vendor/**"]
});
delStream(g3);
