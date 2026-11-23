<?php

/**
 * Workflow Badge PHP Backend
 *
 * Spawns the Node CLI (workflow-badge) to generate a detailed SVG badge
 * for the latest GitHub Actions workflow run, then serves it as an image.
 *
 * Works in two modes:
 *   - Web: parameters come from the query string (GET) or form body (POST)
 *   - CLI: parameters come from command-line flags (debug is always on)
 *
 * Parameters (query string / POST field / CLI flag, without the leading "--" on the web):
 *   owner      GitHub repository owner (required)
 *   repo       GitHub repository name (required)
 *   workflow   Workflow filename or ID to filter by (optional, e.g. "test.yml")
 *   token      GitHub access token (optional, overrides server env)
 *   width      SVG width in pixels, 200-2000 (optional, default: 520)
 *   max-steps  Max steps shown per job, 1-200 (optional, default: all)
 *   debug      Show PHP errors and extra diagnostics (optional, always on in CLI)
 *
 * Environment variables (set on the server):
 *   ACCESS_TOKEN | GITHUB_TOKEN | GH_TOKEN  GitHub token with actions:read scope
 *
 * Usage (web):
 *   <img src="https://your-domain.com/php_backend/workflow-badge.php?owner=user&repo=project" />
 *   <img src="https://your-domain.com/php_backend/workflow-badge.php?owner=user&repo=project&workflow=test.yml" />
 *   <img src="https://your-domain.com/php_backend/workflow-badge.php?owner=user&repo=project&debug=true" />
 *
 * Usage (CLI, both "--key=value" and "--key value" are accepted):
 *   php php_backend/workflow-badge.php --owner=user --repo=project
 *   php php_backend/workflow-badge.php --owner user --repo project --workflow build-release.yml
 *   php php_backend/workflow-badge.php --owner=user --repo=project > badge.svg
 *
 * Exit codes:
 *   0  Success (SVG written to stdout)
 *   1  Validation error, Node/CLI script not found, or badge generation failed
 */

// ─── Environment detection ────────────────────────────────────────
$isWindows = PHP_OS_FAMILY   === 'Windows';
$isCli     = php_sapi_name() === 'cli' || defined('STDIN');

// ─── CLI argument parsing ─────────────────────────────────────────
/**
 * Convert CLI flags into $_GET so the rest of the script is mode-agnostic.
 *
 * Supported forms:
 *   --key=value    explicit value
 *   --key value    value is the next argument (unless it starts with "--")
 *   --flag         bare flag, stored as "1" (e.g. --debug)
 *
 * @param array $argv Raw argument vector (script name at index 0)
 * @return void
 */
function parseCliArgs(array $argv) {
  $count = count($argv);
  for ($i = 1; $i < $count; $i++) {
    $arg = $argv[$i];
    if (strpos($arg, '--') !== 0 || $arg === '--') {
      continue; // ignore positional arguments
    }

    $arg = substr($arg, 2);
    if (strpos($arg, '=') !== false) {
      [$key, $value] = explode('=', $arg, 2);
      $_GET[$key]    = $value;
    } elseif (isset($argv[$i + 1]) && strpos($argv[$i + 1], '--') !== 0) {
      $_GET[$arg] = $argv[++$i];
    } else {
      $_GET[$arg] = '1';
    }
  }
}

if ($isCli && !empty($_SERVER['argv'])) {
  parseCliArgs($_SERVER['argv']);
}

// ─── Debug mode (always active on CLI, enabled via ?debug for web) ─
$debug = $isCli || isset($_GET['debug']) || isset($_POST['debug']);
if ($debug) {
  ini_set('display_errors', '1');
  ini_set('display_startup_errors', '1');
  error_reporting(E_ALL);
}

// ─── Helpers ──────────────────────────────────────────────────────
/**
 * Abort with a plain-text error message and a non-zero exit code.
 *
 * @param int    $status  HTTP status code (ignored on CLI, which exits with 1)
 * @param string $message Message shown to the caller
 * @return void
 */
function fail($status, $message) {
  global $isCli;
  if (!$isCli) {
    http_response_code($status);
    header('Content-Type: text/plain; charset=utf-8');
  }
  echo rtrim($message) . "\n";
  exit(1);
}

// ─── CORS ───────────────────────────────────────────────────────────
/**
 * Allow cross-origin requests with full preflight OPTIONS handling.
 * Does nothing on CLI.
 *
 * @param bool $disableBrowserCache Also emit no-cache headers (default: false)
 * @return void
 */
