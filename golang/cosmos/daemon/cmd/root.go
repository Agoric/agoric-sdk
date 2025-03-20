package cmd

import (
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	serverconfig "github.com/cosmos/cosmos-sdk/server/config"

	rosettaCmd "github.com/cosmos/rosetta/cmd"

	"cosmossdk.io/log"
	"cosmossdk.io/simapp/params"
	simdcmd "cosmossdk.io/simapp/simd/cmd"
	confixcmd "cosmossdk.io/tools/confix/cmd"
	tmcfg "github.com/cometbft/cometbft/config"
	tmcli "github.com/cometbft/cometbft/libs/cli"
	dbm "github.com/cosmos/cosmos-db"
	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/config"
	"github.com/cosmos/cosmos-sdk/client/debug"
	"github.com/cosmos/cosmos-sdk/client/flags"
	"github.com/cosmos/cosmos-sdk/client/keys"
	"github.com/cosmos/cosmos-sdk/client/pruning"
	"github.com/cosmos/cosmos-sdk/client/rpc"
	"github.com/cosmos/cosmos-sdk/client/snapshot"
	"github.com/cosmos/cosmos-sdk/codec/address"
	"github.com/cosmos/cosmos-sdk/server"
	servertypes "github.com/cosmos/cosmos-sdk/server/types"
	simtestutil "github.com/cosmos/cosmos-sdk/testutil/sims"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/module"
	authcmd "github.com/cosmos/cosmos-sdk/x/auth/client/cli"
	"github.com/cosmos/cosmos-sdk/x/auth/types"
	vestingcli "github.com/cosmos/cosmos-sdk/x/auth/vesting/client/cli"
	banktypes "github.com/cosmos/cosmos-sdk/x/bank/types"
	"github.com/cosmos/cosmos-sdk/x/crisis"
	genutilcli "github.com/cosmos/cosmos-sdk/x/genutil/client/cli"
	"github.com/spf13/cast"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"

	"github.com/cosmos/cosmos-sdk/types/tx/signing"
	"github.com/cosmos/cosmos-sdk/x/auth/tx"
	authtxconfig "github.com/cosmos/cosmos-sdk/x/auth/tx/config"

	gaia "github.com/Agoric/agoric-sdk/golang/cosmos/app"
	"github.com/Agoric/agoric-sdk/golang/cosmos/app/txconfig"
	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	swingset "github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset"
	swingsetkeeper "github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/keeper"
	wasmkeeper "github.com/CosmWasm/wasmd/x/wasm/keeper"
	rosetta "github.com/cosmos/rosetta"
)

var AppName = "agd"
var OnStartHook func(*vm.AgdServer, log.Logger, servertypes.AppOptions) error
var OnExportHook func(*vm.AgdServer, log.Logger, servertypes.AppOptions) error

// CustomAppConfig extends the base config struct.
type CustomAppConfig struct {
	serverconfig.Config `mapstructure:",squash"`
	// Swingset must be named as expected by swingset.DefaultConfigTemplate
	// and must use a mapstructure key matching swingset.ConfigPrefix.
	Swingset swingset.SwingsetConfig `mapstructure:"swingset"`
	Rosetta  rosetta.Config          `mapstructure:"rosetta"`
}

type cobraRunE func(cmd *cobra.Command, args []string) error

func appendToPreRunE(cmd *cobra.Command, fn cobraRunE) {
	preRunE := cmd.PreRunE
	if preRunE == nil {
		cmd.PreRunE = fn
		return
	}
	composite := func(cmd *cobra.Command, args []string) error {
		if err := preRunE(cmd, args); err != nil {
			return err
		}
		return fn(cmd, args)
	}
	cmd.PreRunE = composite
}

