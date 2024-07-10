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
	"agoric-upgrade-16",
	"agoric-upgrade-16-2",
}

// isPrimaryUpgradeName returns wether the provided plan name is considered a
// primary for the purpose of applying store migrations for the first upgrade
// of this version.
// It is expected that only primary plan names are used for non testing chains.
func isPrimaryUpgradeName(name string) bool {
	return upgradeNamesOfThisVersion[0] == name
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

// upgrade16Handler performs standard upgrade actions plus custom actions for upgrade-16.
func upgrade16Handler(app *GaiaApp, targetUpgrade string) func(sdk.Context, upgradetypes.Plan, module.VersionMap) (module.VersionMap, error) {
	return func(ctx sdk.Context, plan upgradetypes.Plan, fromVm module.VersionMap) (module.VersionMap, error) {
		app.CheckControllerInited(false)

		CoreProposalSteps := []vm.CoreProposalStep{}

		// These CoreProposalSteps are not idempotent and should only be executed
		// as part of the first upgrade using this handler on any given chain.
		if isFirstTimeUpgradeOfThisVersion(app, ctx) {
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

			// The storeUpgrades defined in app.go only execute for the primary upgrade name
			// If we got here and this first upgrade of this version does not use the
			// primary upgrade name, stores have not been initialized correctly.
			if !isPrimaryUpgradeName(plan.Name) {
				return module.VersionMap{}, fmt.Errorf("cannot run %s as first upgrade", plan.Name)
			}
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