function allowCors($disableBrowserCache = false) {
  global $isCli;
  if ($isCli) {
    return;
  }

  if ($disableBrowserCache) {
    header('Expires: Tue, 01 Jan 2000 00:00:00 GMT');
    header('Last-Modified: ' . gmdate('D, d M Y H:i:s') . ' GMT');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Cache-Control: post-check=0, pre-check=0', false);
    header('Pragma: no-cache');
  }

  if (isset($_SERVER['HTTP_ORIGIN'])) {
    header('Access-Control-Allow-Origin: ' . $_SERVER['HTTP_ORIGIN']);
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400');
  } else {
    header('Access-Control-Allow-Origin: *');
  }

  if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD'])) {
      header('Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE');
    }
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'])) {
      header('Access-Control-Allow-Headers: ' . $_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']);
    }
    http_response_code(200);
    exit();
  }
}

allowCors();

// ─── Find Node binary path ────────────────────────────────────────
/**
 * Locate the Node.js executable.
 *
 * Order of resolution:
 *   1. "where node" (Windows) or "which node" (Unix) from the current PATH
 *   2. Well-known installation paths for the current OS
 *
 * @param bool $isWindows Whether PHP is running on Windows
 * @return string Absolute path to node, or an empty string if not found
 */
function findNodeBinary($isWindows) {
  // 1. Ask the OS (shell_exec may be disabled on shared hosting)
  if (function_exists('shell_exec')) {
    $lookup = $isWindows ? 'where node 2>NUL' : 'which node 2>/dev/null';
    $output = trim((string) @shell_exec($lookup));
    if ($output !== '') {
      // "where" can return several matches, one per line: take the first
      $lines = preg_split('/\r\n|\r|\n/', $output);
      $first = trim($lines[0]);
      if ($first !== '' && file_exists($first)) {
        return $first;
      }
    }
  }

  // 2. Fallback to common installation paths
  if ($isWindows) {
    $candidates = [];
    foreach (['ProgramFiles', 'ProgramFiles(x86)'] as $envVar) {
      $base = getenv($envVar);
      if ($base) {
        $candidates[] = $base . '\\nodejs\\node.exe';
      }
    }
    $localAppData = getenv('LOCALAPPDATA');
    if ($localAppData) {
      $candidates[] = $localAppData . '\\Programs\\nodejs\\node.exe';
    }
    $candidates[] = 'C:\\Program Files\\nodejs\\node.exe';
    $candidates[] = 'C:\\Program Files (x86)\\nodejs\\node.exe';
    $candidates[] = 'C:\\nvm4w\\nodejs\\node.exe'; // nvm-windows default symlink
    $username     = getenv('USERNAME');
    if ($username) {
      $candidates[] = 'C:\\Users\\' . $username . '\\AppData\\Local\\Programs\\nodejs\\node.exe';
    }
  } else {
    $candidates = [
      '/usr/local/nvm/versions/node/v22.18.0/bin/node',
      '/usr/local/bin/node',
      '/usr/bin/node',
    ];
  }

  foreach ($candidates as $candidate) {
    if (file_exists($candidate)) {
      return $candidate;
    }
  }

  return '';
}

$nodeBin = findNodeBinary($isWindows);
if ($nodeBin === '') {
  fail(500, 'Node binary not found (install Node.js or add it to PATH)');
}

// ─── Read input parameters ────────────────────────────────────────
// On CLI these were already copied into $_GET by parseCliArgs().
$owner    = trim($_GET['owner'] ?? $_POST['owner'] ?? '');
$repo     = trim($_GET['repo'] ?? $_POST['repo'] ?? '');
$workflow = trim($_GET['workflow'] ?? $_POST['workflow'] ?? '');
$width    = trim($_GET['width'] ?? $_POST['width'] ?? '');
$maxSteps = trim($_GET['max-steps'] ?? $_POST['max-steps'] ?? '');
$token    = trim($_GET['token'] ?? $_POST['token'] ?? '');

// ─── Validate required parameters ─────────────────────────────────
if ($owner === '' || $repo === '') {
  fail(400, 'Missing required parameters: --owner and --repo');
}

// Only allow safe characters in owner/repo (GitHub usernames + hyphens/dots)
if (!preg_match('/^[a-zA-Z0-9._-]+$/', $owner)) {
  fail(400, 'Invalid --owner parameter');
}
if (!preg_match('/^[a-zA-Z0-9._-]+$/', $repo)) {
  fail(400, 'Invalid --repo parameter');
}

