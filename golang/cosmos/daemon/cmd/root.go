package cmd

import (
	"errors"
	"io"
	"os"
	"path/filepath"

	serverconfig "github.com/cosmos/cosmos-sdk/server/config"

	"github.com/cosmos/cosmos-sdk/baseapp"
	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/config"
	"github.com/cosmos/cosmos-sdk/client/debug"
	"github.com/cosmos/cosmos-sdk/client/flags"
	"github.com/cosmos/cosmos-sdk/client/keys"
	"github.com/cosmos/cosmos-sdk/client/pruning"
	"github.com/cosmos/cosmos-sdk/client/rpc"
	"github.com/cosmos/cosmos-sdk/client/snapshot"
	"github.com/cosmos/cosmos-sdk/server"
	servertypes "github.com/cosmos/cosmos-sdk/server/types"
	"github.com/cosmos/cosmos-sdk/snapshots"
	snapshottypes "github.com/cosmos/cosmos-sdk/snapshots/types"
	"github.com/cosmos/cosmos-sdk/store"
	sdk "github.com/cosmos/cosmos-sdk/types"
	authcmd "github.com/cosmos/cosmos-sdk/x/auth/client/cli"
	"github.com/cosmos/cosmos-sdk/x/auth/types"
	vestingcli "github.com/cosmos/cosmos-sdk/x/auth/vesting/client/cli"
	banktypes "github.com/cosmos/cosmos-sdk/x/bank/types"
	genutilcli "github.com/cosmos/cosmos-sdk/x/genutil/client/cli"
	"github.com/spf13/cast"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	tmcfg "github.com/tendermint/tendermint/config"
	tmcli "github.com/tendermint/tendermint/libs/cli"
	"github.com/tendermint/tendermint/libs/log"
	dbm "github.com/tendermint/tm-db"

	gaia "github.com/Agoric/agoric-sdk/golang/cosmos/app"
	"github.com/Agoric/agoric-sdk/golang/cosmos/app/params"
	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
)

var AppName = "agd"
var OnStartHook func(*vm.AgdServer, log.Logger, servertypes.AppOptions) error
var OnExportHook func(*vm.AgdServer, log.Logger, servertypes.AppOptions) error

// NewRootCmd creates a new root command for simd. It is called once in the
// main function.
func NewRootCmd(sender vm.Sender) (*cobra.Command, params.EncodingConfig) {
	encodingConfig := gaia.MakeEncodingConfig()
	initClientCtx := client.Context{}.
		WithCodec(encodingConfig.Marshaler).
		WithInterfaceRegistry(encodingConfig.InterfaceRegistry).
		WithTxConfig(encodingConfig.TxConfig).
		WithLegacyAmino(encodingConfig.Amino).
		WithInput(os.Stdin).
		WithAccountRetriever(types.AccountRetriever{}).
		WithHomeDir(gaia.DefaultNodeHome).
		WithViper("AGD_")

	rootCmd := &cobra.Command{
		Use:   AppName,
		Short: "Agoric Cosmos App",
		PersistentPreRunE: func(cmd *cobra.Command, _ []string) error {
			// set the default command outputs
			cmd.SetOut(cmd.OutOrStdout())
			cmd.SetErr(cmd.ErrOrStderr())

			initClientCtx, err := client.ReadPersistentCommandFlags(initClientCtx, cmd.Flags())
			if err != nil {
				return err
			}

			initClientCtx, err = config.ReadFromClientConfig(initClientCtx)
			if err != nil {
				return err
			}

			if err := client.SetCmdClientContextHandler(initClientCtx, cmd); err != nil {
				return err
			}

			customAppTemplate, customAppConfig := initAppConfig()
			customTMConfig := initTendermintConfig()
			return server.InterceptConfigsPreRunHandler(cmd, customAppTemplate, customAppConfig, customTMConfig)
		},
	}

	initRootCmd(sender, rootCmd, encodingConfig)

	return rootCmd, encodingConfig
}

func initTendermintConfig() *tmcfg.Config {
	cfg := tmcfg.DefaultConfig()
	// customize config here
	return cfg
}

