import minimist from "minimist";
import { move } from "./move.mjs";

function showHelp(exitCode = 0) {
  console.log(
    `
Usage:
  move <src> <dest>

Options:
  -h, --help     Show this help message

Examples:
  move file.txt backup/file.txt
  move ./src ./dist
`.trim()
  );

  process.exit(exitCode);
}

async function main() {
  const args = minimist(process.argv.slice(2), {
    boolean: ["help", "h"],
    alias: {
      h: "help"
    }
  });

  if (args.help) {
    showHelp(0);
  }

  const [src, dest] = args._;

  if (!src || !dest) {
    console.error("Error: missing required arguments.\n");
    showHelp(1);
  }

  try {
    await move(src, dest);
    console.log(`Moved ${src} to ${dest}`);
  } catch (err) {
    console.error(`Error moving file: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

function handleError(err) {
  console.error(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}

main().catch(handleError);
