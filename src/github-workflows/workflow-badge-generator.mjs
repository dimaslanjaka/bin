/**
 * Detailed SVG badge generator for GitHub Actions workflow status.
 *
 * Produces a polished card-style SVG showing workflow run metadata,
 * per-job step breakdown, and aggregated status counts.
 *
 * @module github-workflows/workflow-badge-generator
 */

const COLORS = {
  success: '#2da44e',
  failure: '#cf222e',
  cancelled: '#656d76',
  skipped: '#656d76',
  inProgress: '#d4920b',
  pending: '#656d76',
  unknown: '#656d76',
  text: '#1f2328',
  textSecondary: '#656d76',
  border: '#d0d7de',
  bg: '#ffffff',
  cardBg: '#f6f8fa'
};

/**
 * Map a workflow run's status/conclusion to label + accent color.
 */
function getStatusMeta(run) {
  const { status, conclusion } = run;
  if (conclusion === 'success') return { label: 'Passing', color: COLORS.success };
  if (conclusion === 'failure') return { label: 'Failing', color: COLORS.failure };
  if (conclusion === 'cancelled') return { label: 'Cancelled', color: COLORS.cancelled };
  if (conclusion === 'skipped') return { label: 'Skipped', color: COLORS.skipped };
  if (status === 'in_progress') return { label: 'In Progress', color: COLORS.inProgress };
  if (status === 'queued' || status === 'pending') return { label: 'Pending', color: COLORS.pending };
  return { label: status || 'Unknown', color: COLORS.unknown };
}

/**
 * Escape special XML characters for safe SVG text embedding.
 */
function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Aggregate step statistics across all jobs.
 */
function countSteps(jobs) {
  let total = 0,
    passed = 0,
    failed = 0,
    skipped = 0,
    pending = 0;
  for (const job of jobs) {
    for (const step of job.steps || []) {
      total++;
      if (step.conclusion === 'success') passed++;
      else if (step.conclusion === 'failure') failed++;
      else if (step.conclusion === 'skipped') skipped++;
      else pending++;
    }
  }
  return { total, passed, failed, skipped, pending };
}

/**
 * Get color for a job status.
 */
function jobColor(job) {
  if (job.conclusion === 'success') return COLORS.success;
  if (job.conclusion === 'failure') return COLORS.failure;
  if (job.status === 'in_progress') return COLORS.inProgress;
  return COLORS.pending;
}

/**
 * Generate a detailed SVG badge for a GitHub Actions workflow run.
 *
 * @param {object}   run           - Workflow run object from the GitHub API
 * @param {object[]} jobs          - Array of job objects from the GitHub API
 * @param {object}   [options]
 * @param {number}   [options.width=520] - SVG width in pixels
 * @param {number}   [options.maxSteps]  - Max steps to show per job (rest summarized)
 * @returns {string} SVG markup
 */
