import { handleAuthRotate } from './auth-rotate.js';

process.env.DEBUG = 'true';

handleAuthRotate({ proxy: 'socks5://47.79.79.35:10808' }).catch((err) => {
  console.error('Error during auth rotation:', err);
  process.exit(1);
});
