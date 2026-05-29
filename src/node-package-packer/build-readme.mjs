import fs from 'fs-extra';
import path from 'upath';
import * as crossSpawn from 'cross-spawn';
import { gitCommandHelper as gch } from 'git-command-helper';

/**
 * Build release readme for a node package
 * @param {string} dirname - repository root directory (equivalent to __dirname in CJS)
 * @param {object} packagejson - parsed package.json
 * @param {string} releaseDir - path to release directory
 * @param {object} argv - parsed CLI args (minimist)
 * @param {boolean} isCI - whether running in CI
 */
export async function buildReadme(dirname, packagejson, releaseDir, argv, isCI) {
  if (!fs.existsSync(path.join(dirname, '.git'))) {
    console.log('Not a git repository, skipping readme creation');
    return;
  }

  const spawnAsync = crossSpawn && typeof crossSpawn.async === 'function' ? crossSpawn.async : crossSpawn;

  if (isCI) {
    await spawnAsync('git', ['config', '--global', 'user.name', 'dimaslanjaka'], {
      cwd: dirname,
      stdio: 'inherit'
    });
    await spawnAsync('git', ['config', '--global', 'user.email', 'dimaslanjaka@gmail.com'], {
      cwd: dirname,
      stdio: 'inherit'
    });
  }

  const git = new gch(dirname);
  const branch = (await git.getbranch()).filter((o) => o.active)[0].branch;
  const gitlatest = await git.latestCommit();

  const tarballs = fs
    .readdirSync(releaseDir)
    .filter((str) => str.endsWith('tgz'))
    .map((str) => {
      return {
        absolute: path.resolve(releaseDir, str),
        relative: path.resolve(releaseDir, str).replace(path.toUnix(dirname), '')
      };
    })
    .filter((o) => fs.statSync(o.absolute).isFile());

  let md = `# Release \`${packagejson.name}\` tarball\n`;

  md += '## Releases\n';
  md += '| version | tarball url |\n';
  md += '| :--- | :--- |\n';
  for (let i = 0; i < tarballs.length; i++) {
    const tarball = tarballs[i];
    const relativeTarball = tarball.relative.replace(/^\/+/, '');
    if (!fs.existsSync(tarball.absolute)) {
      console.log(tarball.relative, 'not found');
      continue;
    }
    await spawnAsync('git', ['update-index', '--untracked-cache']);

    if (argv['commit']) {
      const checkIgnore = await git.isIgnored(relativeTarball, { cwd: dirname });
      if (checkIgnore) {
        console.log(relativeTarball, 'ignored by .gitignore');
        continue;
      } else {
        await git.add(relativeTarball);
        const args = ['status', '-uno', '--porcelain', '--', relativeTarball, '|', 'wc', '-l'];
        const isChanged =
          parseInt(
            (
              await spawnAsync('git', args, {
                cwd: dirname,
                shell: true
              })
            ).output.trim()
          ) > 0;
        if (isChanged) {
          await git.commit('chore(tarball): update ' + gitlatest, '-m', { stdio: 'pipe' });
        }
      }
    }

    const hash = await git.latestCommit(tarball.relative.replace(/^\/+/, ''));
    const raw = await git.getGithubRepoUrl(tarball.relative.replace(/^\/+/, ''));
    let tarballUrl;
    const dev = raw.rawURL;
    const prod = raw.rawURL.replace('/raw/' + branch, '/raw/' + hash);
    let ver = path.basename(tarball.relative, '.tgz').replace(`${packagejson.name}-`, '');
    if (typeof hash === 'string') {
      if (isNaN(parseFloat(ver))) {
        ver = 'latest';
        tarballUrl = dev;
        md += `| ${ver} | ${prod} |\n`;
      } else {
        tarballUrl = prod;
      }
      md += `| ${ver} | ${tarballUrl} |\n`;
    }
  }

  md += `\nuse this tarball with \`resolutions\`:\n`;
  md +=
    '```json\n{\n  "resolutions": {\n    "' +
    packagejson.name +
    '": "<url of tarball>"\n  }\n}\n```\n\n## Releases\n\n    ';

  fs.writeFileSync(
    path.join(releaseDir, 'readme.md'),
    (
      md +
      `\n\n## Get URL of \`${packagejson.name}\` Release Tarball\n- select tarball file\n![gambar](https://user-images.githubusercontent.com/12471057/203216375-8af4b5d9-00c2-40fb-8d3d-d220beaabd46.png)\n- copy raw url\n![gambar](https://user-images.githubusercontent.com/12471057/203216508-7590cbb9-a1ce-47d6-96ca-8d82149f0762.png)\n- or copy download url\n![gambar](https://user-images.githubusercontent.com/12471057/203216541-3807d2c3-5213-49f3-b93d-c626dbae3b2e.png)\n- then run installation from command line\n\n\`\`\`bash\nnpm i https://....url-tgz\n\`\`\`\nfor example\n\`\`\`bash\nnpm i https://github.com/dimaslanjaka/nodejs-package-types/raw/main/release/nodejs-package-types.tgz\n\`\`\`\n\n## URL Parts Explanations\n> https://github.com/github-username/github-repo-name/raw/github-branch-name/path-to-file-with-extension\n  `
    ).trim() + '\n'
  );
}

export default buildReadme;
