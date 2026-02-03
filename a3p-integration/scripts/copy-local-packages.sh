#!/bin/bash
set -ueo pipefail

# Usage: $0 <proposal-dir>
# Copies local workspace packages specified in package.json "vendorPackages" into
# the proposal directory so Docker builds can use local versions instead of npm.
#
# Example package.json:
# {
#   "vendorPackages": [
#     "@agoric/deploy-script-support",
#     "@agoric/portfolio-api"
#   ],
#   "resolutions": {
#     "@agoric/deploy-script-support": "portal:./local-packages/deploy-script-support",
#     "@agoric/portfolio-api": "portal:./local-packages/portfolio-api"
#   }
# }

proposalDir=$1
if [ ! -d "$proposalDir" ]; then
  echo >&2 "Error: Proposal directory '$proposalDir' does not exist"
  exit 1
fi

cd "$proposalDir"

# Check if package.json has vendorPackages
if [ ! -f package.json ]; then
  echo >&2 "No package.json in $proposalDir, skipping package vendoring"
  exit 0
fi

vendorPackages=$(jq -r '.vendorPackages[]? // empty' < package.json)
if [ -z "$vendorPackages" ]; then
  echo >&2 "No vendorPackages specified in $(basename "$proposalDir")/package.json, skipping"
  exit 0
fi

# Find agoric-sdk root
sdkroot=$(git rev-parse --show-toplevel)

# Create local-packages directory
localPkgDir="./local-packages"
mkdir -p "$localPkgDir"

echo >&2 "Vendoring packages for $(basename "$proposalDir")..."

# Copy each package
echo "$vendorPackages" | while read -r pkgName; do
  if [ -z "$pkgName" ]; then
    continue
  fi

  # Convert @agoric/foo-bar to foo-bar
  pkgShortName=${pkgName##*/}

  # Find package in workspace
  pkgPath="$sdkroot/packages/$pkgShortName"

  if [ ! -d "$pkgPath" ]; then
    echo >&2 "Warning: Package $pkgName not found at $pkgPath"
    continue
  fi

  targetPath="$localPkgDir/$pkgShortName"

  # Remove old copy if exists
  rm -rf "$targetPath"

  # Copy package (excluding node_modules, tests, etc.)
  echo >&2 "  Copying $pkgName -> $targetPath"
  mkdir -p "$targetPath"

  # Copy essential files and directories
  cp "$pkgPath/package.json" "$targetPath/" 2>/dev/null || echo >&2 "    Warning: No package.json"
  [ -d "$pkgPath/src" ] && cp -r "$pkgPath/src" "$targetPath/" || echo >&2 "    Warning: No src/ directory"
  [ -f "$pkgPath/LICENSE" ] && cp "$pkgPath/LICENSE" "$targetPath/" 2>/dev/null || true
  [ -f "$pkgPath/README.md" ] && cp "$pkgPath/README.md" "$targetPath/" 2>/dev/null || true

  # Replace workspace:* with dev so dependencies resolve from parent workspace
  if [ -f "$targetPath/package.json" ]; then
    sed -i.bak 's/"workspace:\*"/"dev"/g' "$targetPath/package.json"
    rm -f "$targetPath/package.json.bak"
  fi

  echo >&2 "  ✓ Copied $pkgName"
done

echo >&2 "Package vendoring complete for $(basename "$proposalDir")"
