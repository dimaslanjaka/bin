const bashScript = `
#!/bin/bash

set -u

cwd="$(pwd)"
max_jobs=4

cleanup_letter() {
  local letter="$1"

  rm -rf "\${cwd}/node_modules/\${letter}"*
  echo "Removed: node_modules/\${letter}*"

  rm -rf "\${cwd}/node_modules/@types/\${letter}"*
  echo "Removed: node_modules/@types/\${letter}*"

  rm -rf "\${cwd}/node_modules/@\${letter}"*
  echo "Removed: node_modules/@\${letter}*"
}

export -f cleanup_letter
export cwd

echo "Cleaning \${cwd}/node_modules..."

running=0

for letter in {a..z}; do
  cleanup_letter "$letter" &

  ((running++))

  # limit concurrent jobs
  if (( running >= max_jobs )); then
    wait -n
    ((running--))
  fi
done

wait

# final full cleanup (ensure nothing left behind)
rm -rf "\${cwd}/node_modules"

echo "Done cleaning node_modules."
`.trim();

module.exports = { bashScript };