// NewRootCmd creates a new root command for simd. It is called once in the
// main function.
func NewRootCmd(sender vm.Sender) (*cobra.Command, params.EncodingConfig) {
	// we "pre"-instantiate the application for getting the injected/configured encoding configuration
	// note, this is not necessary when using app wiring, as depinject can be directly used (see root_v2.go)

	appOpts := make(simtestutil.AppOptionsMap, 0)
	tempApp := gaia.NewSimApp(
		log.NewNopLogger(),
		dbm.NewMemDB(),
		nil,
		false, // we don't want to run the app, just get the encoding config
		appOpts,
		[]wasmkeeper.Option{},
	)

	encodingConfig := params.EncodingConfig{
		Codec:             tempApp.AppCodec(),
		InterfaceRegistry: tempApp.InterfaceRegistry(),
		TxConfig:          tempApp.GetTxConfig(),
		Amino:             tempApp.LegacyAmino(),
	}

	initClientCtx := client.Context{}.
		WithCodec(encodingConfig.Codec).
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

			initClientCtx = initClientCtx.WithCmdContext(cmd.Context())
			initClientCtx, err := client.ReadPersistentCommandFlags(initClientCtx, cmd.Flags())
			if err != nil {
				return err
			}

			initClientCtx, err = config.ReadFromClientConfig(initClientCtx)
			if err != nil {
				return err
			}

			// This needs to go after ReadFromClientConfig, as that function
			// sets the RPC client needed for SIGN_MODE_TEXTUAL. This sign mode
			// is only available if the client is online.
			if !initClientCtx.Offline {
				enabledSignModes := append(tx.DefaultSignModes, signing.SignMode_SIGN_MODE_TEXTUAL)
				txConfigOpts := tx.ConfigOptions{
					EnabledSignModes:           enabledSignModes,
					TextualCoinMetadataQueryFn: authtxconfig.NewGRPCCoinMetadataQueryFn(initClientCtx),
				}
				txConfig, err := txconfig.NewTxConfigWithOptionsWithCustomEncoders(
					initClientCtx.Codec,
					txConfigOpts,
				)
				if err != nil {
					return err
				}

				initClientCtx = initClientCtx.WithTxConfig(txConfig)
			}

			if err := client.SetCmdClientContextHandler(initClientCtx, cmd); err != nil {
				return err
			}

			customAppTemplate, customAppConfig := initAppConfig()
			customCMTConfig := initCometBFTConfig()

			return server.InterceptConfigsPreRunHandler(cmd, customAppTemplate, customAppConfig, customCMTConfig)
		},
	}

	initRootCmd(sender, rootCmd, encodingConfig, tempApp.BasicModuleManager)

	// add keyring to autocli opts
	autoCliOpts := tempApp.AutoCliOpts()
	autoCliOpts.ClientCtx = initClientCtx

	if err := autoCliOpts.EnhanceRootCommand(rootCmd); err != nil {
		panic(err)
	}

	return rootCmd, encodingConfig
}

func initCometBFTConfig() *tmcfg.Config {
	cfg := tmcfg.DefaultConfig()
	// customize config here
	return cfg
}

// initAppConfig helps to override default appConfig template and configs.
// return "", nil if no custom configuration is required for the application.
func initAppConfig() (string, interface{}) {
	srvCfg := serverconfig.DefaultConfig()

	// FIXME: We may want a non-zero min gas price.
	// For now, we set it to zero to reduce friction (the default "" fails
	// startup, forcing each validator to set their own value).
	srvCfg.MinGasPrices = "0ubld"

	customAppConfig := CustomAppConfig{
		Config:   *srvCfg,
		Swingset: swingset.DefaultSwingsetConfig,
	}

	// Config TOML.
	customAppTemplate := strings.Join([]string{
		serverconfig.DefaultConfigTemplate,
		swingset.DefaultConfigTemplate,
	}, "")

	return customAppTemplate, customAppConfig
}

