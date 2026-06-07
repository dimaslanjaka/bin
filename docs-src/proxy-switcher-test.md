# Proxy Switcher Test

Tests whether the local proxy ports configured by [Proxy Switcher](https://www.proxyswitcher.com/) are functional. It attempts to reach `https://api.ipify.org` through both the local HTTP proxy (port 3128) and the local SOCKS5 proxy (port 1080), reporting success or failure for each.

## Usage

```bash
proxy-switcher-test [options]
```

### Options

| Flag                 | Description                                  | Default     |
| :------------------- | :------------------------------------------- | :---------- |
| `--http-port <port>` | Local HTTP proxy port                        | `3128`      |
| `--socks-port <port>`| Local SOCKS5 proxy port                      | `1080`      |
| `--host <host>`      | Local proxy host address                     | `127.0.0.1` |
| `-h`, `--help`       | Show this help message                       |             |

### Examples

```bash
# Use defaults (HTTP :3128, SOCKS5 :1080, 127.0.0.1)
proxy-switcher-test

# Custom ports
proxy-switcher-test --http-port 8888 --socks-port 9999

# Custom host
proxy-switcher-test --host 192.168.1.100 --http-port 3129

# Show help
proxy-switcher-test --help
```

The command runs both proxy tests automatically and exits with code `0` if at least one proxy works, or `1` if none work.

### Test Results

Each proxy is tested against `https://api.ipify.org?format=json` with a 10-second timeout:

- **Success** prints a checkmark, the proxy URL, the detected external IP address, HTTP status, and response time.
- **Failure** prints a cross, the proxy URL, the error message (connection refused, timeout, etc.), and response time.

A summary line shows how many of the two proxies passed (e.g., `Result: 1/2 proxies working`).

## How It Works

1. An HTTP request is sent through each configured local proxy using the appropriate agent:
   - **HTTP proxy** → `https-proxy-agent` (via `HttpsProxyAgent`)
   - **SOCKS5 proxy** → `socks-proxy-agent` (via `SocksProxyAgent`)
2. Axios is configured with `proxy: false` to disable its built-in proxy handling (the custom agent takes over).
3. If the response status is in the 2xx range, the proxy is considered working.

## Notes

- The script does **not** interact with the Proxy Switcher executable directly. It only tests the local proxy ports that Proxy Switcher configures (default `127.0.0.1:3128` for HTTP, `127.0.0.1:1080` for SOCKS5).
- Designed for Proxy Switcher Standard / Proxy Switcher PRO running on Windows.
- Requires the proxy software to be running and listening on the expected ports.
- Exit code indicates overall status: `0` (at least one proxy works), `1` (none work).

## Source

See [`src/proxy-switcher-test-cli.cjs`](../src/proxy-switcher-test-cli.cjs).
