package gaia

import (
	"fmt"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	swingsetkeeper "github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/keeper"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/module"
	upgradetypes "github.com/cosmos/cosmos-sdk/x/upgrade/types"
)

var upgradeNamesOfThisVersion = []string{
	"agoric-upgrade-18a",
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
	case validUpgradeName("agoric-upgrade-18a"):
		return true
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

// func upgradeMintHolderCoreProposal(upgradeName string) (vm.CoreProposalStep, error) {
// 	variant := getVariantFromUpgradeName(upgradeName)

// 	if variant == "" {
// 		return nil, nil
// 	}

// 	return buildProposalStepWithArgs(
// 		"@agoric/builders/scripts/vats/upgrade-mintHolder.js",
// 		"defaultProposalBuilder",
// 		map[string]any{
// 			"variant": variant,
// 		},
// 	)
// }

// upgrade18aHandler performs standard upgrade actions plus custom actions for upgrade-18a.
func upgrade18aHandler(app *GaiaApp, targetUpgrade string) func(sdk.Context, upgradetypes.Plan, module.VersionMap) (module.VersionMap, error) {
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

			// CoreProposals for Upgrade 19. These should not be introduced
			// before upgrade 18 is done because they would be run in n:upgrade-next
			//
			// upgradeMintHolderStep, err := upgradeMintHolderCoreProposal(targetUpgrade)
			// if err != nil {
			// 	return nil, err
			// } else if upgradeMintHolderStep != nil {
			// 	CoreProposalSteps = append(CoreProposalSteps, upgradeMintHolderStep)
			// }
			//
			// CoreProposalSteps = append(CoreProposalSteps,
			// 	vm.CoreProposalStepForModules(
			// 		"@agoric/builders/scripts/inter-protocol/replace-feeDistributor.js",
			// 	),
			// 	vm.CoreProposalStepForModules(
			// 		"@agoric/builders/scripts/vats/upgrade-paRegistry.js",
			// 	),
			// 	vm.CoreProposalStepForModules(
			// 		"@agoric/builders/scripts/vats/upgrade-provisionPool.js",
			// 	),
			// 	vm.CoreProposalStepForModules(
			// 		"@agoric/builders/scripts/vats/upgrade-bank.js",
			// 	),
			// 	vm.CoreProposalStepForModules(
			// 		"@agoric/builders/scripts/vats/upgrade-agoricNames.js",
			// 	),
			// 	vm.CoreProposalStepForModules(
			// 		"@agoric/builders/scripts/vats/upgrade-asset-reserve.js",
			// 	),
			// )

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
