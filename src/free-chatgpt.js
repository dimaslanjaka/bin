import { runChatGpt } from "./utils/chatgpt.js";
import { getArgs } from "./utils/index.cjs";

const argv = getArgs();
if (argv.help || argv.h) {
  console.log();
  console.log("Usage: free-chatgpt.js [--question <text> | -q <text>] [--qfile <file> | -qf <file>] [--help | -h]");
  console.log();
  console.log("Options:");
  console.log('  --question, -q   The question to ask ChatGPT (default: "Hello, ChatGPT!")');
  console.log("  --qfile, -qf     Path to a file containing the question text");
  console.log("  --help, -h       Show this help message");
  console.log();
  console.log("Description:");
  console.log(
    "  Automates browser interaction with ChatGPT, including login, question submission, and response retrieval."
  );
  console.log("  - Questions can be provided directly or loaded from a file.");
  console.log("  - Cookies are saved to ./tmp/cookies for session persistence.");
  console.log("  - Requires browser access to chat.openai.com and chatgpt.com (firewall must allow connection).");
  console.log();
  process.exit(0);
}

/** @type {string|undefined} */
let question = argv.question || argv.q;
/** @type {string|undefined} */
const questionFile = argv.qfile || argv.qf;

async function main() {
  try {
    await runChatGpt({
      headless: false,
      question,
      questionFile
    });
  } catch (error) {
    console.error("Error running ChatGPT:", error);
    process.exit(1);
  }
}

main();