func initRootCmd(sender vm.Sender, rootCmd *cobra.Command, encodingConfig params.EncodingConfig, basicManager module.BasicManager) {
	cfg := sdk.GetConfig()
	cfg.Seal()

	ac := appCreator{
		sender:    sender,
		agdServer: vm.NewAgdServer(),
	}

	genesisCmd := genutilcli.GenesisCoreCommand(
		encodingConfig.TxConfig,
		basicManager,
		gaia.DefaultNodeHome,
	)

	rootCmd.AddCommand(
		genutilcli.InitCmd(basicManager, gaia.DefaultNodeHome),
		genesisCmd,
	)
	// Alias all the genesis commands to the top level as well.
	rootCmd.AddCommand(
		genesisCmd.Commands()...,
	)
	rootCmd.AddCommand(
		tmcli.NewCompletionCmd(rootCmd, true),
		simdcmd.NewTestnetCmd(basicManager, banktypes.GenesisBalancesIterator{}, AppName),
		debug.Cmd(),
		confixcmd.ConfigCommand(),
		pruning.Cmd(ac.newSnapshotsApp, gaia.DefaultNodeHome),
		snapshot.Cmd(ac.newSnapshotsApp),
	)

	server.AddCommandsWithStartCmdOptions(rootCmd, gaia.DefaultNodeHome, ac.newApp, ac.appExport, server.StartCmdOptions{
		AddFlags: func(startCmd *cobra.Command) {
			addStartFlags(startCmd)
			crisis.AddModuleInitFlags(startCmd)
		},
	})

	for _, command := range rootCmd.Commands() {
		switch command.Name() {
		case "start":
			var preRunE cobraRunE = func(cmd *cobra.Command, _ []string) error {
				// Consume and validate config.
				viper := server.GetServerContextFromCmd(cmd).Viper
				baseConfig, err := serverconfig.GetConfig(viper)
				if err != nil {
					return err
				}
				if err = baseConfig.ValidateBasic(); err != nil {
					return err
				}
				if _, err = swingset.SwingsetConfigFromViper(viper); err != nil {
					return err
				}
				return nil
			}
			appendToPreRunE(command, preRunE)
		case "export":
			addAgoricVMFlags(command)
			extendCosmosExportCommand(command)
		case "snapshots":
			for _, subCommand := range command.Commands() {
				switch subCommand.Name() {
				case "restore":
					addAgoricVMFlags(subCommand)
				case "export":
					addAgoricVMFlags(subCommand)
					replaceCosmosSnapshotExportCommand(subCommand, ac)
				}
			}
		}
	}

	// add keybase, auxiliary RPC, query, and tx child commands
	qcmd := queryCommand()
	tcmd := txCommand()

	basicManager.AddQueryCommands(qcmd)
	basicManager.AddTxCommands(tcmd)
	rootCmd.AddCommand(
		server.StatusCommand(),
		qcmd,
		tcmd,
		keys.Commands(),
	)
	// add rosetta
	rootCmd.AddCommand(
		rosettaCmd.RosettaCommand(encodingConfig.InterfaceRegistry, encodingConfig.Codec),
	)
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

func addStartFlags(startCmd *cobra.Command) {
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
		rpc.WaitTxCmd(),
		rpc.ValidatorCommand(),
		server.QueryBlockCmd(),
		authcmd.QueryTxsByEventsCmd(),
		server.QueryBlocksCmd(),
		authcmd.QueryTxCmd(),
	)

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
		flags.LineBreak,
		vestingcli.GetTxCmd(address.NewBech32Codec(sdk.Bech32PrefixAccAddr)),
	)

	cmd.PersistentFlags().String(flags.FlagChainID, "", "The network chain ID")

	return cmd
}

type appCreator struct {
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

	baseappOptions := server.DefaultBaseappOptions(appOpts)
	homePath := cast.ToString(appOpts.Get(flags.FlagHome))

	// Set a default value for FlagSwingStoreExportDir based on homePath
	// in case we need to InitGenesis with swing-store data
	viper, ok := appOpts.(*viper.Viper)
	if ok && viper.GetString(gaia.FlagSwingStoreExportDir) == "" {
		exportDir := filepath.Join(homePath, "config", ExportedSwingStoreDirectoryName)
		viper.Set(gaia.FlagSwingStoreExportDir, exportDir)
	}

	return gaia.NewAgoricApp(
		ac.sender, ac.agdServer,
		logger, db, traceStore, true,
		appOpts,
		[]wasmkeeper.Option{},
		baseappOptions...,
	)
}

