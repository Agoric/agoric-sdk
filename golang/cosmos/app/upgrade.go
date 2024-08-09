package gaia

import (
	"encoding/json"
	"fmt"
	"strings"
	"text/template"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	swingsetkeeper "github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/keeper"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/module"
	upgradetypes "github.com/cosmos/cosmos-sdk/x/upgrade/types"
)

var upgradeNamesOfThisVersion = []string{
	"UNRELEASED_BASIC", // no-frills
	"UNRELEASED_A3P_INTEGRATION",
	"UNRELEASED_main",
	"UNRELEASED_devnet",
	"UNRELEASED_REAPPLY",
}

// isUpgradeNameOfThisVersion returns whether the provided plan name is a
// known upgrade name of this software version
func isUpgradeNameOfThisVersion(name string) bool {
	for _, upgradeName := range upgradeNamesOfThisVersion {
		if upgradeName == name {
			return true
		}
	}
	return false
}

// validUpgradeName is an identity function that asserts the provided name
// is an upgrade name of this software version. It can be used as a sort of
// dynamic enum check.
func validUpgradeName(name string) string {
	if !isUpgradeNameOfThisVersion(name) {
		panic(fmt.Errorf("invalid upgrade name: %s", name))
	}
	return name
}

// isPrimaryUpgradeName returns wether the provided plan name is considered a
// primary for the purpose of applying store migrations for the first upgrade
// of this version.
// It is expected that only primary plan names are used for non testing chains.
func isPrimaryUpgradeName(name string) bool {
	if name == "" {
		// An empty upgrade name can happen if there are no upgrade in progress
		return false
	}
	switch name {
	case validUpgradeName("UNRELEASED_BASIC"),
		validUpgradeName("UNRELEASED_A3P_INTEGRATION"),
		validUpgradeName("UNRELEASED_main"),
		validUpgradeName("UNRELEASED_devnet"):
		return true
	case validUpgradeName("UNRELEASED_REAPPLY"):
		return false
	default:
		panic(fmt.Errorf("unexpected upgrade name %s", validUpgradeName(name)))
	}
}

// isFirstTimeUpgradeOfThisVersion looks up in the upgrade store whether no
// upgrade plan name of this version have previously been applied.
func isFirstTimeUpgradeOfThisVersion(app *GaiaApp, ctx sdk.Context) bool {
	for _, name := range upgradeNamesOfThisVersion {
		if app.UpgradeKeeper.GetDoneHeight(ctx, name) != 0 {
			return false
		}
	}
	return true
}

// upgradePriceFeedCoreProposalSteps returns the core proposal steps for the
// price feed upgrade and associated changes to scaledPriceAuthority and
// vaultManager.
func upgradePriceFeedCoreProposalSteps(upgradeName string) ([]vm.CoreProposalStep, error) {
	isThisUpgrade := func(expectedUpgradeName string) bool {
		return upgradeName == validUpgradeName(expectedUpgradeName)
	}

	t := template.Must(template.New("").Parse(`{
		"module": "@agoric/builders/scripts/vats/priceFeedSupport.js",
    "entrypoint": {{.entrypointJson}},
		"args": [{
			"AGORIC_INSTANCE_NAME": {{.instanceNameJson}},
			"ORACLE_ADDRESSES": {{.oracleAddressesJson}},
			"IN_BRAND_LOOKUP": {{.inBrandLookupJson}},
			"IN_BRAND_DECIMALS": 6,
			"OUT_BRAND_LOOKUP": ["agoricNames", "oracleBrand", "USD"],
			"OUT_BRAND_DECIMALS": 4
		}]
	}`))

	var oracleAddresses []string

	var entrypoint string
	switch {
	case isThisUpgrade("UNRELEASED_A3P_INTEGRATION"):
		entrypoint = "deprecatedPriceFeedProposalBuilder"
	case isThisUpgrade("UNRELEASED_main"):
		oracleAddresses = []string{
			"agoric144rrhh4m09mh7aaffhm6xy223ym76gve2x7y78", // DSRV
			"agoric19d6gnr9fyp6hev4tlrg87zjrzsd5gzr5qlfq2p", // Stakin
			"agoric19uscwxdac6cf6z7d5e26e0jm0lgwstc47cpll8", // 01node
			"agoric1krunjcqfrf7la48zrvdfeeqtls5r00ep68mzkr", // Simply Staking
			"agoric1n4fcxsnkxe4gj6e24naec99hzmc4pjfdccy5nj", // P2P
		}
		entrypoint = "strictPriceFeedProposalBuilder"
	case isThisUpgrade("UNRELEASED_devnet"):
		oracleAddresses = []string{
			"agoric1lw4e4aas9q84tq0q92j85rwjjjapf8dmnllnft", // DSRV
			"agoric1zj6vrrrjq4gsyr9lw7dplv4vyejg3p8j2urm82", // Stakin
			"agoric1ra0g6crtsy6r3qnpu7ruvm7qd4wjnznyzg5nu4", // 01node
			"agoric1qj07c7vfk3knqdral0sej7fa6eavkdn8vd8etf", // Simply Staking
			"agoric10vjkvkmpp9e356xeh6qqlhrny2htyzp8hf88fk", // P2P
		}
		entrypoint = "strictPriceFeedProposalBuilder"

	// No price feed upgrade for this version.
	case isThisUpgrade("UNRELEASED_BASIC"):
	}

	if entrypoint == "" {
		return []vm.CoreProposalStep{}, nil
	}

	entrypointJson, err := json.Marshal(entrypoint)
	if err != nil {
		return nil, err
	}

	var inBrandNames []string
	switch {
	case isThisUpgrade("UNRELEASED_A3P_INTEGRATION"), isThisUpgrade("UNRELEASED_main"):
		inBrandNames = []string{
			"ATOM",
			"stATOM",
			"stOSMO",
			"stTIA",
			"stkATOM",
		}
	case isThisUpgrade("UNRELEASED_devnet"):
		inBrandNames = []string{
			"ATOM",
			"stTIA",
			"stkATOM",
		}
	}

	oracleAddressesJson, err := json.Marshal(oracleAddresses)
	if err != nil {
		return nil, err
	}

	proposals := make(vm.CoreProposalStep, 0, len(inBrandNames))
	for _, inBrandName := range inBrandNames {
		instanceName := inBrandName + "-USD price feed"
		instanceNameJson, err := json.Marshal(instanceName)
		if err != nil {
			return nil, err
		}
		inBrandLookup := []string{"agoricNames", "oracleBrand", inBrandName}
		inBrandLookupJson, err := json.Marshal(inBrandLookup)
		if err != nil {
			return nil, err
		}

		var result strings.Builder
		err = t.Execute(&result, map[string]any{
			"entrypointJson":      string(entrypointJson),
			"inBrandLookupJson":   string(inBrandLookupJson),
			"instanceNameJson":    string(instanceNameJson),
			"oracleAddressesJson": string(oracleAddressesJson),
		})
		if err != nil {
			return nil, err
		}

		jsonStr := result.String()
		jsonBz := []byte(jsonStr)
		if !json.Valid(jsonBz) {
			return nil, fmt.Errorf("invalid JSON: %s", jsonStr)
		}
		proposals = append(proposals, vm.ArbitraryCoreProposal{Json: jsonBz})
	}
	return []vm.CoreProposalStep{
		// Add new vats for price feeds. The existing ones will be retired shortly.
		vm.CoreProposalStepForModules(proposals...),
		// Add new auction contract. The old one will be retired shortly.
		vm.CoreProposalStepForModules("@agoric/builders/scripts/vats/add-auction.js"),
		// upgrade vaultFactory.
		vm.CoreProposalStepForModules("@agoric/builders/scripts/vats/upgradeVaults.js"),
	}, nil
}