// ─── Validate optional workflow filter ────────────────────────────
$workflowArg = [];
if ($workflow !== '') {
  if (!preg_match('/^[a-zA-Z0-9._\/-]+$/', $workflow)) {
    fail(400, 'Invalid --workflow parameter');
  }
  $workflowArg = ['--workflow', $workflow];
}

// ─── Validate optional numeric parameters ─────────────────────────
$widthArg = [];
if ($width !== '') {
  if (!ctype_digit($width) || intval($width) < 200 || intval($width) > 2000) {
    fail(400, 'Invalid --width (must be 200-2000)');
  }
  $widthArg = ['--width', $width];
}

$maxStepsArg = [];
if ($maxSteps !== '') {
  if (!ctype_digit($maxSteps) || intval($maxSteps) < 1 || intval($maxSteps) > 200) {
    fail(400, 'Invalid --max-steps (must be 1-200)');
  }
  $maxStepsArg = ['--max-steps', $maxSteps];
}

// ─── Locate the Node CLI script ───────────────────────────────────
// Checked in order: project source, built CJS bundle, installed npm package.
$projectRoot = dirname(__DIR__);
$cliScripts  = [
  $projectRoot . '/src/github-workflows/workflow-badge-cli.mjs',
  $projectRoot . '/lib/github-workflows/workflow-badge-cli.cjs',
  $projectRoot . '/node_modules/binary-collections/lib/github-workflows/workflow-badge-cli.cjs',
];
$cliScript = null;
foreach ($cliScripts as $script) {
  if (file_exists($script)) {
    $cliScript = $script;
    break;
  }
}

if ($cliScript === null) {
  fail(500, 'Server error: workflow-badge CLI not found (deploy the full project or run upload-backend)');
}

// ─── Build the command ────────────────────────────────────────────
$cmd  = $nodeBin;
$args = [
  '--no-warnings=ExperimentalWarning',
  $cliScript,
  '--owner', $owner,
  '--repo',  $repo,
];
if ($token !== '') {
  $args = array_merge($args, ['--token', $token]);
}
$args = array_merge($args, $widthArg, $maxStepsArg, $workflowArg);

// ─── Execute via proc_open (capture stdout separately from stderr) ─
// Passing the command as an array avoids shell interpolation entirely.
$descriptorSpec = [
  0 => ['pipe', 'r'],  // stdin  → pipe (we close immediately)
  1 => ['pipe', 'w'],  // stdout → pipe (SVG output)
  2 => ['pipe', 'w'],  // stderr → pipe (diagnostics, shown on failure)
];

$process = @proc_open([$cmd, ...$args], $descriptorSpec, $pipes, $projectRoot);

if (!is_resource($process)) {
  $message = "Server error: failed to start badge generator (command: $cmd)";
  if ($debug) {
    $message .= "\n"
      . 'disable_functions: ' . ini_get('disable_functions') . "\n"
      . 'open_basedir: ' . ini_get('open_basedir') . "\n"
      . "nodeBin: $nodeBin\n"
      . 'node exists: ' . (file_exists($nodeBin) ? 'yes' : 'no') . "\n"
      . "cliScript: $cliScript\n"
      . 'cliScript exists: ' . (file_exists($cliScript) ? 'yes' : 'no') . "\n"
      . "projectRoot: $projectRoot";
  }
  fail(500, $message);
}

// Close stdin immediately (nothing to send to the process)
fclose($pipes[0]);

// Read stdout (SVG content)
$stdout = stream_get_contents($pipes[1]);
fclose($pipes[1]);

// Read stderr (diagnostics)
$stderr = stream_get_contents($pipes[2]);
fclose($pipes[2]);

$returnCode = proc_close($process);

// ─── Validate output ──────────────────────────────────────────────
if ($returnCode !== 0) {
  $message = "Badge generator exited with code $returnCode";
  if (trim($stderr) !== '') {
    $message .= "\nError: " . trim($stderr);
  }
  fail(502, $message);
}

if (empty($stdout) || strpos($stdout, '<svg') === false) {
  $message = 'Badge generator returned unexpected output';
  if (trim($stderr) !== '') {
    $message .= "\nDiagnostics: " . trim($stderr);
  }
  fail(502, $message);
}

// ─── Serve the SVG ────────────────────────────────────────────────
if (!$isCli) {
  header('Content-Type: image/svg+xml; charset=utf-8');
  // Cache for 2 minutes (GitHub API data changes frequently)
  header('Cache-Control: public, max-age=120');
}
echo $stdout;