export function generateBadge(run, jobs, options = {}) {
  const width = options.width || 520;
  const maxSteps = options.maxSteps;
  const { label: statusLabel, color: accentColor } = getStatusMeta(run);
  const steps = countSteps(jobs);

  const PAD = 20;
  const W = width;
  const RIGHT = width - PAD;
  const INNER_W = RIGHT - PAD; // usable inner width

  // --- helpers ---
  const els = [];

  /** Add raw SVG line(s) */
  const el = (str) => els.push(str);

  /**
   * Render metadata key-value row.
   * key appears left-aligned at LABEL_X, value at VALUE_X.
   */
  const LABEL_X = PAD;
  const VALUE_X = 110;
  let yCursor = 0;

  /** Render a horizontal divider line */
  const divider = () => {
    yCursor += 4;
    el(`<line x1="${PAD}" y1="${yCursor}" x2="${RIGHT}" y2="${yCursor}" stroke="${COLORS.border}" stroke-width="1"/>`);
    yCursor += 5;
  };

  /** Begin a new section heading */
  const sectionHeading = (text) => {
    yCursor += 8;
    el(
      `<text x="${PAD}" y="${yCursor + 13}" font-size="11" font-weight="700" fill="${COLORS.textSecondary}" letter-spacing="0.5">${esc(text)}</text>`
    );
    yCursor += 22;
  };

  // ==================================================================
  // ACCENT BAR
  // ==================================================================
  el(`<rect x="0" y="0" width="${W}" height="4" fill="${accentColor}"/>`);
  yCursor = 4;

  // ==================================================================
  // TITLE ROW — "Workflow Status" + status pill
  // ==================================================================
  yCursor += 14;
  const titleBaseline = yCursor + 15;
  el(
    `<text x="${PAD}" y="${titleBaseline}" font-size="15" font-weight="700" fill="${COLORS.text}">Workflow Status</text>`
  );

  // Status pill on the right
  const pillText = statusLabel;
  const pillTextW = pillText.length * 7.8 + 32; // approximate pixel width
  const pillX = RIGHT - pillTextW;
  const pillY = titleBaseline - 12;
  el(`<rect x="${pillX}" y="${pillY}" width="${pillTextW}" height="22" rx="11" fill="${accentColor}" opacity="0.12"/>`);
  el(`<circle cx="${pillX + 14}" cy="${titleBaseline - 2}" r="4.5" fill="${accentColor}"/>`);
  el(
    `<text x="${pillX + 24}" y="${titleBaseline + 1}" font-size="12" font-weight="600" fill="${accentColor}">${esc(pillText)}</text>`
  );

  yCursor = titleBaseline + 4;

  // ==================================================================
  // METADATA SECTION
  // ==================================================================
  divider();

  const metaRows = [
    { label: 'Workflow', value: run.name || '' },
    { label: 'Status', value: `${run.status}${run.conclusion ? ` (${run.conclusion})` : ''}` },
    { label: 'Branch', value: run.head_branch || '' },
    { label: 'Run ID', value: `#${run.id || ''}` }
  ];

  for (const row of metaRows) {
    const rowBaseline = yCursor + 14;
    el(
      `<text x="${LABEL_X}" y="${rowBaseline}" font-size="12" fill="${COLORS.textSecondary}">${esc(row.label)}</text>`
    );
    el(
      `<text x="${VALUE_X}" y="${rowBaseline}" font-size="13" fill="${COLORS.text}" font-weight="500">${esc(row.value)}</text>`
    );
    yCursor += 22;
  }

  // ==================================================================
  // JOBS SECTION
  // ==================================================================
  divider();
  sectionHeading('JOBS');

  for (const job of jobs) {
    const jColor = jobColor(job);
    const jStatus = job.conclusion || job.status;

    // --- Job card background ---
    el(`<rect x="${PAD}" y="${yCursor}" width="${INNER_W}" height="28" rx="6" fill="${COLORS.cardBg}"/>`);

    // --- Job name ---
    el(
      `<text x="${PAD + 10}" y="${yCursor + 18}" font-size="13" font-weight="600" fill="${COLORS.text}">${esc(job.name)}</text>`
    );

    // --- Job status dot + label (right-aligned) ---
    const jobStatusX = RIGHT - 14;
    el(`<circle cx="${jobStatusX - 16}" cy="${yCursor + 14}" r="3.5" fill="${jColor}"/>`);
    el(
      `<text x="${jobStatusX}" y="${yCursor + 18}" font-size="11" fill="${COLORS.textSecondary}" text-anchor="end">${esc(jStatus)}</text>`
    );

    yCursor += 34;

    // --- Steps ---
    if (job.steps && job.steps.length > 0) {
      const stepsToRender = maxSteps ? job.steps.slice(0, maxSteps) : job.steps;
      const hiddenCount = maxSteps ? job.steps.length - maxSteps : 0;

      for (const step of stepsToRender) {
        const sIcon =
          step.conclusion === 'success'
            ? '\u2713' // ✓
            : step.conclusion === 'failure'
              ? '\u2717' // ✗
              : step.conclusion === 'skipped'
                ? '\u2013' // –
                : '\u25CB'; // ◌
        const sColor =
          step.conclusion === 'success'
            ? COLORS.success
            : step.conclusion === 'failure'
              ? COLORS.failure
              : step.conclusion === 'skipped'
                ? COLORS.textSecondary
                : COLORS.inProgress;

        // Icon
        el(`<text x="${PAD + 18}" y="${yCursor + 13}" font-size="12" fill="${sColor}">${sIcon}</text>`);

        // Step name (truncated)
        let stepName = step.name || '';
        const maxChars = 52;
        if (stepName.length > maxChars) {
          stepName = stepName.slice(0, maxChars - 3) + '...';
        }
        el(`<text x="${PAD + 36}" y="${yCursor + 13}" font-size="12" fill="${COLORS.text}">${esc(stepName)}</text>`);

        // Step status (right)
        const stepStatus = step.conclusion || step.status || '';
        el(
          `<text x="${RIGHT}" y="${yCursor + 13}" font-size="11" fill="${COLORS.textSecondary}" text-anchor="end">${esc(stepStatus)}</text>`
        );

        yCursor += 20;
      }

      // Show "and N more..." if steps were truncated
      if (hiddenCount > 0) {
        el(
          `<text x="${PAD + 18}" y="${yCursor + 13}" font-size="12" fill="${COLORS.textSecondary}" font-style="italic">and ${hiddenCount} more step${hiddenCount !== 1 ? 's' : ''}...</text>`
        );
        yCursor += 20;
      }

      yCursor += 4; // space after job steps
    }
  }

  // ==================================================================
  // FOOTER — step count summary
  // ==================================================================
  divider();

  const footerParts = [];
  if (steps.passed > 0) footerParts.push(`${steps.passed} \u2713 passed`);
  if (steps.failed > 0) footerParts.push(`${steps.failed} \u2717 failed`);
  if (steps.pending > 0) footerParts.push(`${steps.pending} \u25CB pending`);
  if (steps.skipped > 0) footerParts.push(`${steps.skipped} \u2013 skipped`);

  const footerText = footerParts.length > 0 ? footerParts.join('  \u00B7  ') : 'No steps recorded';
  el(`<text x="${PAD}" y="${yCursor + 13}" font-size="12" fill="${COLORS.textSecondary}">${esc(footerText)}</text>`);
  yCursor += 22;

  // ==================================================================
  // ASSEMBLE SVG
  // ==================================================================
  const totalHeight = yCursor + 6;

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${totalHeight}" viewBox="0 0 ${W} ${totalHeight}" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Noto Sans,Helvetica,Arial,sans-serif">`,
    `  <defs>`,
    `    <filter id="badge-shadow" x="-2%" y="-2%" width="104%" height="104%">`,
    `      <feDropShadow dx="0" dy="1" stdDeviation="3" flood-color="#000" flood-opacity="0.12"/>`,
    `    </filter>`,
    `  </defs>`,
    `  <rect x="0.5" y="0.5" width="${W - 1}" height="${totalHeight - 1}" rx="8" fill="${COLORS.bg}" stroke="${COLORS.border}" stroke-width="1" filter="url(#badge-shadow)"/>`,
    ...els,
    `</svg>`
  ].join('\n');

  return svg;
}
