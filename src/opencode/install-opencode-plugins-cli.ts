import fs from 'fs-extra';
import path from 'upath';
import spawn from 'cross-spawn';

interface Command {
  cmd: string;
  args: string[];
  skipIfExists?: string; // optional folder path to skip
}

// Paths relative to current working directory
const gitCloneDest = '.opencode/plugins/opencode-request-logger';

const commands: Command[] = [
  {
    cmd: 'git',
    args: ['clone', 'https://github.com/Opencode-DCP/opencode-request-logger.git', gitCloneDest],
    skipIfExists: gitCloneDest
  },
  {
    // Run after clone (or if folder already exists) to register the local plugin
    cmd: 'opencode',
    args: ['plugin', '.opencode/plugins/opencode-request-logger']
  },
  {
    cmd: 'opencode',
    args: [
      'plugin',
      'opencode-agent-memory@https://github.com/dimaslanjaka/opencode-file-memory/raw/refs/heads/main/release/opencode-agent-memory.tgz'
    ]
  },
  { cmd: 'opencode', args: ['plugin', '@tarquinen/opencode-smart-title@latest'] },
  { cmd: 'opencode', args: ['plugin', 'oh-my-opencode-slim@latest'] },
  { cmd: 'opencode', args: ['plugin', '@tarquinen/opencode-dcp@latest'] },
  { cmd: 'opencode', args: ['plugin', 'envsitter-guard@latest'] }
];

async function runCommand({ cmd, args, skipIfExists }: Command): Promise<void> {
  if (skipIfExists) {
    const folderPath = path.resolve(skipIfExists);
    if (await fs.pathExists(folderPath)) {
      console.log(`\nSkipping: ${cmd} ${args.join(' ')} (folder exists: ${folderPath})`);
      return;
    }
  }

  console.log(`\nRunning: ${cmd} ${args.join(' ')}`);
  await new Promise<void>((resolve, reject) => {
    const child = spawn(cmd + ' ' + args.map((a) => '"' + a.replace(/"/g, '\\"') + '"').join(' '), {
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code: number) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}

async function main() {
  try {
    for (const command of commands) {
      await runCommand(command);
    }
    console.log('\nAll commands executed successfully!');
  } catch (err) {
    console.error('\nError executing commands:', err);
    process.exit(1);
  }
}

main();
