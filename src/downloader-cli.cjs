#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('upath');
const { getArgs } = require('./utils/index.cjs');
const axios = require('axios');

const args = getArgs({
  alias: { h: 'help' }
});

if (args.help) {
  console.log(`
Usage:
  node filename.js [url] [path optional]

Arguments:
  url              File URL to download
  path             Optional output path

Options:
  -h, --help       Show this help message

Examples:
  node filename.js https://example.com/file.zip

  node filename.js https://example.com/file.zip downloads/custom.zip
`);
  process.exit(0);
}

const inputUrl = args._[0];
let outputPath = args._[1];

if (!inputUrl) {
  console.error('Usage: downloader [url] [output-path]');
  console.error('  Use --help for more information.');
  process.exit(1);
}

function getFilenameFromUrl(urlString) {
  const url = new URL(urlString);

  let filename = path.basename(url.pathname);

  if (!filename || filename === '/') {
    filename = 'downloaded-file';
  }

  return filename;
}

if (!outputPath) {
  outputPath = getFilenameFromUrl(inputUrl);
}

outputPath = path.resolve(outputPath);

async function downloadFile(urlString, dest) {
  await fs.ensureDir(path.dirname(dest));

  const response = await axios({
    method: 'GET',
    url: urlString,
    responseType: 'stream',
    maxRedirects: 10
  });

  const writer = fs.createWriteStream(dest);

  return new Promise((resolve, reject) => {
    response.data.pipe(writer);

    writer.on('finish', () => resolve(dest));
    writer.on('error', reject);
  });
}

(async () => {
  try {
    console.log(`Downloading: ${inputUrl}`);
    console.log(`Saving to : ${outputPath}`);

    await downloadFile(inputUrl, outputPath);

    console.log('Download completed.');
  } catch (error) {
    console.error('Download failed:');
    console.error(error.message);
    process.exit(1);
  }
})();
