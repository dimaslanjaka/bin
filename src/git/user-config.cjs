const { runGitCommand } = require("./utils.cjs");

/**
 * Configure Git user from CLI arguments or environment variables
 * @param {string|null} cliUser - Username from CLI arguments
 * @param {string|null} cliEmail - Email from CLI arguments
 */
function configureGitUser(cliUser = null, cliEmail = null) {
  console.log("\n=== Configuring Git User ===");

  // Determine user and email with CLI args taking precedence
  let username, email;

  if (cliUser && cliEmail) {
    username = cliUser.trim();
    email = cliEmail.trim();
    console.log("[i] Using CLI-provided user configuration");
  } else {
    username = process.env.GITHUB_USER?.trim();
    email = process.env.GITHUB_EMAIL?.trim();
    if (username || email) {
      console.log("[i] Using environment variable user configuration");
    }
  }

  if (!username && !email) {
    console.log("[i] No Git user configuration needed (no CLI args or environment variables set)");
    return;
  }

  if (username) {
    const success = runGitCommand(["config", "user.name", username], `Set Git username to "${username}"`);
    if (!success) {
      console.log("[i] Failed to set Git username, but continuing...");
    }
  } else {
    console.log("[i] No username provided, skipping username configuration");
  }

  if (email) {
    const success = runGitCommand(["config", "user.email", email], `Set Git email to "${email}"`);
    if (!success) {
      console.log("[i] Failed to set Git email, but continuing...");
    }
  } else {
    console.log("[i] No email provided, skipping email configuration");
  }

  if (username || email) {
    console.log("[✓] Git user configuration completed");
  }
}

module.exports = {
  configureGitUser
};
