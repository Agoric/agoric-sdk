#!/bin/bash

validate_args() {
    if [ "$#" -ne 1 ]; then
        echo "Usage: $0 <next_release_number>"
        echo "Example: $0 19"
        exit 1
    fi

    if ! [[ $1 =~ ^[0-9]+$ ]]; then
        echo "Error: Release numbers must be numeric"
        exit 1
    fi
    
    NEXT_RELEASE=$1
}

update_app_go() {
    sed -i "s/unreleasedUpgradeHandler/upgrade${NEXT_RELEASE}Handler/g" golang/cosmos/app/app.go
    echo "Updated app.go for release ${NEXT_RELEASE}"
}

update_upgrade_go_handler() {
    sed -i "s/the unreleased upgrade/upgrade-${NEXT_RELEASE}/g" golang/cosmos/app/upgrade.go
    sed -i "s/unreleasedUpgradeHandler/upgrade${NEXT_RELEASE}Handler/g" golang/cosmos/app/upgrade.go
    echo "Updated upgrade handler in upgrade.go"
}

update_upgrade_names() {
    sed -i '/^var upgradeNamesOfThisVersion = \[\]string{/,/^}/ c\var upgradeNamesOfThisVersion = []string{\
    "agoric-upgrade-'${NEXT_RELEASE}'",\
}' golang/cosmos/app/upgrade.go
    echo "Updated upgrade names"
}

update_primary_upgrade_name() {
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
    echo "Updated primary upgrade name function"
}

rename_upgrade_next_dir() {
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
}

validate_args "$@"
update_app_go
update_upgrade_go_handler
update_upgrade_names
update_primary_upgrade_name
rename_upgrade_next_dir
