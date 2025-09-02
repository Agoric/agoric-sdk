package gaia

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	swingsetkeeper "github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/keeper"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/module"

	upgradetypes "cosmossdk.io/x/upgrade/types"
	paramstypes "github.com/cosmos/cosmos-sdk/x/params/types"

	icahosttypes "github.com/cosmos/ibc-go/v8/modules/apps/27-interchain-accounts/host/types"
	ibctransfertypes "github.com/cosmos/ibc-go/v8/modules/apps/transfer/types"
	ibcclienttypes "github.com/cosmos/ibc-go/v8/modules/core/02-client/types"
	ibcconnectiontypes "github.com/cosmos/ibc-go/v8/modules/core/03-connection/types"
	ibcexported "github.com/cosmos/ibc-go/v8/modules/core/exported"
	ibctmmigrations "github.com/cosmos/ibc-go/v8/modules/light-clients/07-tendermint/migrations"
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
		height, err := app.UpgradeKeeper.GetDoneHeight(ctx, name)
		if err != nil {
			panic(fmt.Errorf("error getting done height: %s", err))
		}
		if height != 0 {
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

// RegisterUpgradeHandlers registers the upgrade handlers for all upgradeNames.
func (app *GaiaApp) RegisterUpgradeHandlers() {
	// Set param key table for params module migration
	for _, subspace := range app.ParamsKeeper.GetSubspaces() {
		var keyTable paramstypes.KeyTable
		switch subspace.Name() {
		case ibcexported.ModuleName:
			keyTable = ibcclienttypes.ParamKeyTable() //nolint:staticcheck
			keyTable.RegisterParamSet(&ibcconnectiontypes.Params{})
		case icahosttypes.SubModuleName:
			keyTable = icahosttypes.ParamKeyTable() //nolint:staticcheck
		case ibctransfertypes.ModuleName:
			keyTable = ibctransfertypes.ParamKeyTable() //nolint:staticcheck
		default:
			continue
		}

		if !subspace.HasKeyTable() {
			subspace.WithKeyTable(keyTable)
		}
	}

	for _, name := range upgradeNamesOfThisVersion {
		app.UpgradeKeeper.SetUpgradeHandler(
			name,
			makeUnreleasedUpgradeHandler(app, name),
		)
	}
}

// makeUnreleasedUpgradeHandler performs standard upgrade actions plus custom actions for the unreleased upgrade.
func makeUnreleasedUpgradeHandler(app *GaiaApp, targetUpgrade string) upgradetypes.UpgradeHandler {
	_ = targetUpgrade
	return func(goCtx context.Context, plan upgradetypes.Plan, fromVm module.VersionMap) (module.VersionMap, error) {
		ctx := sdk.UnwrapSDKContext(goCtx)
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

			// prune expired tendermint consensus states to save storage space.
			_, err := ibctmmigrations.PruneExpiredConsensusStates(ctx, app.AppCodec(), app.IBCKeeper.ClientKeeper)
			if err != nil {
				return nil, err
			}

			// terminationTargets is a slice of "$boardID:$instanceKitLabel" strings.
			var terminationTargets []string
			switch ctx.ChainID() {
			case "agoric-3": // MAINNET
				terminationTargets = []string{
					// v29 "zcf-b1-4522b-ATOM-USD_price_feed"
					"board02963:ATOM-USD_price_feed",
					// v68 "zcf-b1-4522b-stATOM-USD_price_feed"
					"board012113:stATOM-USD_price_feed",
					// v98 "zcf-b1-4522b-stOSMO-USD_price_feed"
					"board002164:stOSMO-USD_price_feed",
					// v104 "zcf-b1-4522b-stTIA-USD_price_feed"
					"board043173:stTIA-USD_price_feed",
				}
			}
			if len(terminationTargets) > 0 {
				terminationStep, err := buildProposalStepWithArgs(
					"@agoric/vats/src/proposals/terminate-governed-instance.js",
					// defaultProposalBuilder(powers, targets)
					"defaultProposalBuilder",
					terminationTargets,
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
		mvm, err := app.ModuleManager.RunMigrations(ctx, app.configurator, fromVm)
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
