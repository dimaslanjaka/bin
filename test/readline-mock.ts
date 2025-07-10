import * as readline from "readline";

const r = readline.createInterface({
  input: process.stdin,
  terminal: false
});

const result: { [key in string]: string } = {};

r.on("line", (line) => {
  const elements = line.split(" ");
  result[elements[0]] = result[elements[0]] ?? elements[1];
});

r.on("close", () => {
  console.log(JSON.stringify(result));
  // Clean up to avoid open handle (TTYWRAP) in Jest
  if (typeof r.close === "function") {
    try {
      r.close();
    } catch (_e) {
      // ignore
    }
  }
  if (process.stdin && typeof process.stdin.destroy === "function") {
    try {
      process.stdin.destroy();
    } catch (_e) {
      // ignore
    }
  }
});
