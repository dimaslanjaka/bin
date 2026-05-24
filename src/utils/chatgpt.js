import fs from 'fs-extra';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'upath';

const COOKIE_DIR = path.join(process.cwd(), 'tmp', 'cookies');
const DEFAULT_COOKIE_PATH = path.join(COOKIE_DIR, 'cookies.json');
const NAVIGATION_TIMEOUT_MS = 90000;
const NETWORK_IDLE_TIMEOUT_MS = 15000;
const MAX_INLINE_QUESTION_FILE_BYTES = 2 * 1024;
fs.ensureDirSync(COOKIE_DIR);

/**
 * Navigates to a page with a resilient strategy for apps that keep long-lived network connections.
 *
 * @param {import('puppeteer').Page} page - Puppeteer page instance.
 * @param {string} url - URL to navigate to.
 * @returns {Promise<void>} Resolves when the page is at least DOM-ready.
 */
async function gotoWithFallback(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS });

  // Best effort: settle initial bursty requests without hard-failing on persistent streams.
  try {
    await page.waitForNetworkIdle({ idleTime: 1000, timeout: NETWORK_IDLE_TIMEOUT_MS });
  } catch {
    // Ignore network-idle timeouts because ChatGPT keeps active connections open.
  }
}

/**
 * Saves cookies from a Puppeteer page to a specified file path.
 *
 * @param {import('puppeteer').Page} page - Puppeteer page instance.
 * @param {string} [path=DEFAULT_COOKIE_PATH] - Path to save the cookies file.
 * @returns {Promise<void>} Resolves when cookies are saved.
 */
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

  // Navigate with fallback for pages that keep persistent network connections.
  await gotoWithFallback(page, url);

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

    throw new Error('DOM did not stabilize within timeout');
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

/**
 * Restores cookies from a file to a Puppeteer page.
 *
 * @param {import('puppeteer').Page} page - Puppeteer page instance.
 * @param {string} [cookieFilePath=DEFAULT_COOKIE_PATH] - Path to the cookie file.
 * @returns {Promise<void>} Resolves when cookies are restored.
 */
async function _restoreCookies(page, cookieFilePath = DEFAULT_COOKIE_PATH) {
  const cookies = loadCookies(cookieFilePath);
  if (cookies) {
    await page.setCookie(...cookies);
  }
}

/**
 * Writes a question to the ChatGPT prompt textarea, handling multi-line questions.
 *
 * @param {import('puppeteer').Page} page - Puppeteer page instance.
 * @param {string} question - The question text to write.
 * @returns {Promise<void>} Resolves when the question is written.
 */
async function writeQuestion(page, question) {
  const promptTextarea = await page.waitForSelector('#prompt-textarea', { timeout: 30000 });
  if (!promptTextarea) {
    console.log(
      'Cannot find the prompt input on the webpage. Please check whether you have access to chat.openai.com without logging in via your browser.'
    );
    return;
  }

  // Inject the full prompt instantly and emit input-like events so the UI reacts.
  await page.evaluate((text) => {
    const promptEl = document.querySelector('#prompt-textarea');
    if (!promptEl) {
      return;
    }

    promptEl.focus();
    promptEl.innerHTML = '';

    const lines = String(text).split('\n');
    for (const line of lines) {
      const p = document.createElement('p');
      p.textContent = line;
      promptEl.appendChild(p);
    }

    promptEl.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, inputType: 'insertFromPaste', data: text }));
    promptEl.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste', data: text }));
    promptEl.dispatchEvent(new Event('change', { bubbles: true }));
  }, question);

  // If the app state did not pick up the DOM injection, use keyboard insertion as a reliable fallback.
  const hasPromptText = await page.evaluate(() => {
    const promptEl = document.querySelector('#prompt-textarea');
    return Boolean(promptEl && promptEl.textContent && promptEl.textContent.trim().length > 0);
  });

  if (!hasPromptText) {
    console.log('Prompt state not updated by DOM injection. Falling back to keyboard insertText.');
    await promptTextarea.click({ clickCount: 1 });
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.insertText(question);
  }
}

/**
 * Clicks the submit button in ChatGPT interface, trying different button variants.
 *
 * @param {import('puppeteer').Page} page - Puppeteer page instance.
 * @returns {Promise<boolean>} Resolves to true when submission is detected, otherwise false.
 */
