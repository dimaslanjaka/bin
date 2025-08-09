import { runChatGpt } from "../../src/utils/chatgpt.js";
import path from "path";

runChatGpt({ headless: false, questionFile: path.join(process.cwd(), "tmp/gpt-question.txt") });
