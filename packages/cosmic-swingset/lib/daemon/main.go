package daemon

import (
	"encoding/json"
	"fmt"
	"io"
	"os"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	abci "github.com/tendermint/tendermint/abci/types"
	"github.com/tendermint/tendermint/libs/cli"
	"github.com/tendermint/tendermint/libs/log"
	tmtypes "github.com/tendermint/tendermint/types"
	dbm "github.com/tendermint/tm-db"

	"github.com/cosmos/cosmos-sdk/baseapp"
	"github.com/cosmos/cosmos-sdk/client/debug"
	"github.com/cosmos/cosmos-sdk/client/flags"
	"github.com/cosmos/cosmos-sdk/server"
	"github.com/cosmos/cosmos-sdk/store"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/x/bank"
	genutilcli "github.com/cosmos/cosmos-sdk/x/genutil/client/cli"
	"github.com/cosmos/cosmos-sdk/x/staking"

	"github.com/Agoric/cosmic-swingset/app"
)

const flagInvCheckPeriod = "inv-check-period"

var invCheckPeriod uint

// Sender is a function that sends a request to the controller.
type Sender func(needReply bool, str string) (string, error)

// DefaultController is a stub controller.
var DefaultController = func(needReply bool, str string) (string, error) {
	fmt.Fprintln(os.Stderr, "FIXME: Would upcall to controller with", str)
	return "", nil
}

// Run starts the app with a stub controller.
func Run() {
	RunWithController(DefaultController)
}

// RunWithController starts the app with a custom upcall handler.
func RunWithController(sendToController Sender) {
	cobra.EnableCommandSorting = false

	appCodec, cdc := app.MakeCodecs()

	config := sdk.GetConfig()
	app.SetConfigDefaults(config)
	config.Seal()

	ctx := server.NewDefaultContext()
	cobra.EnableCommandSorting = false
	rootCmd := &cobra.Command{
		Use:               "ag-chain-cosmos",
		Short:             "Agoric Cosmos Daemon (server)",
		PersistentPreRunE: server.PersistentPreRunEFn(ctx),
	}
	rootCmd.AddCommand(genutilcli.InitCmd(ctx, cdc, app.ModuleBasics, app.DefaultNodeHome))
	rootCmd.AddCommand(genutilcli.CollectGenTxsCmd(ctx, cdc, bank.GenesisBalancesIterator{}, app.DefaultNodeHome))
	rootCmd.AddCommand(genutilcli.MigrateGenesisCmd(ctx, cdc))
	rootCmd.AddCommand(
		genutilcli.GenTxCmd(
			ctx, cdc, app.ModuleBasics, staking.AppModuleBasic{},
			bank.GenesisBalancesIterator{}, app.DefaultNodeHome, app.DefaultCLIHome,
		),
	)
	rootCmd.AddCommand(genutilcli.ValidateGenesisCmd(ctx, cdc, app.ModuleBasics))
	rootCmd.AddCommand(AddGenesisAccountCmd(ctx, cdc, appCodec, app.DefaultNodeHome, app.DefaultCLIHome))
	rootCmd.AddCommand(flags.NewCompletionCmd(rootCmd, true))
	rootCmd.AddCommand(testnetCmd(ctx, cdc, app.ModuleBasics, bank.GenesisBalancesIterator{}))
	rootCmd.AddCommand(replayCmd())
	rootCmd.AddCommand(debug.Cmd(cdc))

	server.AddCommands(ctx, cdc, rootCmd, makeNewApp(sendToController), makeExportAppStateAndTMValidators(sendToController))

	// prepare and add flags
	executor := cli.PrepareBaseCmd(rootCmd, "AG_CHAIN_COSMOS", app.DefaultNodeHome)
	rootCmd.PersistentFlags().UintVar(&invCheckPeriod, flagInvCheckPeriod,
		0, "Assert registered invariants every N blocks")
	err := executor.Execute()
	if err != nil {
		panic(err)
	}
}

func makeNewApp(sendToController Sender) func(logger log.Logger, db dbm.DB, traceStore io.Writer) abci.Application {
	// fmt.Println("Constructing app!")
	return func(logger log.Logger, db dbm.DB, traceStore io.Writer) abci.Application {
		var cache sdk.MultiStorePersistentCache

		if viper.GetBool(server.FlagInterBlockCache) {
			cache = store.NewCommitKVStoreCacheManager()
		}

		skipUpgradeHeights := make(map[int64]bool)
		for _, h := range viper.GetIntSlice(server.FlagUnsafeSkipUpgrades) {
			skipUpgradeHeights[int64(h)] = true
		}

		// fmt.Println("Starting daemon!")
		return app.NewAgoricApp(
			sendToController, logger, db, traceStore, true, invCheckPeriod, skipUpgradeHeights,
			viper.GetString(flags.FlagHome),
			// FIGME: instead use:
			// baseapp.SetPruning(store.NewPruningOptionsFromString(viper.GetString("pruning"))),
			// but for now, the default cosmos-sdk pruning doesn't keep the last
			// N committed blocks on disk, so we only rarely can recover from restarts.
			baseapp.SetPruning(store.PruneNothing),
			baseapp.SetMinGasPrices(viper.GetString(server.FlagMinGasPrices)),
			baseapp.SetHaltHeight(viper.GetUint64(server.FlagHaltHeight)),
			baseapp.SetHaltTime(viper.GetUint64(server.FlagHaltTime)),
			baseapp.SetInterBlockCache(cache),
		)
	}
}

func makeExportAppStateAndTMValidators(sendToController Sender) func(
	logger log.Logger, db dbm.DB, traceStore io.Writer, height int64, forZeroHeight bool, jailWhiteList []string,
) (json.RawMessage, []tmtypes.GenesisValidator, *abci.ConsensusParams, error) {
	return func(
		logger log.Logger, db dbm.DB, traceStore io.Writer, height int64, forZeroHeight bool,
		jailWhiteList []string,
	) (json.RawMessage, []tmtypes.GenesisValidator, *abci.ConsensusParams, error) {
		if height != -1 {
			agApp := app.NewAgoricApp(sendToController, logger, db, traceStore, true, uint(1), map[int64]bool{}, "")
			err := agApp.LoadHeight(height)
			if err != nil {
				return nil, nil, nil, err
			}
			return agApp.ExportAppStateAndValidators(forZeroHeight, jailWhiteList)
		}

		agApp := app.NewAgoricApp(sendToController, logger, db, traceStore, true, uint(1), map[int64]bool{}, "")
		return agApp.ExportAppStateAndValidators(forZeroHeight, jailWhiteList)
	}
}
