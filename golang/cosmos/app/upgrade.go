package gaia

import (
	"encoding/json"
	"fmt"

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
	"UNRELEASED_emerynet",
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
		validUpgradeName("UNRELEASED_devnet"),
		validUpgradeName("UNRELEASED_emerynet"):
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

// buildProposalStepWithArgs returns a CoreProposal representing invocation of
// the specified module-specific entry point with arbitrary Jsonable arguments
// provided after core-eval powers.
func buildProposalStepWithArgs(moduleName string, entrypoint string, args ...vm.Jsonable) (vm.CoreProposalStep, error) {
	argsBz, err := json.Marshal(args)
	if err != nil {
		return nil, err
	}

	mea := struct {
		Module     string          `json:"module"`
		Entrypoint string          `json:"entrypoint"`
		Args       json.RawMessage `json:"args"`
	}{
		Module:     moduleName,
		Entrypoint: entrypoint,
		Args:       argsBz,
	}

	jsonBz, err := json.Marshal(mea)
	if err != nil {
		return nil, err
	}

	proposal := vm.ArbitraryCoreProposal{Json: jsonBz}
	return vm.CoreProposalStepForModules(proposal), nil
}

func getVariantFromUpgradeName(upgradeName string) string {
	switch upgradeName {
	case "UNRELEASED_A3P_INTEGRATION":
		return "A3P_INTEGRATION"
	case "UNRELEASED_main":
		return "MAINNET"
	case "UNRELEASED_devnet":
		return "DEVNET"
	case "UNRELEASED_emerynet":
		return "EMERYNET"
	case "UNRELEASED_BASIC":
		// Noupgrade for this version.
		return ""
	default:
		return ""
	}
}

func buildProposalStepFromScript(targetUpgrade string, builderScript string) (vm.CoreProposalStep, error) {
	variant := getVariantFromUpgradeName(targetUpgrade)

	if variant == "" {
		return nil, nil
	}

	return buildProposalStepWithArgs(
		builderScript,
		"defaultProposalBuilder",
		// Map iteration is randomised; use an anonymous struct instead.
		struct {
			Variant string `json:"variant"`
		}{
			Variant: variant,
		},
	)
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
			CoreProposalSteps = append(CoreProposalSteps,
				// Orchestration vats: Fix memory leak in vow tools
				// vat-ibc (included in orchestration): Accommodate string sequence numbers.
				vm.CoreProposalStepForModules(
					"@agoric/builders/scripts/vats/upgrade-orchestration.js",
				),
				// Register a new ZCF to be used for all future contract instances and upgrades
				vm.CoreProposalStepForModules(
					"@agoric/builders/scripts/vats/upgrade-zcf.js",
				),
				// because of #10794, we need to do at least a null upgrade of
				// the walletFactory on every software upgrade
				vm.CoreProposalStepForModules(
					"@agoric/builders/scripts/smart-wallet/build-wallet-factory2-upgrade.js",
				),
				// vat-bank is slowly leaking, possibly because of the liveslots resolved promise leak
				// (https://github.com/Agoric/agoric-sdk/issues/11118). Restart to pick up the fix.
				vm.CoreProposalStepForModules(
					"@agoric/builders/scripts/vats/upgrade-bank.js",
				),
			)

			// terminationTargets is a slice of "$boardID:$instanceKitLabel" strings.
			var terminationTargets []vm.Jsonable
			switch getVariantFromUpgradeName(targetUpgrade) {
			case "MAINNET":
				// v111 "zcf-b1-4522b-stkATOM-USD_price_feed"
				terminationTargets = []vm.Jsonable{"board052184:stkATOM-USD_price_feed"}
			}
			if len(terminationTargets) > 0 {
				terminationStep, err := buildProposalStepWithArgs(
					"@agoric/vats/src/proposals/terminate-governed-instance.js",
					// defaultProposalBuilder(powers, targets)
					"defaultProposalBuilder",
					terminationTargets...,
				)
				if err != nil {
					return module.VersionMap{}, err
				}
				CoreProposalSteps = append(CoreProposalSteps, terminationStep)
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
