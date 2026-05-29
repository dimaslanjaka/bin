import { runChatGpt } from '../../src/utils/chatgpt.js';
import path from 'upath';

runChatGpt({ headless: false, questionFile: path.join(process.cwd(), 'tmp/gpt-question.txt') });
