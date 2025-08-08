import fs from "fs-extra";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import path from "upath";
import { pathToFileURL } from "url";

const COOKIE_DIR = path.join(process.cwd(), "tmp", "cookies");
const DEFAULT_COOKIE_PATH = path.join(COOKIE_DIR, "cookies.json");
fs.ensureDirSync(COOKIE_DIR);

async function saveCookies(page, path = DEFAULT_COOKIE_PATH) {
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
async function navigatePage(page, url) {
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

async function _restoreCookies(page, cookieFilePath = DEFAULT_COOKIE_PATH) {
  const cookies = loadCookies(cookieFilePath);
  if (cookies) {
    await page.setCookie(...cookies);
  }
}

async function writeQuestion(page, question) {
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

async function clickSubmitButton(page) {
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
    console.log(`Response saved to ${responseFile}`);
  }
}

/**
 * Checks if the user is logged into ChatGPT by checking if login button exists and is visible.
 *
 * @param {import('puppeteer').Page} page - Puppeteer page instance.
 * @returns {Promise<boolean>} True if logged in (no visible login button), false if not logged in.
 */
async function isLoggedIn(page) {
  const result = await page.evaluate(() => {
    const loginButton = document.querySelector('[data-testid="login-button"]');
    // User is NOT logged in if login button exists and is visible
    return !(loginButton && loginButton.offsetParent !== null);
  });

  // Ensure we always return a boolean
  return result === true;
}

/**
 * Creates a new Puppeteer browser instance with StealthPlugin enabled.
 * @param {Parameters<import("puppeteer-extra").VanillaPuppeteer["launch"]>[0]} browserOptions
 * @returns {Promise<import("puppeteer-extra").Browser>} The created browser instance.
 */
async function createBrowser(browserOptions = {}) {
  return await puppeteer
    .use(StealthPlugin())
    .launch({ headless: false, userDataDir: path.join(process.cwd(), "tmp/puppeteer-profile"), ...browserOptions });
}

async function loginToChatGpt() {
  const browser = await createBrowser({ headless: false });
  const page = (await browser.pages()).length > 0 ? (await browser.pages())[0] : await browser.newPage();

  const url = "https://chat.openai.com";
  const navigate = await navigatePage(page, url);

  // Wait for page to fully load before checking login status
  await navigate.waitForDomIdle(2000, 10000);

  // Check if the login button exists
  const loginButtonExists = await page.evaluate(() => {
    return document.querySelector('[data-testid="login-button"]') !== null;
  });

  if (loginButtonExists) {
    console.log("Login button found, clicking to log in...");
    await page.click('[data-testid="login-button"]');
    // Wait for the login process to complete
    await page.waitForNavigation({ waitUntil: "networkidle0" });
    console.log("Login process completed.");
  } else {
    console.log("No login required - user appears to be already logged in.");
  }
}

/**
 * Automates ChatGPT interactions using Puppeteer. Can send text questions or upload files to ChatGPT.
 *
 * @param {Object} [chatgptOptions={}] - Configuration options for ChatGPT automation.
 * @param {boolean} [chatgptOptions.headless=true] - Whether to run the browser in headless mode.
 * @param {string} [chatgptOptions.question] - Text question to send to ChatGPT. Either question or questionFile must be provided.
 * @param {string} [chatgptOptions.questionFile] - Path to a file to upload to ChatGPT. Either question or questionFile must be provided.
 * @returns {Promise<void>} Resolves when the ChatGPT interaction is complete. Responses are logged to console and saved to tmp/response.txt.
 * @throws {Error} Throws an error if neither question nor questionFile is provided.
 *
 * @example
 * // Send a text question
 * await runChatGpt({
 *   headless: false,
 *   question: "What is the capital of France?"
 * });
 *
 * @example
 * // Upload a file for analysis
 * await runChatGpt({
 *   headless: false,
 *   questionFile: "./path/to/document.txt"
 * });
 */
export async function runChatGpt(chatgptOptions = {}) {
  const headless = chatgptOptions.headless !== undefined ? chatgptOptions.headless : true;
  const questionFile = chatgptOptions.questionFile;
  let question = chatgptOptions.question;

  // Validate input parameters
  const noInputProvided = !question && !questionFile;
  const questionIsEmpty = question && question.trim().length === 0;
  const questionFileIsEmpty = questionFile && questionFile.trim().length === 0;

  if (noInputProvided || questionIsEmpty || questionFileIsEmpty) {
    throw new Error("You must provide a question or a question file.");
  }

  const browser = await createBrowser({ headless });
  /** @type {import('puppeteer').Page} */
  const page = (await browser.pages()).length > 0 ? (await browser.pages())[0] : await browser.newPage();

  const url = "https://chat.openai.com";
  const navigate = await navigatePage(page, url);

  // Check temporary chat - wait for page to load and try to click temporary chat button
  await navigate.waitForDomIdle(2000, 15000);

  try {
    const tempChatButton = await page.$('button[aria-label="Turn on temporary chat"]');
    if (tempChatButton) {
      await page.evaluate((el) => el.click(), tempChatButton);
      console.log("Successfully clicked temporary chat button");
      await navigate.waitForDomIdle(1000, 10000);
    } else {
      console.log("Temporary chat button not found, proceeding without it.");
    }
  } catch (error) {
    console.log(`Failed to click temporary chat button: ${error.message}`);
  }

  if (question) {
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
  } else if (questionFile) {
    // Wait for page to fully load before checking login status
    await navigate.waitForDomIdle(2000, 10000);

    // Check if logged in
    const isUserLoggedIn = await isLoggedIn(page);

    console.log(`Login status: ${isUserLoggedIn ? "Logged in" : "Not logged in"}`);
    if (!isUserLoggedIn) {
      console.log(
        "Not logged in. Please log in to ChatGPT in the browser window, then close it and run the command again."
      );
      return loginToChatGpt();
    }

    // Upload the question file
    const plusButton = await page.$('[data-testid="composer-plus-btn"]');
    if (plusButton) {
      await plusButton.click();
      await sleep(500); // Wait for the menu to open
      const menuItems = await page.$$('[role="menuitem"]');
      let clicked = false;
      for (const item of menuItems) {
        const text = await page.evaluate((el) => el.innerText, item);
        if (text && text.includes("Add photos") && text.includes("files")) {
          await item.hover();
          clicked = true;
          break;
        }
      }
      if (!clicked) {
        console.log('Could not find the "Add photos & files" menu item.');
        return;
      }

      // Wait for file input to appear and upload the file
      try {
        await sleep(1000); // Wait for file dialog to be ready

        // Look for the file input element
        const fileInput = await page.waitForSelector('input[type="file"]', { timeout: 10000 });
        if (fileInput) {
          console.log(`Uploading file: ${questionFile}`);
          await fileInput.uploadFile(questionFile);

          // Wait for the file to be processed
          await navigate.waitForDomIdle(2000, 15000);
          console.log("File uploaded successfully");

          // Optionally submit after file upload
          await clickSubmitButton(page);
          await navigate.waitForDomIdle(1000, 30000);

          // Wait for and handle response
          await waitForInitialResponse(page);
          await handleStreamingResponse(page);
        } else {
          console.log("Could not find file input element");
        }
      } catch (error) {
        console.log(`Error uploading file: ${error.message}`);
      }
    } else {
      console.log('Could not find the [data-testid="composer-plus-btn"] button.');
    }
  }

  // Close the browser
  await browser.close();
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    try {
      await runChatGpt({ headless: false, questionFile: path.join(process.cwd(), "tmp/gpt-question.txt") });
    } catch (error) {
      console.error("Error running ChatGPT:", error);
    }
  })();
}
