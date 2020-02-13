package daemon

import (
	"encoding/json"
	"io"

	"fmt"
	"os"

	"github.com/cosmos/cosmos-sdk/baseapp"
	"github.com/cosmos/cosmos-sdk/server"
	"github.com/cosmos/cosmos-sdk/store"
	"github.com/cosmos/cosmos-sdk/x/staking"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"github.com/tendermint/tendermint/libs/cli"
	"github.com/tendermint/tendermint/libs/log"

	app "github.com/Agoric/cosmic-swingset"
	"github.com/cosmos/cosmos-sdk/client/debug"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/x/bank"
	genutilcli "github.com/cosmos/cosmos-sdk/x/genutil/client/cli"
	abci "github.com/tendermint/tendermint/abci/types"
	tmtypes "github.com/tendermint/tendermint/types"
	dbm "github.com/tendermint/tm-db"

	appcodec "github.com/Agoric/cosmic-swingset/app/codec"
)

type Sender func(needReply bool, str string) (string, error)

func Run() {
	RunWithController(func(needReply bool, str string) (string, error) {
		fmt.Fprintln(os.Stderr, "FIXME: Would upcall to controller with", str)
		return "", nil
	})
}

func RunWithController(sendToController Sender) {
	cobra.EnableCommandSorting = false

	cdc := appcodec.MakeCodec(app.ModuleBasics)
	appCodec := appcodec.NewAppCodec(cdc)

	config := sdk.GetConfig()
	config.SetBech32PrefixForAccount(sdk.Bech32PrefixAccAddr, sdk.Bech32PrefixAccPub)
	config.SetBech32PrefixForValidator(sdk.Bech32PrefixValAddr, sdk.Bech32PrefixValPub)
	config.SetBech32PrefixForConsensusNode(sdk.Bech32PrefixConsAddr, sdk.Bech32PrefixConsPub)
	config.Seal()

	ctx := server.NewDefaultContext()

	rootCmd := &cobra.Command{
		Use:               "ag-chain-cosmos",
		Short:             "swingset App Daemon (server)",
		PersistentPreRunE: server.PersistentPreRunEFn(ctx),
	}
	// CLI commands to initialize the chain
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
	// AddGenesisAccountCmd allows users to add accounts to the genesis file
	rootCmd.AddCommand(AddGenesisAccountCmd(ctx, appCodec, app.DefaultNodeHome, app.DefaultCLIHome))
	rootCmd.AddCommand(debug.Cmd(cdc))

	server.AddCommands(ctx, cdc, rootCmd, makeNewApp(sendToController), makeExportAppStateAndTMValidators(sendToController))

	// prepare and add flags
	executor := cli.PrepareBaseCmd(rootCmd, "AG_CHAIN_COSMOS", app.DefaultNodeHome)
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
		abci := app.NewSwingSetApp(
			sendToController, logger, db, traceStore, true,
			baseapp.SetPruning(store.NewPruningOptionsFromString(viper.GetString("pruning"))),
			baseapp.SetMinGasPrices(viper.GetString(server.FlagMinGasPrices)),
			baseapp.SetHaltHeight(viper.GetUint64(server.FlagHaltHeight)),
			baseapp.SetHaltTime(viper.GetUint64(server.FlagHaltTime)),
			baseapp.SetInterBlockCache(cache),
		)
		msg := `{"type":"AG_COSMOS_INIT"}`
		// fmt.Println("Sending to Node", msg)
		_, err := sendToController(true, msg)
		// fmt.Println("Received AG_COSMOS_INIT response", ret, err)
		if err != nil {
			fmt.Fprintln(os.Stderr, "Cannot initialize Controller", err)
			os.Exit(1)
		}
		return abci
	}
}

func makeExportAppStateAndTMValidators(sendToController Sender) func(
	logger log.Logger, db dbm.DB, traceStore io.Writer, height int64,
	forZeroHeight bool,
	jailWhiteList []string,
) (json.RawMessage, []tmtypes.GenesisValidator, error) {
	return func(
		logger log.Logger, db dbm.DB, traceStore io.Writer, height int64, forZeroHeight bool,
		jailWhiteList []string,
	) (json.RawMessage, []tmtypes.GenesisValidator, error) {
		if height != -1 {
			ssApp := app.NewSwingSetApp(sendToController, logger, db, traceStore, false)
			err := ssApp.LoadHeight(height)
			if err != nil {
				return nil, nil, err
			}
			return ssApp.ExportAppStateAndValidators(forZeroHeight, jailWhiteList)
		}

		ssApp := app.NewSwingSetApp(sendToController, logger, db, traceStore, true)

		return ssApp.ExportAppStateAndValidators(forZeroHeight, jailWhiteList)
	}
}