// unreleasedUpgradeHandler performs standard upgrade actions plus custom actions for the unreleased upgrade.
func unreleasedUpgradeHandler(app *GaiaApp, targetUpgrade string) func(sdk.Context, upgradetypes.Plan, module.VersionMap) (module.VersionMap, error) {
	return func(ctx sdk.Context, plan upgradetypes.Plan, fromVm module.VersionMap) (module.VersionMap, error) {
		app.CheckControllerInited(false)

		CoreProposalSteps := []vm.CoreProposalStep{}

		// These CoreProposalSteps are not idempotent and should only be executed
		// as part of the first upgrade using this handler on any given chain.
		if isFirstTimeUpgradeOfThisVersion(app, ctx) {
			// The storeUpgrades defined in app.go only execute for the primary upgrade name
			// If we got here and this first upgrade of this version does not use the
			// primary upgrade name, stores have not been initialized correctly.
			if !isPrimaryUpgradeName(plan.Name) {
				return module.VersionMap{}, fmt.Errorf("cannot run %s as first upgrade", plan.Name)
			}

			// Each CoreProposalStep runs sequentially, and can be constructed from
			// one or more modules executing in parallel within the step.
			CoreProposalSteps = []vm.CoreProposalStep{
				// Upgrade Zoe + ZCF
				vm.CoreProposalStepForModules("@agoric/builders/scripts/vats/replace-zoe.js"),
				// Revive KREAd characters
				vm.CoreProposalStepForModules("@agoric/builders/scripts/vats/revive-kread.js"),

				// upgrade the provisioning vat
				vm.CoreProposalStepForModules("@agoric/builders/scripts/vats/replace-provisioning.js"),
				// Enable low-level Orchestration.
				vm.CoreProposalStepForModules(
					"@agoric/builders/scripts/vats/init-network.js",
					"@agoric/builders/scripts/vats/init-localchain.js",
					"@agoric/builders/scripts/vats/init-transfer.js",
				),
			}
			priceFeedSteps, err := upgradePriceFeedCoreProposalSteps(targetUpgrade)
			if err != nil {
				return nil, err
			}
			CoreProposalSteps = append(CoreProposalSteps, priceFeedSteps...)
		}

		app.upgradeDetails = &upgradeDetails{
			// Record the plan to send to SwingSet
			Plan: plan,
			// Core proposals that should run during the upgrade block
			// These will be merged with any coreProposals specified in the
			// upgradeInfo field of the upgrade plan ran as subsequent steps
			CoreProposals: vm.CoreProposalsFromSteps(CoreProposalSteps...),
		}

		// Always run module migrations
		mvm, err := app.mm.RunMigrations(ctx, app.configurator, fromVm)
		if err != nil {
			return mvm, err
		}

		m := swingsetkeeper.NewMigrator(app.SwingSetKeeper)
		err = m.MigrateParams(ctx)
		if err != nil {
			return mvm, err
		}

		return mvm, nil
	}
}
