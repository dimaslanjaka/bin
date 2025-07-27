import fs from "fs-extra";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import path from "upath";
import { getArgs } from "./utils.cjs";

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

/** @type {string} */
let question = argv.question || argv.q || "Hello, ChatGPT!";
/** @type {string|undefined} */
const questionFile = argv.qfile || argv.qf;

const COOKIE_DIR = path.join(process.cwd(), "tmp", "cookies");
const DEFAULT_COOKIE_PATH = path.join(COOKIE_DIR, "cookies.json");
fs.ensureDirSync(COOKIE_DIR);

export async function saveCookies(page, path = DEFAULT_COOKIE_PATH) {
  const cookies = await page.cookies();
  fs.writeFileSync(path, JSON.stringify(cookies, null, 2));
}

/**
 * Returns the cookie file path for a given URL's hostname.
 *
 * @param {string} url - The URL to extract the hostname from.
 * @returns {string} The path to the cookie file for the hostname, or the default cookie path if invalid.
 */
function getCookiePathForUrl(url) {
  try {
    const { hostname } = new URL(url);
    return path.join(COOKIE_DIR, `cookies_${hostname}.json`);
  } catch {
    return DEFAULT_COOKIE_PATH;
  }
}

/**
 * Navigates to a URL using Puppeteer, loading cookies for the host and injecting a DOM mutation observer.
 *
 * @param {import('puppeteer').Page} page - Puppeteer page instance.
 * @param {string} url - The URL to navigate to.
 * @returns {Promise<{ waitForDomIdle: (idleMs?: number, timeout?: number) => Promise<boolean> }>} An object containing a function to wait for DOM stability.
 */
export async function navigatePage(page, url) {
  const cookiePath = getCookiePathForUrl(url);

  // Load cookies for the host
  const cookies = loadCookies(cookiePath);
  if (cookies) {
    await page.setCookie(...cookies);
  }

  // Navigate and wait until fully loaded
  await page.goto(url, { waitUntil: "networkidle0" });

  // Inject DOM mutation observer to handle dynamic content
  await page.evaluate(() => {
    window.__domStillUpdating = true;

    if (window.__domObserver) {
      window.__domObserver.disconnect();
    }

    window.__domObserver = new MutationObserver(() => {
      window.__lastDomMutation = Date.now();
    });

    window.__lastDomMutation = Date.now();

    window.__domObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });

    // Stop tracking after a while (optional)
    setTimeout(() => {
      window.__domStillUpdating = false;
      window.__domObserver.disconnect();
    }, 30000); // e.g. 30 seconds max
  });

  /**
   * Waits until the DOM has been stable (no mutations) for a specified number of milliseconds.
   *
   * @param {number} [idleMs=1000] - The number of milliseconds the DOM must be stable.
   * @param {number} [timeout=10000] - The maximum time to wait for the DOM to stabilize.
   * @returns {Promise<boolean>} Resolves to true if the DOM was stable for idleMs within timeout, otherwise throws an error.
   */
  const waitForDomIdle = async (idleMs = 1000, timeout = 10000) => {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const lastMutation = await page.evaluate(() => window.__lastDomMutation);
      const idle = Date.now() - lastMutation;

      if (idle >= idleMs) {
        return true; // DOM has been stable for idleMs
      }

      await new Promise((r) => setTimeout(r, 200)); // poll every 200ms
    }

    throw new Error("DOM did not stabilize within timeout");
  };

  return { waitForDomIdle };
}

/**
 * Loads cookies from a specified file path.
 *
 * @param {string} [cookieFilePath=DEFAULT_COOKIE_PATH] - Path to the cookie file.
 * @returns {Array|Null} Parsed cookies array, or null if file does not exist.
 */
function loadCookies(cookieFilePath = DEFAULT_COOKIE_PATH) {
  if (!fs.existsSync(cookieFilePath)) return null;
  return JSON.parse(fs.readFileSync(cookieFilePath));
}

export async function restoreCookies(page, cookieFilePath = DEFAULT_COOKIE_PATH) {
  const cookies = loadCookies(cookieFilePath);
  if (cookies) {
    await page.setCookie(...cookies);
  }
}

export async function writeQuestion(page, question) {
  const questions = question.split("\n");
  const promptTextarea = await page.waitForSelector("#prompt-textarea", { timeout: 30000 });
  if (!promptTextarea) {
    console.log(
      "Cannot find the prompt input on the webpage. Please check whether you have access to chat.openai.com without logging in via your browser."
    );
  }
  // Clear the prompt textarea
  await page.evaluate(() => {
    document.querySelector("#prompt-textarea").innerHTML = `<p></p>`;
  });

  // Check if the question has newlines
  if (questions.length === 1) {
    // If there's only one line, type it directly
    await page.type("#prompt-textarea", questions[0], { delay: 100 });
    return;
  }

  // Type each question line by line
  for (const q of questions) {
    await page.type("#prompt-textarea", q, { delay: 100 });
    // Check if the line is not the last one
    if (q !== questions[questions.length - 1]) {
      // Simulate pressing Shift + Enter to add a new line
      await page.keyboard.down("Shift");
      await page.keyboard.press("Enter");
      await page.keyboard.up("Shift");
    }
  }
}