// initAppConfig helps to override default appConfig template and configs.
// return "", nil if no custom configuration is required for the application.
func initAppConfig() (string, interface{}) {
	// Allow us to overwrite the SDK's default server config.
	srvCfg := serverconfig.DefaultConfig()
	// The SDK's default minimum gas price is set to "" (empty value) inside
	// app.toml. If left empty by validators, the node will halt on startup.
	// However, the chain developer can set a default app.toml value for their
	// validators here.
	//
	// In summary:
	// - if you leave srvCfg.MinGasPrices = "", all validators MUST tweak their
	//   own app.toml config,
	// - if you set srvCfg.MinGasPrices non-empty, validators CAN tweak their
	//   own app.toml to override, or use this default value.
	//
	// FIXME: We may want to have Agoric set a min gas price in uist.
	// For now, we set it to zero so that validators don't have to worry about it.
	srvCfg.MinGasPrices = "0uist"

	return serverconfig.DefaultConfigTemplate, *srvCfg
}

func initRootCmd(sender vm.Sender, rootCmd *cobra.Command, encodingConfig params.EncodingConfig) {
	cfg := sdk.GetConfig()
	cfg.Seal()

	ac := appCreator{
		encCfg:    encodingConfig,
		sender:    sender,
		agdServer: vm.NewAgdServer(),
	}

	rootCmd.AddCommand(
		genutilcli.InitCmd(gaia.ModuleBasics, gaia.DefaultNodeHome),
		genutilcli.CollectGenTxsCmd(banktypes.GenesisBalancesIterator{}, gaia.DefaultNodeHome),
		genutilcli.MigrateGenesisCmd(),
		genutilcli.GenTxCmd(gaia.ModuleBasics, encodingConfig.TxConfig, banktypes.GenesisBalancesIterator{}, gaia.DefaultNodeHome),
		genutilcli.ValidateGenesisCmd(gaia.ModuleBasics),
		AddGenesisAccountCmd(encodingConfig.Marshaler, gaia.DefaultNodeHome),
		tmcli.NewCompletionCmd(rootCmd, true),
		testnetCmd(gaia.ModuleBasics, banktypes.GenesisBalancesIterator{}),
		debug.Cmd(),
		config.Cmd(),
		pruning.Cmd(ac.newApp, gaia.DefaultNodeHome),
		snapshot.Cmd(ac.newApp),
	)

	server.AddCommands(rootCmd, gaia.DefaultNodeHome, ac.newApp, ac.appExport, addModuleInitFlags)

	for _, command := range rootCmd.Commands() {
		if command.Name() == "export" {
			extendCosmosExportCommand(command)
			break
		}
	}

	// add keybase, auxiliary RPC, query, and tx child commands
	rootCmd.AddCommand(
		rpc.StatusCommand(),
		queryCommand(),
		txCommand(),
		keys.Commands(gaia.DefaultNodeHome),
	)
	// add rosetta
	rootCmd.AddCommand(server.RosettaCommand(encodingConfig.InterfaceRegistry, encodingConfig.Marshaler))
}

const (
	// FlagSplitVm is the command-line flag for subcommands that can use a
	// split-process Agoric VM.  The default is to use an embedded VM.
	FlagSplitVm      = "split-vm"
	EmbeddedVmEnvVar = "AGD_EMBEDDED_VM"
)

// hasVMController returns true if we have a VM (are running in split-vm mode,
// or with an embedded VM).
func hasVMController(serverCtx *server.Context) bool {
	return serverCtx.Viper.GetString(FlagSplitVm) != "" ||
		os.Getenv(EmbeddedVmEnvVar) != ""
}

func addAgoricVMFlags(cmd *cobra.Command) {
	cmd.PersistentFlags().String(
		FlagSplitVm,
		"",
		"Specify the external Agoric VM program",
	)
}

func addModuleInitFlags(startCmd *cobra.Command) {
	addAgoricVMFlags(startCmd)
}

func queryCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:                        "query",
		Aliases:                    []string{"q"},
		Short:                      "Querying subcommands",
		DisableFlagParsing:         true,
		SuggestionsMinimumDistance: 2,
		RunE:                       client.ValidateCmd,
	}

	cmd.AddCommand(
		authcmd.GetAccountCmd(),
		rpc.ValidatorCommand(),
		rpc.BlockCommand(),
		authcmd.QueryTxsByEventsCmd(),
		authcmd.QueryTxCmd(),
	)

	gaia.ModuleBasics.AddQueryCommands(cmd)
	cmd.PersistentFlags().String(flags.FlagChainID, "", "The network chain ID")

	return cmd
}

func txCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:                        "tx",
		Short:                      "Transactions subcommands",
		DisableFlagParsing:         true,
		SuggestionsMinimumDistance: 2,
		RunE:                       client.ValidateCmd,
	}

	cmd.AddCommand(
		authcmd.GetSignCommand(),
		authcmd.GetSignBatchCommand(),
		authcmd.GetMultiSignCommand(),
		authcmd.GetMultiSignBatchCmd(),
		authcmd.GetValidateSignaturesCommand(),
		flags.LineBreak,
		authcmd.GetBroadcastCommand(),
		authcmd.GetEncodeCommand(),
		authcmd.GetDecodeCommand(),
		authcmd.GetAuxToFeeCommand(),
		flags.LineBreak,
		vestingcli.GetTxCmd(),
	)

	gaia.ModuleBasics.AddTxCommands(cmd)
	cmd.PersistentFlags().String(flags.FlagChainID, "", "The network chain ID")

	return cmd
}

type appCreator struct {
	encCfg    params.EncodingConfig
	sender    vm.Sender
	agdServer *vm.AgdServer
}

func (ac appCreator) newApp(
	logger log.Logger,
	db dbm.DB,
	traceStore io.Writer,
	appOpts servertypes.AppOptions,
) servertypes.Application {
	if OnStartHook != nil {
		if err := OnStartHook(ac.agdServer, logger, appOpts); err != nil {
			panic(err)
		}
	}

	var cache sdk.MultiStorePersistentCache

	if cast.ToBool(appOpts.Get(server.FlagInterBlockCache)) {
		cache = store.NewCommitKVStoreCacheManager()
	}

	skipUpgradeHeights := make(map[int64]bool)
	for _, h := range cast.ToIntSlice(appOpts.Get(server.FlagUnsafeSkipUpgrades)) {
		skipUpgradeHeights[int64(h)] = true
	}

	pruningOpts, err := server.GetPruningOptionsFromFlags(appOpts)
	if err != nil {
		panic(err)
	}

	homePath := cast.ToString(appOpts.Get(flags.FlagHome))

	// Set a default value for FlagSwingStoreExportDir based on the homePath
	// in case we need to InitGenesis with swing-store data
	viper, ok := appOpts.(*viper.Viper)
	if ok && cast.ToString(appOpts.Get(gaia.FlagSwingStoreExportDir)) == "" {
		viper.Set(gaia.FlagSwingStoreExportDir, filepath.Join(homePath, "config", ExportedSwingStoreDirectoryName))
	}

	snapshotDir := filepath.Join(homePath, "data", "snapshots")
	snapshotDB, err := dbm.NewDB("metadata", dbm.GoLevelDBBackend, snapshotDir)
	if err != nil {
		panic(err)
	}
	snapshotStore, err := snapshots.NewStore(snapshotDB, snapshotDir)
	if err != nil {
		panic(err)
	}
	snapshotOptions := snapshottypes.NewSnapshotOptions(
		cast.ToUint64(appOpts.Get(server.FlagStateSyncSnapshotInterval)),
		cast.ToUint32(appOpts.Get(server.FlagStateSyncSnapshotKeepRecent)),
	)

	return gaia.NewAgoricApp(
		ac.sender, ac.agdServer,
		logger, db, traceStore, true, skipUpgradeHeights,
		homePath,
		cast.ToUint(appOpts.Get(server.FlagInvCheckPeriod)),
		ac.encCfg,
		appOpts,
		baseapp.SetPruning(pruningOpts),
		baseapp.SetMinGasPrices(cast.ToString(appOpts.Get(server.FlagMinGasPrices))),
		baseapp.SetHaltHeight(cast.ToUint64(appOpts.Get(server.FlagHaltHeight))),
		baseapp.SetHaltTime(cast.ToUint64(appOpts.Get(server.FlagHaltTime))),
		baseapp.SetMinRetainBlocks(cast.ToUint64(appOpts.Get(server.FlagMinRetainBlocks))),
		baseapp.SetInterBlockCache(cache),
		baseapp.SetTrace(cast.ToBool(appOpts.Get(server.FlagTrace))),
		baseapp.SetIndexEvents(cast.ToStringSlice(appOpts.Get(server.FlagIndexEvents))),
		baseapp.SetSnapshot(snapshotStore, snapshotOptions),
		baseapp.SetIAVLCacheSize(cast.ToInt(appOpts.Get(server.FlagIAVLCacheSize))),
		baseapp.SetIAVLDisableFastNode(cast.ToBool(appOpts.Get(server.FlagDisableIAVLFastNode))),
		baseapp.SetIAVLLazyLoading(cast.ToBool(appOpts.Get(server.FlagIAVLLazyLoading))),
	)
}

