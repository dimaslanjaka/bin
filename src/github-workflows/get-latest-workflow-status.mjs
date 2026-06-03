// ─── Format output ────────────────────────────────────────────

function printReport(run, jobs) {
  console.log('\n==============================');
  console.log('🚀 Latest Workflow Run');
  console.log('==============================');
  console.log(`Name      : ${run.name}`);
  console.log(`Status    : ${run.status}`);
  console.log(`Conclusion: ${run.conclusion}`);
  console.log(`Branch    : ${run.head_branch}`);
  console.log(`Run ID    : ${run.id}`);
  console.log(`URL       : ${run.html_url}`);

  console.log('\n==============================');
  console.log('🧩 Jobs & Steps');
  console.log('==============================\n');

  for (const job of jobs) {
    console.log(`🧱 Job: ${job.name}`);
    console.log(`   Status: ${job.status} | Conclusion: ${job.conclusion}`);

    if (!job.steps?.length) {
      console.log('   (no steps found)\n');
      continue;
    }

    for (const step of job.steps) {
      const icon =
        step.conclusion === 'success'
          ? '✅'
          : step.conclusion === 'failure'
            ? '❌'
            : step.conclusion === 'skipped'
              ? '⏭️'
              : '⚪';

      console.log(`   ${icon} ${step.name} -> ${step.conclusion} (${step.status})`);
    }

    console.log('');
  }
}

export { printReport };
