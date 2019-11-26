package daemon

import (
	"encoding/json"
	"io"

	"fmt"
	"os"

	"github.com/cosmos/cosmos-sdk/server"
	"github.com/cosmos/cosmos-sdk/x/genaccounts"
	genaccscli "github.com/cosmos/cosmos-sdk/x/genaccounts/client/cli"
	"github.com/cosmos/cosmos-sdk/x/staking"

	"github.com/spf13/cobra"
	"github.com/tendermint/tendermint/libs/cli"
	"github.com/tendermint/tendermint/libs/log"

	sdk "github.com/cosmos/cosmos-sdk/types"
	genutilcli "github.com/cosmos/cosmos-sdk/x/genutil/client/cli"
	app "github.com/Agoric/cosmic-swingset"
	abci "github.com/tendermint/tendermint/abci/types"
	tmtypes "github.com/tendermint/tendermint/types"
	dbm "github.com/tendermint/tm-db"

	"github.com/Agoric/cosmic-swingset/x/swingset"
)

type Sender func(needReply bool, str string) (string, error)

func Run() {
	RunWithController(nil)
}

func RunWithController(sendToNode Sender) {
	cobra.EnableCommandSorting = false

	cdc := app.MakeCodec()

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
	rootCmd.AddCommand(
		genutilcli.InitCmd(ctx, cdc, app.ModuleBasics, app.DefaultNodeHome),
		genutilcli.CollectGenTxsCmd(ctx, cdc, genaccounts.AppModuleBasic{}, app.DefaultNodeHome),
		genutilcli.GenTxCmd(
			ctx, cdc, app.ModuleBasics, staking.AppModuleBasic{},
			genaccounts.AppModuleBasic{}, app.DefaultNodeHome, app.DefaultCLIHome,
		),
		genutilcli.ValidateGenesisCmd(ctx, cdc, app.ModuleBasics),
		// AddGenesisAccountCmd allows users to add accounts to the genesis file
		genaccscli.AddGenesisAccountCmd(ctx, cdc, app.DefaultNodeHome, app.DefaultCLIHome),
	)

	// FIXME: Remove this global variable!
	swingset.NodeMessageSender = sendToNode

	server.AddCommands(ctx, cdc, rootCmd, makeNewApp(sendToNode), exportAppStateAndTMValidators)

	// prepare and add flags
	executor := cli.PrepareBaseCmd(rootCmd, "AG_CHAIN_COSMOS", app.DefaultNodeHome)
	err := executor.Execute()
	if err != nil {
		panic(err)
	}
}

func makeNewApp(sendToNode Sender) func(logger log.Logger, db dbm.DB, traceStore io.Writer) abci.Application {
	// fmt.Println("Constructing app!")
	return func(logger log.Logger, db dbm.DB, traceStore io.Writer) abci.Application {
		// fmt.Println("Starting daemon!")
		abci := app.NewSwingSetApp(logger, db)
		if sendToNode != nil {
			msg := `{"type":"AG_COSMOS_INIT"}`
			// fmt.Println("Sending to Node", msg)
			_, err := sendToNode(true, msg)
			// fmt.Println("Received AG_COSMOS_INIT response", ret, err)
			if err != nil {
				fmt.Fprintln(os.Stderr, "Cannot initialize Node", err)
				os.Exit(1)
			}
		}
		return abci
	}
}

func exportAppStateAndTMValidators(
	logger log.Logger, db dbm.DB, traceStore io.Writer, height int64, forZeroHeight bool, jailWhiteList []string,
) (json.RawMessage, []tmtypes.GenesisValidator, error) {

	if height != -1 {
		ssApp := app.NewSwingSetApp(logger, db)
		err := ssApp.LoadHeight(height)
		if err != nil {
			return nil, nil, err
		}
		return ssApp.ExportAppStateAndValidators(forZeroHeight, jailWhiteList)
	}

	ssApp := app.NewSwingSetApp(logger, db)

	return ssApp.ExportAppStateAndValidators(forZeroHeight, jailWhiteList)
}