async function clickSubmitButton(page) {
  console.log('Attempting to click the submit button...');
  try {
    const userMessageCountBefore = await page.$$eval(
      '[data-message-author-role="user"]',
      (elements) => elements.length
    );

    const waitForSubmit = async (timeout = 5000) => {
      try {
        await page.waitForFunction(
          (previousCount) => {
            const currentCount = document.querySelectorAll('[data-message-author-role="user"]').length;
            return currentCount > previousCount;
          },
          { timeout },
          userMessageCountBefore
        );
        return true;
      } catch {
        return false;
      }
    };

    await page
      .waitForFunction(
        () => {
          const candidates = [
            document.querySelector('[data-testid="fruitjuice-send-button"]'),
            document.querySelector('#composer-submit-button'),
            document.querySelector('[data-testid="send-button"]')
          ].filter(Boolean);

          return candidates.some((button) => {
            const isDisabled = button.disabled || button.getAttribute('aria-disabled') === 'true';
            const isVisible = button.offsetParent !== null;
            return !isDisabled && isVisible;
          });
        },
        { timeout: 5000 }
      )
      .catch(() => {
        // Continue to diagnostics below even if no enabled button was found within timeout.
      });

    const buttonDetails = await page.evaluate(() => {
      const selectors = [
        '[data-testid="fruitjuice-send-button"]',
        '#composer-submit-button',
        '[data-testid="send-button"]'
      ];

      const details = selectors.map((selector) => {
        const el = document.querySelector(selector);
        const exists = Boolean(el);
        const disabled = exists ? Boolean(el.disabled || el.getAttribute('aria-disabled') === 'true') : null;
        const visible = exists ? el.offsetParent !== null : null;
        return { selector, exists, disabled, visible };
      });

      return details;
    });

    console.log(`Submit button details: ${JSON.stringify(buttonDetails)}`);
    const clickable = buttonDetails.find((item) => item.exists && item.visible && item.disabled === false);
    const selectedSelector = clickable ? clickable.selector : null;

    if (selectedSelector) {
      await page.click(selectedSelector);
      console.log(`Clicked submit button selector: ${selectedSelector}`);

      if (await waitForSubmit(5000)) {
        console.log('Submission detected after selector click.');
        return true;
      }

      // Fallback: force a DOM click in case pointer-interception blocked page.click.
      const forcedClickWorked = await page.evaluate((selector) => {
        const el = document.querySelector(selector);
        if (!el) {
          return false;
        }

        el.click();
        return true;
      }, selectedSelector);

      if (forcedClickWorked) {
        console.log(`Forced DOM click on selector: ${selectedSelector}`);
        if (await waitForSubmit(5000)) {
          console.log('Submission detected after forced DOM click.');
          return true;
        }
      }
    }

    console.log('Submit button path did not submit. Trying Enter key fallback on prompt.');
    await page.focus('#prompt-textarea');
    await page.keyboard.press('Enter');
    if (await waitForSubmit(5000)) {
      console.log('Submission detected after Enter key fallback.');
      return true;
    }

    // Final fallback: submit the nearest composer form.
    const didRequestSubmit = await page.evaluate(() => {
      const prompt = document.querySelector('#prompt-textarea');
      if (!prompt) {
        return false;
      }

      const form = prompt.closest('form');
      if (!form) {
        return false;
      }

      if (typeof form.requestSubmit === 'function') {
        form.requestSubmit();
      } else {
        form.submit();
      }
      return true;
    });

    if (didRequestSubmit) {
      console.log('Triggered form submit fallback.');
      if (await waitForSubmit(5000)) {
        console.log('Submission detected after form submit fallback.');
        return true;
      }
    }

    console.log('Failed to submit prompt after all strategies.');
    return false;
  } catch (e) {
    console.log(`Failed to click the send button: ${e}`);
    return false;
  }
}

let lastMessageId = null;
let messageCount = 0;
const is_streaming = false; // Set to true if you want to stream the response

/**
 * Creates a promise that resolves after a specified number of milliseconds.
 *
 * @param {number} ms - The number of milliseconds to wait.
 * @returns {Promise<void>} A promise that resolves after the specified delay.
 */
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
      const isThinking = await lastMessage.$('.result-thinking');
      if (!isThinking) {
        lastMessageId = await page.evaluate((element) => element.getAttribute('data-message-id'), lastMessage);
        messageCount = currentMessageCount;
        return;
      }
    }
    await sleep(100);
  }
  console.log('Timed out waiting for the initial response.');
}

/**
 * Handles streaming response from the assistant, printing output as it arrives.
 *
 * @param {import('puppeteer').Page} page - Puppeteer page instance.
 * @param {string} [outputFile] - Path to save the response. Defaults to tmp/response.txt.
 * @returns {Promise<void>} Resolves when streaming is complete.
 */
