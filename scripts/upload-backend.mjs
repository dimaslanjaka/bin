#!/usr/bin/env node

/**
 * Upload backend/*.php files to remote server via SFTP.
 *
 * Reads connection details from .vscode/sftp.json.
 * Uploads all PHP files from backend/ into {remotePath}/php_backend on the server.
 */

import { execSync } from 'child_process';
import fs from 'fs-extra';
import SftpClient from 'ssh2-sftp-client';
import { Client as SSHClient } from 'ssh2';
import path from 'upath';

const SFTP_CONFIG_PATH = path.resolve('.vscode/sftp.json');
const BACKEND_DIR = path.resolve('backend');

/**
 * Run multiple shell commands on a remote server via SSH.
 * Each command runs independently — failure of one does not block the next.
 * Extends PATH with common Node.js binary directories (NVM, etc.) — mirrors the
 * pattern from backend/workflow-badge.php.
 */
function execRemoteCommands(connectConfig, cwd, commands) {
  return new Promise((resolve, reject) => {
    const conn = new SSHClient();

    // Build PATH extension (same pattern as backend/workflow-badge.php)
    const pathSetup = `
# Extend PATH with common Node.js install locations
for _dir in /usr/local/nvm/versions/node/*/bin /usr/local/lib/nodejs/*/bin; do
  [ -d "$_dir" ] && PATH="$_dir:$PATH"
done
export PATH="/usr/local/nvm/versions/node/v22.18.0/bin:$PATH"
`.trim();

    conn.on('ready', () => {
      let index = 0;
      const runNext = () => {
        if (index >= commands.length) {
          conn.end();
          return resolve();
        }
        const cmd = commands[index++];
        const fullCommand = `${pathSetup} && cd "${cwd}" && (${cmd})`;

        conn.exec(fullCommand, (err, stream) => {
          if (err) {
            console.error(`  ✖ failed to start: ${cmd} — ${err.message}`);
            return runNext();
          }
          stream.on('close', () => runNext());
          stream.on('data', (data) => {
            process.stdout.write(data.toString());
          });
          stream.stderr.on('data', (data) => {
            process.stderr.write(data.toString());
          });
        });
      };
      runNext();
    });
    conn.on('error', reject);
    conn.connect(connectConfig);
  });
}

async function main() {
  // 1. Read SFTP config
  let sftpConfig;
  try {
    sftpConfig = await fs.readJson(SFTP_CONFIG_PATH);
  } catch (err) {
    console.error(`Failed to read ${SFTP_CONFIG_PATH}: ${err.message}`);
    process.exit(1);
  }

  // Resolve latest remote origin commit hash for provenance tracking
  let LATEST_REMOTE_COMMIT_HASH;
  try {
    LATEST_REMOTE_COMMIT_HASH = execSync('git ls-remote origin HEAD', {
      encoding: 'utf8',
      timeout: 15000
    }).split(/\s+/)[0];
    console.log(`Remote origin HEAD: ${LATEST_REMOTE_COMMIT_HASH}`);
  } catch (err) {
    console.error(`Failed to resolve remote origin commit hash: ${err.message}`);
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

  // 3. Build shared connection config
  const connectConfig = {
    host: sftpConfig.host,
    port: sftpConfig.port || 22,
    username: sftpConfig.username,
    password: sftpConfig.password,
    // Support private key auth if configured
    ...(sftpConfig.privateKeyPath ? { privateKey: await fs.readFile(sftpConfig.privateKeyPath, 'utf8') } : {})
  };

  // 4. Run pre-upload setup commands on remote server
  const setupCommands = [
    'npx --legacy-peer-deps -y binary-collections@https://raw.githubusercontent.com/dimaslanjaka/bin/master/releases/bin.tgz pkg-res-updater',
    'touch yarn.lock',
    `yarn add -D binary-collections@https://github.com/dimaslanjaka/bin/raw/${LATEST_REMOTE_COMMIT_HASH}/releases/bin.tgz`,
    'git restore package.json .vscode'
  ];
  console.log(`\nRunning setup commands on ${sftpConfig.host}:${sftpConfig.remotePath}...`);
  try {
    await execRemoteCommands(connectConfig, sftpConfig.remotePath, setupCommands);
    console.log('Setup commands completed successfully.\n');
  } catch (err) {
    console.error(`Setup commands failed: ${err.message}`);
    process.exit(1);
  }

  // 5. Connect via SFTP
  const client = new SftpClient();
  const remoteBase = path.join(sftpConfig.remotePath, 'php_backend');

  try {
    await client.connect(connectConfig);
    console.log(`Connected to ${sftpConfig.host}:${sftpConfig.port}`);

    // 6. Ensure remote directory exists
    await client.mkdir(remoteBase, true);
    console.log(`Ensured remote directory: ${remoteBase}`);

    // 7. Upload each file
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
