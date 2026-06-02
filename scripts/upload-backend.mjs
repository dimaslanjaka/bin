#!/usr/bin/env node

/**
 * Upload backend/*.php files to remote server via SFTP.
 *
 * Reads connection details from .vscode/sftp.json.
 * Uploads all PHP files from backend/ into {remotePath}/php_backend on the server.
 */

import fs from 'fs-extra';
import SftpClient from 'ssh2-sftp-client';
import path from 'upath';

const SFTP_CONFIG_PATH = path.resolve('.vscode/sftp.json');
const BACKEND_DIR = path.resolve('backend');

async function main() {
  // 1. Read SFTP config
  let sftpConfig;
  try {
    sftpConfig = await fs.readJson(SFTP_CONFIG_PATH);
  } catch (err) {
    console.error(`Failed to read ${SFTP_CONFIG_PATH}: ${err.message}`);
    process.exit(1);
  }

  // 2. Discover PHP files
  let phpFiles;
  try {
    phpFiles = (await fs.readdir(BACKEND_DIR)).filter((f) => f.endsWith('.php'));
  } catch (err) {
    console.error(`Failed to read ${BACKEND_DIR}: ${err.message}`);
    process.exit(1);
  }

  if (phpFiles.length === 0) {
    console.log('No PHP files found in backend/ — nothing to upload.');
    process.exit(0);
  }

  // 3. Connect via SFTP
  const client = new SftpClient();
  const remoteBase = path.join(sftpConfig.remotePath, 'php_backend');
  const connectConfig = {
    host: sftpConfig.host,
    port: sftpConfig.port || 22,
    username: sftpConfig.username,
    password: sftpConfig.password,
    // Support private key auth if configured
    ...(sftpConfig.privateKeyPath ? { privateKey: await fs.readFile(sftpConfig.privateKeyPath, 'utf8') } : {})
  };

  try {
    await client.connect(connectConfig);
    console.log(`Connected to ${sftpConfig.host}:${sftpConfig.port}`);

    // 4. Ensure remote directory exists
    await client.mkdir(remoteBase, true);
    console.log(`Ensured remote directory: ${remoteBase}`);

    // 5. Upload each file
    for (const file of phpFiles) {
      const localPath = path.join(BACKEND_DIR, file);
      const remotePath = path.join(remoteBase, file).replace(/\\/g, '/');
      await client.fastPut(localPath, remotePath);
      console.log(`  ✔ ${file} → ${remotePath}`);
    }

    console.log(`\nUpload complete: ${phpFiles.length} file(s)`);
  } catch (err) {
    console.error(`Upload failed: ${err.message}`);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
