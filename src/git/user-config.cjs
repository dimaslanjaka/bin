const gch = require("git-command-helper");
const { runGitCommand, runGitCommandOutput } = require("./utils.cjs");

/**
 * Configure Git user from CLI arguments or environment variables
 * @param {string|null} cliUser - Username from CLI arguments
 * @param {string|null} cliEmail - Email from CLI arguments
 * @param {object} [options] - Options object
 * @param {boolean} [options.updateRemote] - If true, update remote URL without prompt
 */
function configureGitUser(cliUser = null, cliEmail = null, options = {}) {
  console.log("\n=== Configuring Git User ===");

  // Determine user and email with CLI args taking precedence
  let username, email;

  if (cliUser && cliEmail) {
    username = cliUser.trim();
    email = cliEmail.trim();
    console.log("[i] Using CLI-provided user configuration");
  } else {
    username = process.env.GITHUB_USER ? process.env.GITHUB_USER.trim() : undefined;
    email = process.env.GITHUB_EMAIL ? process.env.GITHUB_EMAIL.trim() : undefined;
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

  if (username) {
    // Ask user to modify the origin remote URL if it doesn't match the username
    const remoteUrl = runGitCommandOutput(["remote", "get-url", "origin"], "Fetching remote URL for verification");
    if (remoteUrl) {
      console.log(`[i] Remote URL: ${remoteUrl}`);
      const parsedUrl = gch.parseGitHubUrl(remoteUrl);
      if (parsedUrl && parsedUrl.owner && username && parsedUrl.owner.toLowerCase() !== username.toLowerCase()) {
        console.warn(
          `\n[!] The GitHub remote owner ("${parsedUrl.owner}") does not match the configured username ("${username}").`
        );
        console.warn(`[!] If this is not intentional, consider updating the remote URL to use your username.`);
        console.warn(`[!] Example: git remote set-url origin https://github.com/${username}/<repo>.git\n`);
        // Check for --update-remote CLI argument or options.updateRemote
        const updateRemote = options.updateRemote || process.argv.includes("--update-remote");
        if (updateRemote) {
          // Only update the username in the URL, not the repo path
          let newUrl = remoteUrl;
          // Handle https:// and git@ URLs
          if (/^https:\/\//.test(remoteUrl)) {
            newUrl = remoteUrl.replace(/https:\/\/(?:[^@]+@)?github.com/, `https://${username}@github.com`);
          } else if (/^git@github.com:/.test(remoteUrl)) {
            // For git@github.com:user/repo.git, do not change path, just warn user to use HTTPS with username if needed
            console.warn(
              `[!] For SSH remotes, set your SSH config or use HTTPS with username if you want to change authentication user.`
            );
            return;
          }
          if (newUrl !== remoteUrl) {
            const updated = runGitCommand(["remote", "set-url", "origin", newUrl], `Set origin to ${newUrl}`);
            if (updated) {
              console.log(`[✓] Remote URL updated to: ${newUrl}`);
            } else {
              console.warn(`[!] Failed to update remote URL. Please update it manually if needed.`);
            }
          } else {
            console.log(`[i] Remote URL does not use HTTPS or already contains the username.`);
          }
        } else {
          console.log(`[i] Remote URL not changed. Use --update-remote to update automatically.`);
        }
      }
    }
  }
}

module.exports = {
  configureGitUser
};