async function handleStreamingResponse(page, outputFile = path.join(process.cwd(), 'tmp/response.txt')) {
  let previousText = '';
  let completeResponse = '';
  let newContentDetected = false;
  while (!newContentDetected) {
    const assistantMessages = await page.$$('[data-message-author-role="assistant"]');
    if (assistantMessages.length > 0) {
      const lastMessage = assistantMessages[assistantMessages.length - 1];
      const currentMessageId = await page.evaluate((element) => element.getAttribute('data-message-id'), lastMessage);
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
        const isStreaming = await lastMessage.$('.result-streaming');
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
    console.log('\n\n');
    fs.ensureDirSync(path.dirname(outputFile));
    fs.writeFileSync(outputFile, completeResponse.trim());
    console.log(`Response saved to ${outputFile}`);
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
 *
 * @param {Parameters<import("puppeteer-extra").VanillaPuppeteer["launch"]>[0]} [browserOptions={}] - Browser launch options.
 * @returns {Promise<import("puppeteer-extra").Browser>} The created browser instance.
 */
async function createBrowser(browserOptions = {}) {
  const windowsChromeExecutable = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const hasWindowsChrome = process.platform === 'win32' && fs.existsSync(windowsChromeExecutable);

  /**
   * @type {Parameters<import("puppeteer-extra").VanillaPuppeteer["launch"]>[0]}
   */
  const defaultOptions = {
    headless: false,
    defaultViewport: null,
    userDataDir: path.join(process.cwd(), 'tmp/puppeteer-profile'),
    // Windows-specific options to handle browser launch issues
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
    ],
    ignoreDefaultArgs: ['--disable-extensions'],
    ...(hasWindowsChrome && {
      // Prefer local Chrome installation when present on Windows.
      executablePath: windowsChromeExecutable
    })
  };

  try {
    return await puppeteer.use(StealthPlugin()).launch({ ...defaultOptions, ...browserOptions });
  } catch (_error) {
    console.error('Failed to launch browser with default options. Trying fallback options...');

    // Fallback: Try with minimal options
    try {
      return await puppeteer.use(StealthPlugin()).launch({
        headless: browserOptions.headless || false,
        defaultViewport: null,
        args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox'],
        ignoreDefaultArgs: false,
        ...(hasWindowsChrome && {
          executablePath: windowsChromeExecutable
        }),
        ...browserOptions
      });
    } catch (fallbackError) {
      console.error('Browser launch failed completely. Common solutions:');
      console.error('1. Install Google Chrome if not installed');
      console.error('2. Update Node.js to the latest version');
      console.error('3. Try running: npm install puppeteer --force');
      console.error('4. Check if antivirus is blocking browser launch');
      throw new Error(`Browser launch failed: ${fallbackError.message}`);
    }
  }
}

/**
 * Handles the login process for ChatGPT by launching a browser and clicking the login button if needed.
 *
 * @returns {Promise<void>} Resolves when the login process is complete.
 */
async function loginToChatGpt() {
  const browser = await createBrowser({ headless: false });
  const page = (await browser.pages()).length > 0 ? (await browser.pages())[0] : await browser.newPage();

  const url = 'https://chat.openai.com';
  const navigate = await navigatePage(page, url);

  // Wait for page to fully load before checking login status
  await navigate.waitForDomIdle(2000, 10000);

  // Check if the login button exists
  const loginButtonExists = await page.evaluate(() => {
    return document.querySelector('[data-testid="login-button"]') !== null;
  });

  if (loginButtonExists) {
    console.log('Login button found, clicking to log in...');
    await page.click('[data-testid="login-button"]');
    // Wait for the login process to complete without requiring full network idleness.
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS });
    try {
      await page.waitForNetworkIdle({ idleTime: 1000, timeout: NETWORK_IDLE_TIMEOUT_MS });
    } catch {
      // Ignore: authentication pages can keep background connections active.
    }
    console.log('Login process completed.');
  } else {
    console.log('No login required - user appears to be already logged in.');
  }
}

