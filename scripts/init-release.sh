#!/bin/bash
set -ueo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <next_release_number>"
  echo "Example: $0 19" # for agoric-upgrade-19
  exit 1
fi

# for better compatibility
BSD_SED="$({ sed --help; true; } 2>&1 | sed -n 's/.*-i .*/BSD/p; 2q')"
function sedi() {
  if [ -n "$BSD_SED" ]; then
    sed -i '' "$@"
  else
    sed -i "$@"
  fi
}

NEXT_RELEASE=$1
if ! [[ "$NEXT_RELEASE" =~ ^[1-9][0-9]*$ ]]; then
  echo "Error: Release number must be a positive decimal integer"
  exit 1
fi

APP_FILE=golang/cosmos/app/app.go
UPGRADE_FILE=golang/cosmos/app/upgrade.go

# Rename unreleasedUpgradeHandler instances
sedi -e "s/unreleasedUpgradeHandler/upgrade${NEXT_RELEASE}Handler/g" \
  -e "s/the unreleased upgrade/upgrade-${NEXT_RELEASE}/g" \
  ${APP_FILE} \
  ${UPGRADE_FILE}

echo "Renamed unreleasedUpgradeHandler for release u${NEXT_RELEASE}"

# Rename cosmos-sdk upgrade names
sedi '/^var upgradeNamesOfThisVersion = \[\]string{/,/^}/ c\var upgradeNamesOfThisVersion = []string{\
    "agoric-upgrade-'"${NEXT_RELEASE}"'",\
}' ${UPGRADE_FILE}
echo "Updated cosmos-sdk upgrade names"

# Rename primary upgrade names
sedi '/^func isPrimaryUpgradeName(name string) bool {/,/^}/ c\func isPrimaryUpgradeName(name string) bool {\
  if name == "" {\
      // An empty upgrade name can happen if there are no upgrade in progress\
      return false\
  }\
  switch name {\
  case validUpgradeName("agoric-upgrade-'"${NEXT_RELEASE}"'"):\
      return true\
  default:\
      panic(fmt.Errorf("unexpected upgrade name %s", validUpgradeName(name)))\
  }\
}' ${UPGRADE_FILE}
echo "Updated primary upgrade names"

# when done, format the files
go fmt ${APP_FILE} ${UPGRADE_FILE}

# Rename upgrade-next to a:upgrade-${NEXT_RELEASE}
if [ -d "a3p-integration/proposals/n:upgrade-next" ]; then
  mv "a3p-integration/proposals/n:upgrade-next" "a3p-integration/proposals/a:upgrade-${NEXT_RELEASE}"
  echo "Renamed n:upgrade-next directory to a:upgrade-${NEXT_RELEASE}"

  cat > "a3p-integration/proposals/a:upgrade-${NEXT_RELEASE}/README.md" << EOF
# Proposal to upgrade the chain software

This holds the draft proposal for agoric-upgrade-${NEXT_RELEASE}, which will be added to
[agoric-3-proposals](https://github.com/Agoric/agoric-3-proposals) after it
passes.

The "binaries" property of \`upgradeInfo\` is now required since Cosmos SDK 0.46,
however it cannot be computed for an unreleased upgrade. To disable the check,
\`releaseNotes\` is set to \`false\`.
EOF
  echo "Updated README.md for a:upgrade-${NEXT_RELEASE}"
else
  echo "Warning: n:upgrade-next directory not found. Skipping directory rename and README update."
fi
