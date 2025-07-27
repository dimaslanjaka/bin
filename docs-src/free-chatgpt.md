# free-chatgpt.js

Automates browser interaction with ChatGPT using Puppeteer, including login, question submission, and response retrieval. Supports session persistence via cookies and flexible question input.

## Usage

```bash
# use npx
npx --yes binary-collections@https://raw.githubusercontent.com/dimaslanjaka/bin/master/releases/bin.tgz free-chatgpt

# use yarn dlx
yarn dlx binary-collections@https://raw.githubusercontent.com/dimaslanjaka/bin/master/releases/bin.tgz free-chatgpt
```

### Argument Options

- `--question, -q`   The question to ask ChatGPT (default: "Hello, ChatGPT!")
- `--qfile, -qf`     Path to a file containing the question text
- `--help, -h`       Show help message

## Notes

- Cookies are stored in `./tmp/cookies` for session reuse.
- Responses are saved to `./tmp/response.txt`.
- Requires access to `chat.openai.com` (firewall must allow connection).
- Uses Puppeteer with stealth plugin to avoid bot detection.
