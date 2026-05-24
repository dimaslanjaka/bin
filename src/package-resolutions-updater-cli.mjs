import ansiColors from 'ansi-colors';
import fs from 'fs';
import path from 'path';
import { resolvePackageResolutionUpdates } from './package-resolutions-updater.mjs';

// --- Main logic ---
(async () => {
  // 📌 Static override rules
  const specialPackageOverrides = [
    // SBG packages
    { pkg: 'sbg-utility', branch: 'sbg-utility', repo: 'static-blog-generator', owner: 'dimaslanjaka' },
    { pkg: 'sbg-api', branch: 'sbg-api', repo: 'static-blog-generator', owner: 'dimaslanjaka' },
    { pkg: 'instant-indexing', branch: 'instant-indexing', repo: 'static-blog-generator', owner: 'dimaslanjaka' },
    { pkg: 'sbg-server', branch: 'master', repo: 'static-blog-generator', owner: 'dimaslanjaka' },
    { pkg: 'sbg-cli', branch: 'master', repo: 'static-blog-generator', owner: 'dimaslanjaka' },
    { pkg: 'static-blog-generator', branch: 'master', repo: 'static-blog-generator', owner: 'dimaslanjaka' },

    // Hexo family
    // { pkg: "hexo", branch: "monorepo-v7", repo: "hexo", owner: "dimaslanjaka" },
    // { pkg: "hexo-util", branch: "monorepo-v7", repo: "hexo", owner: "dimaslanjaka" },

    { pkg: 'hexo-post-parser', branch: 'pre-release', repo: 'hexo-post-parser', owner: 'dimaslanjaka' },
    { pkg: 'hexo-seo', branch: 'pre-release', repo: 'hexo-seo', owner: 'dimaslanjaka' },
    { pkg: 'hexo-is', branch: 'master', repo: 'hexo-is', owner: 'dimaslanjaka' },
    { pkg: 'markdown-it', branch: 'master', repo: 'markdown-it', owner: 'dimaslanjaka' },
    { pkg: 'hexo-renderers', branch: 'pre-release', repo: 'hexo-renderers', owner: 'dimaslanjaka' },
    { pkg: 'hexo-shortcodes', branch: 'pre-release', repo: 'hexo-shortcodes', owner: 'dimaslanjaka' },
    { pkg: 'google-news-sitemap', branch: 'master', repo: 'google-news-sitemap', owner: 'dimaslanjaka' },
    { pkg: 'git-command-helper', branch: 'pre-release', repo: 'git-command-helper', owner: 'dimaslanjaka' },

    {
      pkg: 'nodejs-package-types',
      branch: 'main',
      repo: 'nodejs-package-types',
      owner: 'dimaslanjaka'
    },

    { pkg: 'cross-spawn', branch: 'private', repo: 'node-cross-spawn', owner: 'dimaslanjaka' },
    { pkg: 'hexo-generator-redirect', branch: 'master', repo: 'hexo-generator-redirect', owner: 'dimaslanjaka' },
    { pkg: 'binary-collections', branch: 'master', repo: 'bin', owner: 'dimaslanjaka' },

    // { pkg: "@types/hexo", branch: "monorepo-v7", repo: "hexo", owner: "dimaslanjaka" },

    { pkg: '@types/git-command-helper', branch: 'pre-release', repo: 'git-command-helper', owner: 'dimaslanjaka' }
  ];

  // --- Load package.json ---
  const pkgPath = path.join(process.cwd(), 'package.json');

  let pkg;

  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  } catch (e) {
    console.error(ansiColors.red(`Failed to read package.json: ${e.message}`));

    process.exit(1);
  }

  const entries = Object.entries(pkg.resolutions || {});

  if (entries.length === 0) {
    console.log(ansiColors.yellow('No resolutions found in package.json'));

    return;
  }

  console.log(`⚙️  Processing ${entries.length} resolution(s)...`);

  const updates = await resolvePackageResolutionUpdates(pkg.resolutions, specialPackageOverrides);

  const validUpdates = updates.filter((u) => !u.skipped && !u.failed);

  for (const update of updates) {
    if (update.skipped) {
      console.log(`⏭️  Skipping ${ansiColors.yellow(update.currentPkgName)}: ${update.error.message}`);
    }

    if (update.failed) {
      console.log(`❌ Failed to process ${ansiColors.red(update.currentPkgName)}: ${update.error.message}`);
    }
  }
  // Add a separator before the summary
  console.log('');

  if (validUpdates.length === 0) {
    console.log(ansiColors.yellow('No GitHub URLs were processed'));

    return;
  }

  console.log(`📝 Applying updates to ${validUpdates.length} GitHub URL(s)...`);

  let changed = false;

  for (const { currentPkgName, url, new_url, repo, latest } of validUpdates) {
    if (url !== new_url) {
      console.log(`${ansiColors.cyan(currentPkgName)}:`);
      console.log('  from:', url.replace(repo.branch, ansiColors.red(repo.branch)));
      console.log('    to:', new_url.replace(latest.sha, ansiColors.green(latest.sha)));

      pkg.resolutions[currentPkgName] = new_url;

      changed = true;
    } else {
      console.log(`${ansiColors.cyan(currentPkgName)}: ${ansiColors.gray('already up-to-date')}`);
    }
  }

  console.log('\n📌 Summary:');

  if (changed) {
    try {
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

      console.log(`✅ package.json updated successfully`);
    } catch (e) {
      console.error(ansiColors.red(`Failed to write package.json: ${e.message}`));

      process.exit(1);
    }
  } else {
    console.log(ansiColors.green('No changes to package.json were necessary.'));
  }
})();
