<?php
/**
 * Workflow Badge PHP Backend
 *
 * Spawns the Node CLI (workflow-badge) to generate a detailed SVG badge
 * for the latest GitHub Actions workflow run, then serves it as an image.
 *
 * Query parameters (GET or POST):
 *   --owner     GitHub repository owner (required)
 *   --repo      GitHub repository name (required)
 *   --width     SVG width in pixels (optional, default: 520)
 *   --max-steps Max steps shown per job (optional, default: all)
 *
 * Environment variables (set on the server):
 *   ACCESS_TOKEN | GITHUB_TOKEN | GH_TOKEN  GitHub token with actions:read scope
 *
 * Usage:
 *   <img src="https://your-domain.com/backend/workflow-badge.php?owner=user&repo=project" />
 */

// ─── CORS (optional — uncomment if serving cross-origin) ──────────
// header('Access-Control-Allow-Origin: *');
// header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
// if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ─── Read input parameters ────────────────────────────────────────
$owner    = trim($_GET['owner']    ?? $_POST['owner']    ?? '');
$repo     = trim($_GET['repo']     ?? $_POST['repo']     ?? '');
$width    = trim($_GET['width']    ?? $_POST['width']    ?? '');
$maxSteps = trim($_GET['max-steps'] ?? $_POST['max-steps'] ?? '');

// ─── Validate required parameters ─────────────────────────────────
if (empty($owner) || empty($repo)) {
    http_response_code(400);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Missing required parameters: --owner and --repo\n";
    exit(1);
}

// Only allow safe characters in owner/repo (GitHub usernames + hyphens/dots)
if (!preg_match('/^[a-zA-Z0-9._-]+$/', $owner)) {
    http_response_code(400);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Invalid --owner parameter\n";
    exit(1);
}
if (!preg_match('/^[a-zA-Z0-9._-]+$/', $repo)) {
    http_response_code(400);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Invalid --repo parameter\n";
    exit(1);
}

// ─── Validate optional numeric parameters ─────────────────────────
$widthArg = [];
if (!empty($width)) {
    if (!ctype_digit($width) || intval($width) < 200 || intval($width) > 2000) {
        http_response_code(400);
        header('Content-Type: text/plain; charset=utf-8');
        echo "Invalid --width (must be 200-2000)\n";
        exit(1);
    }
    $widthArg = ['--width', $width];
}

$maxStepsArg = [];
if (!empty($maxSteps)) {
    if (!ctype_digit($maxSteps) || intval($maxSteps) < 1 || intval($maxSteps) > 200) {
        http_response_code(400);
        header('Content-Type: text/plain; charset=utf-8');
        echo "Invalid --max-steps (must be 1-200)\n";
        exit(1);
    }
    $maxStepsArg = ['--max-steps', $maxSteps];
}

// ─── Extend PATH for common install locations (NVM, etc.) ──────────
$nodeExtraPaths = array_filter([
    glob('/usr/local/nvm/versions/node/*/bin')[0] ?? null,
    glob('/usr/local/lib/nodejs/*/bin')[0] ?? null,
    '/usr/local/nvm/versions/node/v22.18.0/bin',
]);
if (!empty($nodeExtraPaths)) {
    putenv('PATH=' . implode(':', $nodeExtraPaths) . ':' . ($_SERVER['PATH'] ?? getenv('PATH')));
}

// ─── Locate the Node CLI script ───────────────────────────────────
$projectRoot = dirname(__DIR__);
$cliScripts = [
    $projectRoot . '/src/workflow-badge-cli.mjs',
    $projectRoot . '/workflow-badge-cli.mjs',
    $projectRoot . '/lib/workflow-badge-cli.cjs',
    $projectRoot . '/node_modules/binary-collections/lib/workflow-badge-cli.cjs',
];
$cliScript   = $projectRoot . '/src/workflow-badge-cli.mjs';
foreach ($cliScripts as $script) {
    if (file_exists($script)) {
        $cliScript = $script;
        break;
    }
}

if (!file_exists($cliScript)) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Server error: workflow-badge CLI not found (deploy the full project or run upload-backend)\n";
    exit(1);
}

$cmd  = 'node';
$args = [
    '--no-warnings=ExperimentalWarning',
    $cliScript,
    '--owner', $owner,
    '--repo',  $repo,
];
if (!empty($widthArg)) {
    $args = array_merge($args, $widthArg);
}
if (!empty($maxStepsArg)) {
    $args = array_merge($args, $maxStepsArg);
}

// ─── Execute via proc_open (capture stdout separately from stderr) ─
$descriptorSpec = [
    0 => ['pipe', 'r'],  // stdin  → pipe (we close immediately)
    1 => ['pipe', 'w'],  // stdout → pipe (SVG output)
    2 => ['pipe', 'w'],  // stderr → pipe (diagnostics, we log it)
];

$process = @proc_open([$cmd, ...$args], $descriptorSpec, $pipes, $projectRoot);

if (!is_resource($process)) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Server error: failed to start badge generator (command: $cmd)\n";
    exit(1);
}

// Close stdin immediately (nothing to send to the process)
fclose($pipes[0]);

// Read stdout (SVG content)
$stdout = stream_get_contents($pipes[1]);
fclose($pipes[1]);

// Read stderr (diagnostics — optionally log somewhere)
$stderr = stream_get_contents($pipes[2]);
fclose($pipes[2]);

$returnCode = proc_close($process);

// ─── Validate output ──────────────────────────────────────────────
if ($returnCode !== 0) {
    http_response_code(502);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Badge generator exited with code $returnCode\n";
    if (!empty(trim($stderr))) {
        echo "Error: " . trim($stderr) . "\n";
    }
    exit(1);
}

if (empty($stdout) || strpos($stdout, '<svg') === false) {
    http_response_code(502);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Badge generator returned unexpected output\n";
    if (!empty(trim($stderr))) {
        echo "Diagnostics: " . trim($stderr) . "\n";
    }
    exit(1);
}

// ─── Serve the SVG ────────────────────────────────────────────────
header('Content-Type: image/svg+xml; charset=utf-8');
// Cache for 2 minutes (GitHub API data changes frequently)
header('Cache-Control: public, max-age=120');
echo $stdout;
