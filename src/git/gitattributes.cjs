const fs = require("fs");

/**
 * Parse existing .gitattributes file into structured rules
 * @param {string} gitattributesPath - Path to .gitattributes file
 * @returns {Array} Array of parsed rules
 */
function parseGitAttributes(gitattributesPath) {
  const rules = [];

  if (!fs.existsSync(gitattributesPath)) {
    return rules;
  }

  const content = fs.readFileSync(gitattributesPath, "utf8");
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith("#")) {
      rules.push({
        type: trimmedLine.startsWith("#") ? "comment" : "empty",
        content: line,
        lineNumber: index + 1
      });
      return;
    }

    // Parse rule line
    const parts = trimmedLine.split(/\s+/);
    if (parts.length >= 2) {
      const pattern = parts[0];
      const attributes = parts.slice(1).join(" ");

      rules.push({
        type: "rule",
        pattern,
        attributes,
        content: line,
        lineNumber: index + 1
      });
    } else {
      // Invalid line, keep as-is
      rules.push({
        type: "invalid",
        content: line,
        lineNumber: index + 1
      });
    }
  });

  return rules;
}

/**
 * Check if two patterns conflict (same or overlapping file patterns)
 * @param {string} pattern1 - First pattern
 * @param {string} pattern2 - Second pattern
 * @returns {boolean} True if patterns conflict
 */
function patternsConflict(pattern1, pattern2) {
  // Exact match
  if (pattern1 === pattern2) {
    return true;
  }

  // Universal pattern conflicts with everything
  if (pattern1 === "*" || pattern2 === "*") {
    return pattern1 !== pattern2;
  }

  // Simple glob overlap detection
  const normalize = (p) => p.replace(/\{[^}]+\}/g, "*").replace(/\*+/g, "*");
  const norm1 = normalize(pattern1);
  const norm2 = normalize(pattern2);

  return norm1 === norm2;
}

/**
 * Merge existing rules with desired rules, detecting conflicts
 * @param {Array} existingRules - Parsed existing rules
 * @param {Array} desiredRules - Desired rules to add
 * @returns {Object} Result with mergedRules, conflicts, and changes
 */
function mergeGitAttributeRules(existingRules, desiredRules) {
  let mergedRules;
  if (existingRules.length === 0) {
    // If no existing rules, just add all desired rules in order
    mergedRules = desiredRules.map((desired, idx) => ({
      type: "rule",
      pattern: desired.pattern,
      attributes: desired.attributes,
      content: `${desired.pattern} ${desired.attributes}`,
      lineNumber: idx + 1,
      added: true
    }));
    return {
      mergedRules,
      conflicts: [],
      changes: desiredRules.map((rule) => ({ action: "added", pattern: rule.pattern, attributes: rule.attributes }))
    };
  } else {
    mergedRules = [...existingRules];
  }
  const conflicts = [];
  const changes = [];

  desiredRules.forEach((desired) => {
    // Look for an exact pattern match in existing rules
    const existingIdx = mergedRules.findIndex((r) => r.type === "rule" && r.pattern === desired.pattern);
    if (existingIdx !== -1) {
      const existing = mergedRules[existingIdx];
      if (existing.attributes === desired.attributes) {
        // Already present, do nothing
        conflicts.push({
          pattern: desired.pattern,
          existing: existing.attributes,
          proposed: desired.attributes,
          action: "kept existing (identical)"
        });
      } else if (desired.priority > (existing.priority || 0)) {
        // Replace with higher priority rule
        mergedRules[existingIdx] = {
          type: "rule",
          pattern: desired.pattern,
          attributes: desired.attributes,
          content: `${desired.pattern} ${desired.attributes}`,
          lineNumber: existing.lineNumber,
          replaced: true
        };
        conflicts.push({
          pattern: desired.pattern,
          existing: existing.attributes,
          proposed: desired.attributes,
          action: "replaced (higher priority)"
        });
        changes.push({
          action: "replaced",
          pattern: desired.pattern,
          attributes: desired.attributes,
          oldAttributes: existing.attributes
        });
      } else {
        // Keep existing rule
        conflicts.push({
          pattern: desired.pattern,
          existing: existing.attributes,
          proposed: desired.attributes,
          action: "kept existing (lower priority)"
        });
      }
    } else {
      // No exact pattern match, add new rule
      mergedRules.push({
        type: "rule",
        pattern: desired.pattern,
        attributes: desired.attributes,
        content: `${desired.pattern} ${desired.attributes}`,
        lineNumber: mergedRules.length + 1,
        added: true
      });
      changes.push({
        action: "added",
        pattern: desired.pattern,
        attributes: desired.attributes
      });
    }
  });

  return { mergedRules, conflicts, changes };
}

/**
 * Format merged rules back into .gitattributes content
 * @param {Array} rules - Merged rules array
 * @returns {string} Formatted .gitattributes content
 */
function formatGitAttributes(rules) {
  return (
    rules
      .map((rule) => {
        if (rule.type === "rule") {
          return `${rule.pattern} ${rule.attributes}`;
        }
        return rule.content;
      })
      .join("\n") + "\n"
  );
}

/**
 * Update .gitattributes file with new rules, handling conflicts intelligently
 * @param {string} gitattributesPath - Path to .gitattributes file
 * @param {Array} desiredRules - Array of desired rules to add/merge
 * @returns {Object} Result with success status, conflicts, and changes
 */
function updateGitAttributes(gitattributesPath, desiredRules) {
  try {
    // Parse existing .gitattributes
    const existingRules = parseGitAttributes(gitattributesPath);

    // Merge rules and detect conflicts
    const { mergedRules, conflicts, changes } = mergeGitAttributeRules(existingRules, desiredRules);

    // Write updated .gitattributes if changes were made
    let success = false;
    if (changes.length > 0) {
      const newContent = formatGitAttributes(mergedRules);
      fs.writeFileSync(gitattributesPath, newContent);
      success = true;
    }

    return {
      success,
      conflicts,
      changes,
      message: success
        ? `Updated .gitattributes with ${changes.length} changes`
        : "No changes needed - all rules already present"
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      conflicts: [],
      changes: []
    };
  }
}

module.exports = {
  parseGitAttributes,
  patternsConflict,
  mergeGitAttributeRules,
  formatGitAttributes,
  updateGitAttributes
};
