#!/bin/bash

# Check if arguments are provided
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <previous_release_number> <next_release_number>"
    echo "Example: $0 18 19"
    exit 1
fi

PREV_RELEASE=$1
NEXT_RELEASE=$2

# Function to validate input is numeric
validate_number() {
    if ! [[ $1 =~ ^[0-9]+$ ]]; then
        echo "Error: Release numbers must be numeric"
        exit 1
    fi
}

# Validate inputs
validate_number $PREV_RELEASE
validate_number $NEXT_RELEASE

# Update app.go
sed -i "s/unreleasedUpgradeHandler/upgrade${NEXT_RELEASE}Handler/g" golang/cosmos/app/app.go

# Update upgrade.go

# Update handler comment
sed -i "s/the unreleased upgrade/upgrade${NEXT_RELEASE}/g" golang/cosmos/app/app.go

# Rename the handler
sed -i "s/unreleasedUpgradeHandler/upgrade${NEXT_RELEASE}Handler/g" golang/cosmos/app/upgrade.go

# Update upgradeNamesOfThisVersion
sed -i '/^var upgradeNamesOfThisVersion = \[\]string{/,/^}/ c\var upgradeNamesOfThisVersion = []string{\
    "agoric-upgrade-'${NEXT_RELEASE}'",\
}' golang/cosmos/app/upgrade.go

# Update isPrimaryUpgradeName
sed -i '/^func isPrimaryUpgradeName(name string) bool {/,/^}/ c\func isPrimaryUpgradeName(name string) bool {\
    if name == "" {\
        // An empty upgrade name can happen if there are no upgrade in progress\
        return false\
    }\
    switch name {\
    case validUpgradeName("agoric-upgrade-'${NEXT_RELEASE}'"):\
        return true\
    default:\
        panic(fmt.Errorf("unexpected upgrade name %s", validUpgradeName(name)))\
    }\
}' golang/cosmos/app/upgrade.go

# Update a3p-integration/package.json
jq '.agoricSyntheticChain.fromTag = "use-upgrade-'${PREV_RELEASE}'"' a3p-integration/package.json > tmp.json && mv tmp.json a3p-integration/package.json

# Rename n:upgrade-next folder and update its README.md
if [ -d "a3p-integration/proposals/n:upgrade-next" ]; then
    mv "a3p-integration/proposals/n:upgrade-next" "a3p-integration/proposals/a:upgrade-${NEXT_RELEASE}"
    
    cat > "a3p-integration/proposals/a:upgrade-${NEXT_RELEASE}/README.md" << EOF
# Proposal to upgrade the chain software

This holds the draft proposal for agoric-upgrade-${NEXT_RELEASE}, which will be added to
[agoric-3-proposals](https://github.com/Agoric/agoric-3-proposals) after it
passes.

The "binaries" property of \`upgradeInfo\` is now required since Cosmos SDK 0.46,
however it cannot be computed for an unreleased upgrade. To disable the check,
\`releaseNotes\` is set to \`false\`.
EOF
fi

echo "Release initialized completed successfully!"