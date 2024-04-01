#!/bin/sh

# Configures the .vscode directory (which is .gitignored so that everyone can tailor it)

die() {
  echo "$*" >&2
  exit 1
}

# Run at the top level of the repository
cd "$(git rev-parse --show-toplevel)" \
  || die "Could not cd to top-level directory"

mkdir -p .vscode \
  || die "Could not create .vscode/"

# General settings

cat > .vscode/settings.json.new << \EOF || die "Could not write settings.json"
{
  // Automatically format with Prettier on save
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",

  "typescript.preferences.importModuleSpecifierEnding": "js",
  "typescript.tsdk": "node_modules/typescript/lib",

  // ESLint config
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.rules.customizations": [
    // Leave this to Prettier itself
    { "rule": "prettier/*", "severity": "off" },
    // Error in CI but a common state while coding in IDE
    { "rule": "no-unused-vars", "severity": "warn" },
    // Imports are auto-fixed on save
    { "rule": "import/newline-after-import", "severity": "off" },
    { "rule": "import/order", "severity": "off" },
  ],
  "eslint.useESLintClass": true,
  "eslint.packageManager": "yarn"
}
EOF

cat > .vscode/launch.json.new << \EOF || die "Could not write launch.json"
{
    // Use IntelliSense to learn about possible attributes.
    // Hover to view descriptions of existing attributes.
    // For more information, visit: https://go.microsoft.com/fwlink/?linkid=830387
    "version": "0.2.0",
    "configurations": [
        {
            "type": "pwa-node",
            "request": "launch",
            "name": "Debug AVA file",
            "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/ava",
            "runtimeArgs": [
              "${file}"
            ],
            "outputCapture": "std",
            "skipFiles": [
                "<node_internals>/**"
            ],
        },
        {
            "type": "pwa-node",
            "request": "launch",
            "name": "Debug AVA matches",
            "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/ava",
            "runtimeArgs": [
              "${file}",
              "-m",
              "${selectedText}"
            ],
            "outputCapture": "std",
            "skipFiles": [
                "<node_internals>/**"
            ],
        }
    ]
}
EOF

for file in .vscode/launch.json .vscode/settings.json; do
  printf "\nComparing %s\n" $file
  if test -f $file; then
    if git diff --no-index --quiet --exit-code $file $file.new; then
      echo "Your existing configuration matches the recommendations."
      rm $file.new
    else
      printf "The file %s.new has these changes:\n\n" $file
      git --no-pager diff --no-index $file $file.new
      printf "\n\nTo overwrite yours:\n\n  mv %s.new %s\n\n" $file $file
    fi
  else
    mv $file.new $file
  fi
done
