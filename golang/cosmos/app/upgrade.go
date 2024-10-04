package gaia

import (
	"fmt"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	swingsetkeeper "github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/keeper"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/module"
	upgradetypes "github.com/cosmos/cosmos-sdk/x/upgrade/types"
)

// upgradeNamesOfThisVersion documents the current upgrade names and whether
// each is "primary" (used to trigger store migrations, which can only run
// once). An actual release should have exactly one primary upgrade name and any
// number of non-primary upgrade names (each of the latter being associated with
// a release candidate iteration after the first RC and used only for
// pre-production chains), but for testing purposes, the master branch has
// multiple primary upgrade names.
var upgradeNamesOfThisVersion = map[string]bool{
	"UNRELEASED_BASIC":           true,
	"UNRELEASED_A3P_INTEGRATION": true,
	"UNRELEASED_main":            true,
	"UNRELEASED_devnet":          true,
	"UNRELEASED_REAPPLY":         false,
}

// isPrimaryUpgradeName returns whether the provided plan name is considered a
// primary for the purpose of applying store migrations for the first upgrade
// of this version.
// It is expected that only primary plan names are used for production chains.
func isPrimaryUpgradeName(name string) bool {
	isPrimary, found := upgradeNamesOfThisVersion[name]
	if !found {
		panic(fmt.Errorf("invalid upgrade name: %q", name))
	}
	return isPrimary
}

// isFirstTimeUpgradeOfThisVersion looks up in the upgrade store whether no
// upgrade plan name of this version have previously been applied.
func isFirstTimeUpgradeOfThisVersion(app *GaiaApp, ctx sdk.Context) bool {
	for name := range upgradeNamesOfThisVersion {
		if app.UpgradeKeeper.GetDoneHeight(ctx, name) != 0 {
			return false
		}
	}
	return true
}

// unreleasedUpgradeHandler performs standard upgrade actions plus custom actions for the unreleased upgrade.
func unreleasedUpgradeHandler(app *GaiaApp, targetUpgrade string) func(sdk.Context, upgradetypes.Plan, module.VersionMap) (module.VersionMap, error) {
	return func(ctx sdk.Context, plan upgradetypes.Plan, fromVm module.VersionMap) (module.VersionMap, error) {
		app.CheckControllerInited(false)

		CoreProposalSteps := []vm.CoreProposalStep{}

		// These CoreProposalSteps are not idempotent and should only be executed
		// as part of the first upgrade using this handler on any given chain.
		if isFirstTimeUpgradeOfThisVersion(app, ctx) {
			// The storeUpgrades defined in app.go only execute for primary upgrade names.
			// If this first upgrade is *not* primary, then stores have not been
			// initialized correctly.
			if !isPrimaryUpgradeName(plan.Name) {
				return module.VersionMap{}, fmt.Errorf("cannot run %q as first upgrade", plan.Name)
			}

			// Each CoreProposalStep runs sequentially, and can be constructed from
			// one or more modules executing in parallel within the step.
			CoreProposalSteps = []vm.CoreProposalStep{
				vm.CoreProposalStepForModules(
					// Upgrade to new liveslots for repaired vow usage.
					"@agoric/builders/scripts/vats/upgrade-orch-core.js",
				),
				vm.CoreProposalStepForModules(
					// Upgrade to new liveslots and support vows.
					"@agoric/builders/scripts/smart-wallet/build-wallet-factory2-upgrade.js",
				),
				vm.CoreProposalStepForModules(
					// Create vat-orchestration.
					"@agoric/builders/scripts/vats/init-orchestration.js",
				),
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
