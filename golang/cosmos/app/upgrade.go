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

	icahosttypes "github.com/cosmos/ibc-go/v10/modules/apps/27-interchain-accounts/host/types"
	ibctransfertypes "github.com/cosmos/ibc-go/v10/modules/apps/transfer/types"
	ibcclienttypes "github.com/cosmos/ibc-go/v10/modules/core/02-client/types"
	ibcconnectiontypes "github.com/cosmos/ibc-go/v10/modules/core/03-connection/types"
	ibcexported "github.com/cosmos/ibc-go/v10/modules/core/exported"
	ibctmmigrations "github.com/cosmos/ibc-go/v10/modules/light-clients/07-tendermint/migrations"
)

var upgradeNamesOfThisVersion = []string{
	"agoric-upgrade-23",
	"agoric-upgrade-23-1",
	"agoric-upgrade-23-2",
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
	case validUpgradeName("agoric-upgrade-23"):
		return true
	case validUpgradeName("agoric-upgrade-23-1"):
		return false
	case validUpgradeName("agoric-upgrade-23-2"):
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
			makeUpgrade23Handler(app, name),
		)
	}
}

// makeUpgrade23Handler performs standard upgrade actions plus custom actions for upgrade-23.
func makeUpgrade23Handler(app *GaiaApp, targetUpgrade string) upgradetypes.UpgradeHandler {
	_ = targetUpgrade
	return func(goCtx context.Context, plan upgradetypes.Plan, fromVm module.VersionMap) (module.VersionMap, error) {
		ctx := sdk.UnwrapSDKContext(goCtx)
		app.CheckControllerInited(false)

		CoreProposalSteps := []vm.CoreProposalStep{}

		// vatOptionUpdates are in-place per-vat option changes handed to
		// cosmic-swingset to apply at this upgrade's reboot point. Unlike the
		// CoreProposalSteps below, they are not core-evals: there is no
		// supported runtime path for a core-eval to flip an already-running
		// vat's `critical` flag, so this writes the kernel kvStore directly
		// (applyVatOptionUpdates, packages/SwingSet/src/controller/
		// upgradeSwingset.js). Chain selection lives here, cosmos-side.
		var vatOptionUpdates []vatOptionUpdate

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

			// Upgrade the components that changed.
			CoreProposalSteps = append(CoreProposalSteps,
				vm.CoreProposalStepForModules(
					"@agoric/builders/scripts/smart-wallet/build-wallet-factory2-upgrade.js",
				),
			)

			// terminationTargets is a slice of "$boardID:$instanceKitLabel" strings.
			var terminationTargets []string
			switch ctx.ChainID() {
			case "agoric-mainfork-1", "agoric-3": // MAINNET
				terminationTargets = []string{}
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

		// These vatOptionUpdates are idempotent and can be applied on any upgrade
		// of this version, even if it is not the first upgrade.
		{
			// Promote the running ymax contract vat to `critical`. These are
			// the known vatIDs for the ymax contract on each chain: ymax1 on
			// mainnet, ymax0 on devnet.
			promote := true
			switch ctx.ChainID() {
			case "agoric-3": // MAINNET (ymax1)
				vatOptionUpdates = []vatOptionUpdate{{VatID: "v288", Critical: &promote}}
			case "agoricdev-25": // DEVNET (ymax0)
				vatOptionUpdates = []vatOptionUpdate{{VatID: "v320", Critical: &promote}}
			}
			if len(vatOptionUpdates) > 0 {
				ctx.Logger().Info(
					"upgrade will apply in-place vat option updates",
					"chainID", ctx.ChainID(),
					"vatOptionUpdates", vatOptionUpdates,
				)
			}
		}

		app.upgradeDetails = &upgradeDetails{
			// Record the plan to send to SwingSet
			Plan: plan,
			// Core proposals that should run during the upgrade block
			// These will be merged with any coreProposals specified in the
			// upgradeInfo field of the upgrade plan ran as subsequent steps
			CoreProposals: vm.CoreProposalsFromSteps(CoreProposalSteps...),
			// In-place vat option updates applied at the reboot point (see above)
			VatOptionUpdates: vatOptionUpdates,
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