export async function clickSubmitButton(page) {
  try {
    const fruitjuiceSendButton = await page.evaluate(() => {
      return document.querySelector('[data-testid="fruitjuice-send-button"]') !== null;
    });
    const sendButton = await page.evaluate(() => {
      return document.querySelector('[data-testid="send-button"]') !== null;
    });

    if (fruitjuiceSendButton) {
      await page.click('[data-testid="fruitjuice-send-button"]');
    } else if (sendButton) {
      await page.click('[data-testid="send-button"]');
    } else {
      console.log("Neither send button is present");
    }
  } catch (e) {
    console.log(`Failed to click the send button: ${e}`);
  }
}

let lastMessageId = null;
let messageCount = 0;
const is_streaming = false; // Set to true if you want to stream the response

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Waits for the initial assistant response to appear and finish thinking.
 *
 * @param {import('puppeteer').Page} page - Puppeteer page instance.
 * @param {number} [timeout=30000] - Maximum time to wait for the response (ms).
 * @returns {Promise<void>} Resolves when the initial response is ready.
 */
async function waitForInitialResponse(page, timeout = 30000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const assistantMessages = await page.$$('[data-message-author-role="assistant"]');
    const currentMessageCount = assistantMessages.length;
    if (currentMessageCount > messageCount) {
      const lastMessage = assistantMessages[assistantMessages.length - 1];
      const isThinking = await lastMessage.$(".result-thinking");
      if (!isThinking) {
        lastMessageId = await page.evaluate((element) => element.getAttribute("data-message-id"), lastMessage);
        messageCount = currentMessageCount;
        return;
      }
    }
    await sleep(100);
  }
  console.log("Timed out waiting for the initial response.");
}

/**
 * Handles streaming response from the assistant, printing output as it arrives.
 *
 * @param {import('puppeteer').Page} page - Puppeteer page instance.
 * @returns {Promise<void>} Resolves when streaming is complete.
 */
async function handleStreamingResponse(page) {
  let previousText = "";
  let completeResponse = "";
  let newContentDetected = false;
  while (!newContentDetected) {
    const assistantMessages = await page.$$('[data-message-author-role="assistant"]');
    if (assistantMessages.length > 0) {
      const lastMessage = assistantMessages[assistantMessages.length - 1];
      const currentMessageId = await page.evaluate((element) => element.getAttribute("data-message-id"), lastMessage);
      if (currentMessageId === lastMessageId) {
        const currentText = await page.evaluate((element) => element.textContent, lastMessage);
        console.log(`Current text: ${currentText}`);
        if (currentText !== previousText) {
          if (is_streaming) {
            process.stdout.write(currentText.slice(previousText.length));
          } else {
            completeResponse += currentText.slice(previousText.length);
          }
        }
        previousText = currentText;
        const isStreaming = await lastMessage.$(".result-streaming");
        if (!isStreaming) {
          newContentDetected = true;
        }
      } else {
        lastMessageId = currentMessageId;
      }
    }
    await sleep(100);
  }

  if (!is_streaming) {
    console.log(completeResponse.trim());
    console.log("\n\n");
    const responseFile = path.join(process.cwd(), "tmp/response.txt");
    fs.ensureDirSync(path.dirname(responseFile));
    fs.writeFileSync(responseFile, completeResponse.trim());
    console.log("Response saved to tmp/response.txt");
  }
}

async function main() {
  const browser = await puppeteer.use(StealthPlugin()).launch({ headless: false });
  const page = (await browser.pages()).length > 0 ? (await browser.pages())[0] : await browser.newPage();

  const url = "https://chat.openai.com";
  const navigate = await navigatePage(page, url);

  // Write question
  if (questionFile) {
    question = fs.readFileSync(questionFile, { encoding: "utf-8" });
    // Replace newlines with escaped newlines for HTML compatibility
    question = question.replace(/\r?\n/g, "\\n");
  }
  await writeQuestion(page, question);

  // Submit the question
  await clickSubmitButton(page);

  await navigate.waitForDomIdle(1000, 30000); // Wait for DOM to stabilize

  // Wait for the initial response
  await waitForInitialResponse(page);
  // Handle the streaming response
  await handleStreamingResponse(page);

  // Save cookies for this host at the end
  await saveCookies(page, getCookiePathForUrl(url));

  // Close the browser
  await browser.close();
}

main();
