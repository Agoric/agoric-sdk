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

func buildProposalStepWithArgs(moduleName string, entrypoint string, opts map[string]any) (vm.CoreProposalStep, error) {
	t := template.Must(template.New("").Parse(`{
		"module": "{{.moduleName}}",
		"entrypoint": "{{.entrypoint}}",
		"args": [ {{.optsArg}} ]
	}`))

	optsArg, err := json.Marshal(opts)
	if err != nil {
		return nil, err
	}

	var result strings.Builder
	err = t.Execute(&result, map[string]any{
		"moduleName": moduleName,
		"entrypoint": entrypoint,
		"optsArg":    string(optsArg),
	})
	if err != nil {
		return nil, err
	}
	jsonStr := result.String()
	jsonBz := []byte(jsonStr)
	if !json.Valid(jsonBz) {
		return nil, fmt.Errorf("invalid JSON: %s", jsonStr)
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
		// Noupgrade for this version.
	case "UNRELEASED_BASIC":
		return ""
	default:
		return ""
	}
}

func replaceElectorateCoreProposalStep(upgradeName string) (vm.CoreProposalStep, error) {
	variant := getVariantFromUpgradeName(upgradeName)

	if variant == "" {
		return nil, nil
	}

	return buildProposalStepWithArgs(
		"@agoric/builders/scripts/inter-protocol/replace-electorate-core.js",
		"defaultProposalBuilder",
		map[string]any{
			"variant": variant,
		},
	)
}

func replacePriceFeedsCoreProposal(upgradeName string) (vm.CoreProposalStep, error) {
	variant := getVariantFromUpgradeName(upgradeName)

	if variant == "" {
		return nil, nil
	}

	return buildProposalStepWithArgs(
		"@agoric/builders/scripts/inter-protocol/updatePriceFeeds.js",
		"defaultProposalBuilder",
		map[string]any{
			"variant": variant,
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
			// The storeUpgrades defined in app.go only execute for primary upgrade names.
			// If this first upgrade is *not* primary, then stores have not been
			// initialized correctly.
			if !isPrimaryUpgradeName(plan.Name) {
				return module.VersionMap{}, fmt.Errorf("cannot run %q as first upgrade", plan.Name)
			}

			replaceElectorateStep, err := replaceElectorateCoreProposalStep(targetUpgrade)
			if err != nil {
				return nil, err
			} else if replaceElectorateStep != nil {
				CoreProposalSteps = append(CoreProposalSteps, replaceElectorateStep)
			}

			priceFeedUpdate, err := replacePriceFeedsCoreProposal(targetUpgrade)
			if err != nil {
				return nil, err
			} else if priceFeedUpdate != nil {
				CoreProposalSteps = append(CoreProposalSteps,
					priceFeedUpdate,
					// The following have a dependency onto the price feed proposal
					vm.CoreProposalStepForModules(
						"@agoric/builders/scripts/vats/add-auction.js",
					),
					vm.CoreProposalStepForModules(
						"@agoric/builders/scripts/vats/upgradeVaults.js",
					),
				)
			}

			// Each CoreProposalStep runs sequentially, and can be constructed from
			// one or more modules executing in parallel within the step.
			CoreProposalSteps = append(CoreProposalSteps,
				vm.CoreProposalStepForModules(
					// Upgrade Zoe (no new ZCF needed).
					"@agoric/builders/scripts/vats/upgrade-zoe.js",
				),
				// Revive KREAd characters
				vm.CoreProposalStepForModules(
					"@agoric/builders/scripts/vats/revive-kread.js",
				),
				vm.CoreProposalStepForModules(
					// Upgrade to include a cleanup from https://github.com/Agoric/agoric-sdk/pull/10319
					"@agoric/builders/scripts/smart-wallet/build-wallet-factory2-upgrade.js",
				),
			)
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