/**
 * Automates ChatGPT interactions using Puppeteer. Can send text questions or upload files to ChatGPT.
 *
 * @param {Object} [chatgptOptions={}] - Configuration options for ChatGPT automation.
 * @param {boolean} [chatgptOptions.headless=true] - Whether to run the browser in headless mode.
 * @param {string} [chatgptOptions.question] - Text question to send to ChatGPT. Either question or questionFile must be provided.
 * @param {string} [chatgptOptions.questionFile] - Path to a file to upload to ChatGPT. Either question or questionFile must be provided.
 * @param {string} [chatgptOptions.responseFile] - Path to save the response. Defaults to tmp/response.txt.
 * @returns {Promise<void>} Resolves when the ChatGPT interaction is complete. Responses are logged to console and saved to specified file.
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
  let shouldUploadQuestionFile = Boolean(questionFile);
  const responseFile = chatgptOptions.responseFile || path.join(process.cwd(), 'tmp', 'response.txt');

  // Validate input parameters
  const noInputProvided = !question && !questionFile;
  const questionIsEmpty = question && question.trim().length === 0;
  const questionFileIsEmpty = questionFile && questionFile.trim().length === 0;

  if (noInputProvided || questionIsEmpty || questionFileIsEmpty) {
    throw new Error('You must provide a question or a question file.');
  }

  // For small files, send content as plain text to avoid file-upload login requirements.
  if (!question && questionFile) {
    if (!fs.existsSync(questionFile)) {
      throw new Error(`Question file does not exist: ${questionFile}`);
    }

    const questionFileStats = fs.statSync(questionFile);
    if (questionFileStats.size <= MAX_INLINE_QUESTION_FILE_BYTES) {
      question = fs.readFileSync(questionFile, 'utf8').trim();

      if (!question) {
        throw new Error('Question file is empty.');
      }

      shouldUploadQuestionFile = false;
      console.log(
        `Question file is ${questionFileStats.size} bytes (<= ${MAX_INLINE_QUESTION_FILE_BYTES}). Sending as text prompt.`
      );
    }
  }

  let browser;
  try {
    browser = await createBrowser({ headless });
  } catch (error) {
    console.error('Error running ChatGPT:', error);
    console.error('\nTroubleshooting steps:');
    console.error('1. Make sure Google Chrome is installed');
    console.error('2. Try running: yarn add puppeteer --force');
    console.error('3. Check if your antivirus is blocking the browser');
    console.error('4. Close any running Chrome instances and try again');
    throw error;
  }

  const allPages = await browser.pages();
  /** @type {import('puppeteer').Page} */
  const page = allPages.length > 0 ? allPages[0] : await browser.newPage();

  await page.bringToFront();

  // Close other pages if more than one page is open.
  if (allPages.length > 1) {
    for (const p of allPages) {
      if (p !== page) {
        await p.close();
      }
    }
  }

  try {
    const url = 'https://chat.openai.com';
    const navigate = await navigatePage(page, url);

    // Check temporary chat - wait for page to load and try to click temporary chat button
    await navigate.waitForDomIdle(2000, 15000);

    try {
      const tempChatButton = await page.$('button[aria-label="Turn on temporary chat"]');
      if (tempChatButton) {
        await page.evaluate((el) => el.click(), tempChatButton);
        console.log('Successfully clicked temporary chat button');
        await navigate.waitForDomIdle(1000, 10000);
      } else {
        console.log('Temporary chat button not found, proceeding without it.');
      }
    } catch (error) {
      console.log(`Failed to click temporary chat button: ${error.message}`);
    }

    if (question) {
      await writeQuestion(page, question);
      // Submit the question
      const didSubmit = await clickSubmitButton(page);
      if (!didSubmit) {
        throw new Error('Prompt was not submitted. The composer button may be disabled or blocked.');
      }
      await navigate.waitForDomIdle(1000, 30000); // Wait for DOM to stabilize

      // Wait for the initial response
      await waitForInitialResponse(page);
      // Handle the streaming response
      await handleStreamingResponse(page, responseFile);

      // Save cookies for this host at the end
      await saveCookies(page, getCookiePathForUrl(url));
    } else if (shouldUploadQuestionFile && questionFile) {
      // Wait for page to fully load before checking login status
      await navigate.waitForDomIdle(2000, 10000);

      // Check if logged in
      const isUserLoggedIn = await isLoggedIn(page);

      console.log(`Login status: ${isUserLoggedIn ? 'Logged in' : 'Not logged in'}`);
      if (!isUserLoggedIn) {
        console.log(
          'Not logged in. Please log in to ChatGPT in the browser window, then close it and run the command again.'
        );
        return loginToChatGpt();
      }

      // Upload the question file
      const plusButtonExists = await page.evaluate(() => {
        const button = document.querySelector('[data-testid="composer-plus-btn"]');
        return button !== null;
      });

      if (plusButtonExists) {
        await page.click('[data-testid="composer-plus-btn"]');
        await sleep(500); // Wait for the menu to open
        const menuItems = await page.$$('[role="menuitem"]');
        let clicked = false;
        for (const item of menuItems) {
          const text = await page.evaluate((el) => el.innerText, item);
          if (text && text.includes('Add photos') && text.includes('files')) {
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
            console.log('File uploaded successfully');

            // Optionally submit after file upload
            const didSubmit = await clickSubmitButton(page);
            if (!didSubmit) {
              throw new Error('Prompt was not submitted after file upload.');
            }
            await navigate.waitForDomIdle(1000, 30000);

            // Wait for and handle response
            await waitForInitialResponse(page);
            await handleStreamingResponse(page, responseFile);
          } else {
            console.log('Could not find file input element');
          }
        } catch (error) {
          console.log(`Error uploading file: ${error.message}`);
        }
      } else {
        console.log('Could not find the [data-testid="composer-plus-btn"] button.');
      }
    }
  } finally {
    // Always close the browser, even if an error occurred
    if (browser) {
      await browser.close();
    }
  }
}