const (
	// FlagExportDir is the command-line flag for the "export" command specifying
	// where the output of the export should be placed. It contains both the
	// items names below: the genesis file, and a directory containing the
	// exported swing-store artifacts
	FlagExportDir = "export-dir"
	// ExportedGenesisFileName is the file name used to save the genesis in the export-dir
	ExportedGenesisFileName = "genesis.json"
	// ExportedSwingStoreDirectoryName is the directory name used to save the swing-store
	// export (artifacts only) in the export-dir
	ExportedSwingStoreDirectoryName = "swing-store"
)

// extendCosmosExportCommand monkey-patches the "export" command added by
// cosmos-sdk to add a required "export-dir" command-line flag, and create the
// genesis export in the specified directory if the VM is running.
func extendCosmosExportCommand(cmd *cobra.Command) {
	addAgoricVMFlags(cmd)
	cmd.Flags().String(FlagExportDir, "", "The directory where to create the genesis export")
	err := cmd.MarkFlagRequired(FlagExportDir)
	if err != nil {
		panic(err)
	}

	originalRunE := cmd.RunE

	extendedRunE := func(cmd *cobra.Command, args []string) error {
		serverCtx := server.GetServerContextFromCmd(cmd)

		exportDir, _ := cmd.Flags().GetString(FlagExportDir)
		err := os.MkdirAll(exportDir, os.ModePerm)
		if err != nil {
			return err
		}

		genesisPath := filepath.Join(exportDir, ExportedGenesisFileName)
		swingStoreExportPath := filepath.Join(exportDir, ExportedSwingStoreDirectoryName)

		err = os.MkdirAll(swingStoreExportPath, os.ModePerm)
		if err != nil {
			return err
		}
		// We unconditionally set FlagSwingStoreExportDir as for export, it makes
		// little sense for users to control this location separately, and we don't
		// want to override any swing-store artifacts that may be associated to the
		// current genesis.
		serverCtx.Viper.Set(gaia.FlagSwingStoreExportDir, swingStoreExportPath)

		if hasVMController(serverCtx) {
			// Capture the export in the genesisPath.
			// This will fail if a genesis.json already exists in the export-dir
			genesisFile, err := os.OpenFile(
				genesisPath,
				os.O_CREATE|os.O_EXCL|os.O_WRONLY,
				os.ModePerm,
			)
			if err != nil {
				return err
			}
			defer genesisFile.Close()
			cmd.SetOut(genesisFile)
		}

		// If we don't have a VM, appExport will just use the OnExportHook to exec
		// the VM program, which will result in reentering this function with the VM
		// controller set, and activate the above condition.
		return originalRunE(cmd, args)
	}

	cmd.RunE = extendedRunE
}

func (ac appCreator) appExport(
	logger log.Logger,
	db dbm.DB,
	traceStore io.Writer,
	height int64,
	forZeroHeight bool,
	jailAllowedAddrs []string,
	appOpts servertypes.AppOptions,
) (servertypes.ExportedApp, error) {
	if OnExportHook != nil {
		if err := OnExportHook(ac.agdServer, logger, appOpts); err != nil {
			return servertypes.ExportedApp{}, err
		}
	}

	homePath, ok := appOpts.Get(flags.FlagHome).(string)
	if !ok || homePath == "" {
		return servertypes.ExportedApp{}, errors.New("application home is not set")
	}

	var loadLatest bool
	if height == -1 {
		loadLatest = true
	}

	gaiaApp := gaia.NewAgoricApp(
		ac.sender, ac.agdServer,
		logger,
		db,
		traceStore,
		loadLatest,
		map[int64]bool{},
		homePath,
		cast.ToUint(appOpts.Get(server.FlagInvCheckPeriod)),
		ac.encCfg,
		appOpts,
	)

	if height != -1 {
		if err := gaiaApp.LoadHeight(height); err != nil {
			return servertypes.ExportedApp{}, err
		}
	}

	return gaiaApp.ExportAppStateAndValidators(forZeroHeight, jailAllowedAddrs)
}
