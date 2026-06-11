const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { getArgs } = require('./utils/index.cjs');

/** Script to test if ProxySwitcher.exe local port working or not */

const TEST_URL = 'https://api.ipify.org?format=json';

const argv = getArgs({
  string: ['http-port', 'socks-port', 'host'],
  alias: { h: 'help' },
  default: {
    'http-port': '3128',
    'socks-port': '1080',
    host: '127.0.0.1'
  }
});

if (argv.help) {
  console.log(`
Usage:
  proxy-switcher-test [options]

Options:
  --http-port <port>    Local HTTP proxy port (default: 3128)
  --socks-port <port>   Local SOCKS5 proxy port (default: 1080)
  --host <host>         Local proxy host (default: 127.0.0.1)
  -h, --help            Show this help message
`);
  process.exit(0);
}

const proxies = [
  {
    name: 'Local HTTP Proxy',
    type: 'http',
    url: `http://${argv.host}:${argv['http-port']}`
  },
  {
    name: 'Local SOCKS5 Proxy',
    type: 'socks5',
    url: `socks5://${argv.host}:${argv['socks-port']}`
  }
];

function createAgent(proxyUrl) {
  if (proxyUrl.startsWith('http://') || proxyUrl.startsWith('https://')) {
    return new HttpsProxyAgent(proxyUrl);
  }

  if (proxyUrl.startsWith('socks5://') || proxyUrl.startsWith('socks4://') || proxyUrl.startsWith('socks://')) {
    return new SocksProxyAgent(proxyUrl);
  }

  throw new Error(`Unsupported proxy URL: ${proxyUrl}`);
}

async function testProxy(proxy) {
  const startedAt = Date.now();

  try {
    const agent = createAgent(proxy.url);

    const response = await axios.get(TEST_URL, {
      httpAgent: agent,
      httpsAgent: agent,

      // Important: disable Axios built-in proxy handling,
      // because we are using custom proxy agents.
      proxy: false,

      timeout: 10000,
      validateStatus: () => true
    });

    const elapsed = Date.now() - startedAt;

    if (response.status >= 200 && response.status < 300) {
      console.log(`✅ ${proxy.name} working`);
      console.log(`   Proxy  : ${proxy.url}`);
      console.log(`   IP     : ${response.data?.ip || JSON.stringify(response.data)}`);
      console.log(`   Status : ${response.status}`);
      console.log(`   Time   : ${elapsed}ms`);
      console.log('');
      return true;
    }

    console.log(`❌ ${proxy.name} failed`);
    console.log(`   Proxy  : ${proxy.url}`);
    console.log(`   Status : ${response.status}`);
    console.log(`   Body   : ${JSON.stringify(response.data)}`);
    console.log(`   Time   : ${elapsed}ms`);
    console.log('');
    return false;
  } catch (err) {
    const elapsed = Date.now() - startedAt;

    console.log(`❌ ${proxy.name} not working`);
    console.log(`   Proxy  : ${proxy.url}`);
    console.log(`   Error  : ${err.message}`);
    console.log(`   Time   : ${elapsed}ms`);
    console.log('');
    return false;
  }
}

async function main() {
  let working = 0;

  for (const proxy of proxies) {
    const ok = await testProxy(proxy);

    if (ok) {
      working++;
    }
  }

  console.log(`Result: ${working}/${proxies.length} proxies working`);

  process.exit(working > 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// Provide a "default" alias for consumers that import the compiled ESM default
module.exports.default = module.exports;
