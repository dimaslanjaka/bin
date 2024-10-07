const { fs, path } = require("sbg-utility");
const { build } = require("tsup");

fs.rmSync(path.join(__dirname, "lib"), { force: true, recursive: true });

const baseOption = {
  outDir: "lib",
  entry: ["./src/**/*"],
  exclude: ["**/node_modules", "**/test*", "**/*.spec*.ts", "**/*.test*.ts"],
  target: "node14",
  dts: true,
  shims: true,
  tsconfig: "tsconfig.build.json"
};

build({
  ...baseOption,
  format: ["cjs", "esm"],
  banner(ctx) {
    if (ctx.format === "esm") {
      return {
        js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`
      };
    }
  },
  outExtension({ format }) {
    switch (format) {
      case "cjs": {
        return { js: ".cjs", dts: ".d.cts" };
      }
      case "esm": {
        return { js: ".mjs", dts: ".d.mts" };
      }
      default: {
        return { js: ".js", dts: ".d.ts" };
      }
    }
  }
}).catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});

build({
  ...baseOption,
  format: "cjs",
  outExtension() {
    return { js: ".js", dts: ".d.ts" };
  }
}).catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