func (ac appCreator) newSnapshotsApp(
	logger log.Logger,
	db dbm.DB,
	traceStore io.Writer,
	appOpts servertypes.AppOptions,
) servertypes.Application {
	if OnExportHook != nil {
		if err := OnExportHook(ac.agdServer, logger, appOpts); err != nil {
			panic(err)
		}
	}

	baseappOptions := server.DefaultBaseappOptions(appOpts)

	return gaia.NewAgoricApp(
		ac.sender, ac.agdServer,
		logger, db, traceStore, true,
		appOpts,
		[]wasmkeeper.Option{},
		baseappOptions...,
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

var allowedSwingSetExportModes = map[string]bool{
	swingset.SwingStoreExportModeDebug:       true,
	swingset.SwingStoreExportModeOperational: true,
	swingset.SwingStoreExportModeSkip:        true,
}

// extendCosmosExportCommand monkey-patches the "export" command added by
// cosmos-sdk to add a required "export-dir" command-line flag, and create the
// genesis export in the specified directory if the VM is running.
func extendCosmosExportCommand(cmd *cobra.Command) {
	cmd.Flags().String(FlagExportDir, "", "The directory where to create the genesis export")
	err := cmd.MarkFlagRequired(FlagExportDir)
	if err != nil {
		panic(err)
	}

	var keys []string
	for key := range allowedSwingSetExportModes {
		keys = append(keys, key)
	}

	cmd.Flags().String(
		gaia.FlagSwingStoreExportMode,
		swingset.SwingStoreExportModeOperational,
		fmt.Sprintf(
			"The mode for swingstore export (%s)",
			strings.Join(keys, " | "),
		),
	)

	originalRunE := cmd.RunE

	extendedRunE := func(cmd *cobra.Command, args []string) error {
		serverCtx := server.GetServerContextFromCmd(cmd)

		exportDir, _ := cmd.Flags().GetString(FlagExportDir)
		swingStoreExportMode, _ := cmd.Flags().GetString(gaia.FlagSwingStoreExportMode)

		err := os.MkdirAll(exportDir, os.ModePerm)
		if err != nil {
			return err
		}

		genesisPath := filepath.Join(exportDir, ExportedGenesisFileName)

		// Since none mode doesn't perform any swing store export
		// There is no point in creating the export directory
		if swingStoreExportMode != swingset.SwingStoreExportModeSkip {
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
		}

		if hasVMController(serverCtx) || swingStoreExportMode == swingset.SwingStoreExportModeSkip {
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
	modulesToExport []string,
) (servertypes.ExportedApp, error) {
	swingStoreExportMode, ok := appOpts.Get(gaia.FlagSwingStoreExportMode).(string)
	if !(ok && allowedSwingSetExportModes[swingStoreExportMode]) {
		return servertypes.ExportedApp{}, fmt.Errorf(
			"export mode '%s' is not supported",
			swingStoreExportMode,
		)
	}

	// We don't have to launch VM in case the swing store export is not required
	if swingStoreExportMode != swingset.SwingStoreExportModeSkip && OnExportHook != nil {
		if err := OnExportHook(ac.agdServer, logger, appOpts); err != nil {
			return servertypes.ExportedApp{}, err
		}
	}

	homePath, ok := appOpts.Get(flags.FlagHome).(string)
	if !ok || homePath == "" {
		return servertypes.ExportedApp{}, errors.New("application home is not set")
	}

	loadLatest := height == -1

	gaiaApp := gaia.NewAgoricApp(
		ac.sender, ac.agdServer,
		logger,
		db,
		traceStore,
		loadLatest,
		appOpts,
		[]wasmkeeper.Option{},
	)

	if !loadLatest {
		if err := gaiaApp.LoadHeight(height); err != nil {
			return servertypes.ExportedApp{}, err
		}
	}

	return gaiaApp.ExportAppStateAndValidators(forZeroHeight, jailAllowedAddrs, modulesToExport)
}

// replaceCosmosSnapshotExportCommand monkey-patches the "snapshots export" command
// added by cosmos-sdk and replaces its implementation with one suitable for
// our modifications to the cosmos snapshots process
func replaceCosmosSnapshotExportCommand(cmd *cobra.Command, ac appCreator) {
	// Copy of RunE is cosmos-sdk/client/snapshot/export.go
	replacedRunE := func(cmd *cobra.Command, args []string) error {
		ctx := server.GetServerContextFromCmd(cmd)

		heightFlag, err := cmd.Flags().GetInt64("height")
		if err != nil {
			return err
		}

		home := ctx.Config.RootDir
		dataDir := filepath.Join(home, "data")
		db, err := dbm.NewDB("application", server.GetAppDBBackend(ctx.Viper), dataDir)
		if err != nil {
			return err
		}

		app := ac.newSnapshotsApp(ctx.Logger, db, nil, ctx.Viper)
		gaiaApp := app.(*gaia.GaiaApp)

		latestHeight := app.CommitMultiStore().LastCommitID().Version

		if heightFlag != 0 && latestHeight != heightFlag {
			return fmt.Errorf("cannot export at height %d, only latest height %d is supported", heightFlag, latestHeight)
		}

		cmd.Printf("Exporting snapshot for height %d\n", latestHeight)

		err = gaiaApp.SwingSetSnapshotter.InitiateSnapshot(latestHeight)
		if err != nil {
			return err
		}

		err = swingsetkeeper.WaitUntilSwingStoreExportDone()
		if err != nil {
			return err
		}

		snapshotList, err := app.SnapshotManager().List()
		if err != nil {
			return err
		}

		snapshotHeight := uint64(latestHeight)

		for _, snapshot := range snapshotList {
			if snapshot.Height == snapshotHeight {
				cmd.Printf("Snapshot created at height %d, format %d, chunks %d\n", snapshot.Height, snapshot.Format, snapshot.Chunks)
				break
			}
		}

		return nil
	}

	cmd.RunE = replacedRunE
}
