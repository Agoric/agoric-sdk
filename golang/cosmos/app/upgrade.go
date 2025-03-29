package gaia

import (
	"encoding/json"
	"fmt"
	"reflect"
	"strings"
	"text/template"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	swingsetkeeper "github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/keeper"
	"github.com/cosmos/cosmos-sdk/baseapp"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/module"

	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"
	banktypes "github.com/cosmos/cosmos-sdk/x/bank/types"
	crisistypes "github.com/cosmos/cosmos-sdk/x/crisis/types"
	distrtypes "github.com/cosmos/cosmos-sdk/x/distribution/types"
	govtypes "github.com/cosmos/cosmos-sdk/x/gov/types"
	govv1 "github.com/cosmos/cosmos-sdk/x/gov/types/v1"
	minttypes "github.com/cosmos/cosmos-sdk/x/mint/types"
	paramstypes "github.com/cosmos/cosmos-sdk/x/params/types"
	slashingtypes "github.com/cosmos/cosmos-sdk/x/slashing/types"
	stakingtypes "github.com/cosmos/cosmos-sdk/x/staking/types"
	upgradetypes "github.com/cosmos/cosmos-sdk/x/upgrade/types"

	ibctmmigrations "github.com/cosmos/ibc-go/v7/modules/light-clients/07-tendermint/migrations"
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

func buildProposalStepWithArgs(moduleName string, entrypoint string, extra any) (vm.CoreProposalStep, error) {
	t := template.Must(template.New("").Parse(`{
  "module": "{{.moduleName}}",
  "entrypoint": "{{.entrypoint}}",
  "args": {{.args}}
}`))

	var args []byte
	var err error
	if extra == nil {
		// The specified entrypoint will be called with no extra arguments after powers.
		args = []byte(`[]`)
	} else if reflect.TypeOf(extra).Kind() == reflect.Map && reflect.TypeOf(extra).Key().Kind() == reflect.String {
		// The specified entrypoint will be called with this options argument after powers.
		args, err = json.Marshal([]any{extra})
	} else if reflect.TypeOf(extra).Kind() == reflect.Slice {
		// The specified entrypoint will be called with each of these arguments after powers.
		args, err = json.Marshal(extra)
	} else {
		return nil, fmt.Errorf("proposal extra must be nil, array, or string map, not %v", extra)
	}
	if err != nil {
		return nil, err
	}

	var result strings.Builder
	err = t.Execute(&result, map[string]any{
		"moduleName": moduleName,
		"entrypoint": entrypoint,
		"args":       string(args),
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
	case "UNRELEASED_emerynet":
		return "EMERYNET"
	case "UNRELEASED_BASIC":
		// Noupgrade for this version.
		return ""
	default:
		return ""
	}
}

func upgradeMintHolderCoreProposal(targetUpgrade string) (vm.CoreProposalStep, error) {
	return buildProposalStepFromScript(targetUpgrade, "@agoric/builders/scripts/vats/upgrade-mintHolder.js")
}

func restartFeeDistributorCoreProposal(targetUpgrade string) (vm.CoreProposalStep, error) {
	return buildProposalStepFromScript(targetUpgrade, "@agoric/builders/scripts/inter-protocol/replace-feeDistributor-combo.js")
}

func buildProposalStepFromScript(targetUpgrade string, builderScript string) (vm.CoreProposalStep, error) {
	variant := getVariantFromUpgradeName(targetUpgrade)

	if variant == "" {
		return nil, nil
	}

	return buildProposalStepWithArgs(
		builderScript,
		"defaultProposalBuilder",
		map[string]any{
			"variant": variant,
		},
	)
}

// RegisterUpgradeHandlers registers the upgrade handlers for all upgradeNames.
func (app *GaiaApp) RegisterUpgradeHandlers() {
	// Set param key table for params module migration
	for _, subspace := range app.ParamsKeeper.GetSubspaces() {
		subspace := subspace

		var keyTable paramstypes.KeyTable
		switch subspace.Name() {
		case authtypes.ModuleName:
			keyTable = authtypes.ParamKeyTable() //nolint:staticcheck
		case banktypes.ModuleName:
			keyTable = banktypes.ParamKeyTable() //nolint:staticcheck
		case stakingtypes.ModuleName:
			keyTable = stakingtypes.ParamKeyTable() //nolint:staticcheck
		case minttypes.ModuleName:
			keyTable = minttypes.ParamKeyTable() //nolint:staticcheck
		case distrtypes.ModuleName:
			keyTable = distrtypes.ParamKeyTable() //nolint:staticcheck
		case slashingtypes.ModuleName:
			keyTable = slashingtypes.ParamKeyTable() //nolint:staticcheck
		case govtypes.ModuleName:
			keyTable = govv1.ParamKeyTable() //nolint:staticcheck
		case crisistypes.ModuleName:
			keyTable = crisistypes.ParamKeyTable() //nolint:staticcheck
		default:
			continue
		}

		if !subspace.HasKeyTable() {
			subspace.WithKeyTable(keyTable)
		}
	}

	baseAppLegacySS := app.ParamsKeeper.Subspace(baseapp.Paramspace).WithKeyTable(paramstypes.ConsensusParamsKeyTable())

	for _, name := range upgradeNamesOfThisVersion {
		app.UpgradeKeeper.SetUpgradeHandler(
			name,
			makeUnreleasedUpgradeHandler(app, name, baseAppLegacySS),
		)
	}
}

// makeUnreleasedUpgradeHandler performs standard upgrade actions plus custom actions for the unreleased upgrade.
func makeUnreleasedUpgradeHandler(app *GaiaApp, targetUpgrade string, baseAppLegacySS paramstypes.Subspace) func(sdk.Context, upgradetypes.Plan, module.VersionMap) (module.VersionMap, error) {
	return func(ctx sdk.Context, plan upgradetypes.Plan, fromVm module.VersionMap) (module.VersionMap, error) {
		app.CheckControllerInited(false)

		// prune expired tendermint consensus states to save storage space
		_, err := ibctmmigrations.PruneExpiredConsensusStates(ctx, app.AppCodec(), app.IBCKeeper.ClientKeeper)
		if err != nil {
			return nil, err
		}

		// Migrate Tendermint consensus parameters from x/params module to a dedicated x/consensus module.
		baseapp.MigrateParams(ctx, baseAppLegacySS, &app.ConsensusParamsKeeper)

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
				// Register a new ZCF to be used for all future contract instances and upgrades
				vm.CoreProposalStepForModules(
					"@agoric/builders/scripts/vats/upgrade-zcf.js",
				),
				// because of #10794, we need to do at least a null upgrade of
				// the walletFactory on every software upgrade
				vm.CoreProposalStepForModules(
					"@agoric/builders/scripts/smart-wallet/build-wallet-factory2-upgrade.js",
				),
			)

			upgradeMintHolderStep, err := upgradeMintHolderCoreProposal(targetUpgrade)
			if err != nil {
				return nil, err
			} else if upgradeMintHolderStep != nil {
				CoreProposalSteps = append(CoreProposalSteps, upgradeMintHolderStep)
			}
			restartFeeDistributorStep, err := restartFeeDistributorCoreProposal(targetUpgrade)
			if err != nil {
				return nil, err
			} else if restartFeeDistributorStep != nil {
				CoreProposalSteps = append(CoreProposalSteps, restartFeeDistributorStep)
			}

			CoreProposalSteps = append(CoreProposalSteps,
				vm.CoreProposalStepForModules(
					"@agoric/builders/scripts/vats/upgrade-paRegistry.js",
				),
				vm.CoreProposalStepForModules(
					"@agoric/builders/scripts/vats/upgrade-provisionPool.js",
				),
				vm.CoreProposalStepForModules(
					"@agoric/builders/scripts/vats/upgrade-bank.js",
				),
				vm.CoreProposalStepForModules(
					"@agoric/builders/scripts/vats/upgrade-agoricNames.js",
				),
				vm.CoreProposalStepForModules(
					"@agoric/builders/scripts/vats/upgrade-asset-reserve.js",
				),
				vm.CoreProposalStepForModules(
					"@agoric/builders/scripts/vats/upgrade-psm.js",
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
