#!/usr/bin/env node

import { mainGitDiff } from './git-diff.js';

(async () => {
  await mainGitDiff();
})();
