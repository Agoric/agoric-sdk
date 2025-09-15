package gaia

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	stdlog "log"
	"net/http"
	"os"
	"path/filepath"
	"runtime/debug"
	"time"

	autocliv1 "cosmossdk.io/api/cosmos/autocli/v1"
	reflectionv1 "cosmossdk.io/api/cosmos/reflection/v1"
	"cosmossdk.io/client/v2/autocli"
	"cosmossdk.io/core/appmodule"
	sdkioerrors "cosmossdk.io/errors"
	storetypes "cosmossdk.io/store/types"
	"cosmossdk.io/x/evidence"
	evidencekeeper "cosmossdk.io/x/evidence/keeper"
	evidencetypes "cosmossdk.io/x/evidence/types"
	"cosmossdk.io/x/feegrant"
	feegrantkeeper "cosmossdk.io/x/feegrant/keeper"
	feegrantmodule "cosmossdk.io/x/feegrant/module"
	"cosmossdk.io/x/tx/signing"
	"cosmossdk.io/x/upgrade"
	upgradekeeper "cosmossdk.io/x/upgrade/keeper"
	upgradetypes "cosmossdk.io/x/upgrade/types"
	"github.com/cosmos/cosmos-sdk/baseapp"
	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/flags"
	cmtservice "github.com/cosmos/cosmos-sdk/client/grpc/cmtservice"
	nodeservice "github.com/cosmos/cosmos-sdk/client/grpc/node"
	"github.com/cosmos/cosmos-sdk/codec"
	"github.com/cosmos/cosmos-sdk/codec/address"
	"github.com/cosmos/cosmos-sdk/codec/types"
	"github.com/cosmos/cosmos-sdk/runtime"
	runtimeservices "github.com/cosmos/cosmos-sdk/runtime/services"
	"github.com/cosmos/cosmos-sdk/server"
	"github.com/cosmos/cosmos-sdk/server/api"
	"github.com/cosmos/cosmos-sdk/server/config"
	servertypes "github.com/cosmos/cosmos-sdk/server/types"
	"github.com/cosmos/cosmos-sdk/std"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/module"
	"github.com/cosmos/cosmos-sdk/version"
	"github.com/cosmos/cosmos-sdk/x/auth"
	"github.com/cosmos/cosmos-sdk/x/auth/ante"
	authcodec "github.com/cosmos/cosmos-sdk/x/auth/codec"
	authkeeper "github.com/cosmos/cosmos-sdk/x/auth/keeper"
	authsims "github.com/cosmos/cosmos-sdk/x/auth/simulation"
	authtx "github.com/cosmos/cosmos-sdk/x/auth/tx"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"
	"github.com/cosmos/cosmos-sdk/x/auth/vesting"
	vestingtypes "github.com/cosmos/cosmos-sdk/x/auth/vesting/types"
	"github.com/cosmos/cosmos-sdk/x/authz"
	authzkeeper "github.com/cosmos/cosmos-sdk/x/authz/keeper"
	authzmodule "github.com/cosmos/cosmos-sdk/x/authz/module"
	"github.com/cosmos/cosmos-sdk/x/bank"
	bankkeeper "github.com/cosmos/cosmos-sdk/x/bank/keeper"
	banktypes "github.com/cosmos/cosmos-sdk/x/bank/types"
	consensusparamskeeper "github.com/cosmos/cosmos-sdk/x/consensus/keeper"
	consensusparamstypes "github.com/cosmos/cosmos-sdk/x/consensus/types"
	distr "github.com/cosmos/cosmos-sdk/x/distribution"
	distrkeeper "github.com/cosmos/cosmos-sdk/x/distribution/keeper"
	distrtypes "github.com/cosmos/cosmos-sdk/x/distribution/types"
	"github.com/cosmos/cosmos-sdk/x/genutil"
	genutiltypes "github.com/cosmos/cosmos-sdk/x/genutil/types"
	"github.com/cosmos/cosmos-sdk/x/gov"
	govclient "github.com/cosmos/cosmos-sdk/x/gov/client"
	govkeeper "github.com/cosmos/cosmos-sdk/x/gov/keeper"
	govtypes "github.com/cosmos/cosmos-sdk/x/gov/types"
	govv1beta1 "github.com/cosmos/cosmos-sdk/x/gov/types/v1beta1"
	"github.com/cosmos/cosmos-sdk/x/mint"
	mintkeeper "github.com/cosmos/cosmos-sdk/x/mint/keeper"
	minttypes "github.com/cosmos/cosmos-sdk/x/mint/types"
	"github.com/cosmos/cosmos-sdk/x/params"
	paramsclient "github.com/cosmos/cosmos-sdk/x/params/client"
	paramskeeper "github.com/cosmos/cosmos-sdk/x/params/keeper"
	paramstypes "github.com/cosmos/cosmos-sdk/x/params/types"
	paramproposal "github.com/cosmos/cosmos-sdk/x/params/types/proposal"
	"github.com/cosmos/cosmos-sdk/x/slashing"
	slashingkeeper "github.com/cosmos/cosmos-sdk/x/slashing/keeper"
	slashingtypes "github.com/cosmos/cosmos-sdk/x/slashing/types"
	"github.com/cosmos/cosmos-sdk/x/staking"
	stakingkeeper "github.com/cosmos/cosmos-sdk/x/staking/keeper"
	stakingtypes "github.com/cosmos/cosmos-sdk/x/staking/types"
	"github.com/cosmos/gogoproto/proto"
	"github.com/cosmos/ibc-go/modules/capability"
	capabilitykeeper "github.com/cosmos/ibc-go/modules/capability/keeper"
	capabilitytypes "github.com/cosmos/ibc-go/modules/capability/types"
	ica "github.com/cosmos/ibc-go/v8/modules/apps/27-interchain-accounts"

	"cosmossdk.io/log"
	abci "github.com/cometbft/cometbft/abci/types"
	tmjson "github.com/cometbft/cometbft/libs/json"
	tmos "github.com/cometbft/cometbft/libs/os"
	tmproto "github.com/cometbft/cometbft/proto/tendermint/types"
	dbm "github.com/cosmos/cosmos-db"
	icahost "github.com/cosmos/ibc-go/v8/modules/apps/27-interchain-accounts/host"
	icahostkeeper "github.com/cosmos/ibc-go/v8/modules/apps/27-interchain-accounts/host/keeper"
	icahosttypes "github.com/cosmos/ibc-go/v8/modules/apps/27-interchain-accounts/host/types"
	icatypes "github.com/cosmos/ibc-go/v8/modules/apps/27-interchain-accounts/types"
	ibctransfer "github.com/cosmos/ibc-go/v8/modules/apps/transfer"
	ibctransferkeeper "github.com/cosmos/ibc-go/v8/modules/apps/transfer/keeper"
	ibctransfertypes "github.com/cosmos/ibc-go/v8/modules/apps/transfer/types"
	ibc "github.com/cosmos/ibc-go/v8/modules/core"
	ibcclient "github.com/cosmos/ibc-go/v8/modules/core/02-client"
	ibcclienttypes "github.com/cosmos/ibc-go/v8/modules/core/02-client/types"
	ibcporttypes "github.com/cosmos/ibc-go/v8/modules/core/05-port/types"
	ibcexported "github.com/cosmos/ibc-go/v8/modules/core/exported"
	ibckeeper "github.com/cosmos/ibc-go/v8/modules/core/keeper"
	ibcsolo "github.com/cosmos/ibc-go/v8/modules/light-clients/06-solomachine"
	ibctm "github.com/cosmos/ibc-go/v8/modules/light-clients/07-tendermint"
	"github.com/gorilla/mux"
	"github.com/rakyll/statik/fs"
	"github.com/spf13/cast"

	appante "github.com/Agoric/agoric-sdk/golang/cosmos/ante"
	"github.com/Agoric/agoric-sdk/golang/cosmos/app/txconfig"
	agorictypes "github.com/Agoric/agoric-sdk/golang/cosmos/types"

	// conv "github.com/Agoric/agoric-sdk/golang/cosmos/types/conv"
	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset"
	swingsetclient "github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/client"
	swingsetkeeper "github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/keeper"
	swingsettypes "github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vbank"
	vbanktypes "github.com/Agoric/agoric-sdk/golang/cosmos/x/vbank/types"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vibc"
	vibctypes "github.com/Agoric/agoric-sdk/golang/cosmos/x/vibc/types"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vlocalchain"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vstorage"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vtransfer"
	vtransferkeeper "github.com/Agoric/agoric-sdk/golang/cosmos/x/vtransfer/keeper"
	testtypes "github.com/cosmos/ibc-go/v8/testing/types"

	// Import the packet forward middleware
	packetforward "github.com/cosmos/ibc-apps/middleware/packet-forward-middleware/v8/packetforward"
	packetforwardkeeper "github.com/cosmos/ibc-apps/middleware/packet-forward-middleware/v8/packetforward/keeper"
	packetforwardtypes "github.com/cosmos/ibc-apps/middleware/packet-forward-middleware/v8/packetforward/types"

	"github.com/CosmWasm/wasmd/x/wasm"
	wasmkeeper "github.com/CosmWasm/wasmd/x/wasm/keeper"
	wasmtypes "github.com/CosmWasm/wasmd/x/wasm/types"
	// unnamed import of statik for swagger UI support
	// XXX figure out how to build the docs
	// _ "github.com/cosmos/cosmos-sdk/client/docs/statik"
)

const appName = "agoric"

const (
	// FlagSwingStoreExportDir defines the config flag used to specify where a
	// genesis swing-store export is expected. For start from genesis, the default
	// value is config/swing-store in the home directory. For genesis export, the
	// value is always a "swing-store" directory sibling to the exported
	// genesis.json file.
	// TODO: document this flag in config, likely alongside the genesis path
	FlagSwingStoreExportDir = "swing-store-export-dir"
	// FlagSwingStoreExportMode defines the export mode for the swing store
	// Alongside the default mode `operational`, there are two other modes
	//
	// 1- `skip` mode will skip the swing store export altogether
	//
	// 2- `debug` mode will export all the available store
	FlagSwingStoreExportMode = "swing-store-export-mode"
)

var (
	// DefaultNodeHome default home directories for the application daemon
	DefaultNodeHome string

	// ModuleBasics defines the module BasicManager is in charge of setting up basic,
	// non-dependant module elements, such as codec registration
	// and genesis verification.
	ModuleBasics = module.NewBasicManager(
		auth.AppModuleBasic{},
		genutil.NewAppModuleBasic(genutiltypes.DefaultMessageValidator),
		bank.AppModuleBasic{},
		capability.AppModuleBasic{},
		staking.AppModuleBasic{},
		mint.AppModuleBasic{},
		distr.AppModuleBasic{},
		gov.NewAppModuleBasic([]govclient.ProposalHandler{
			paramsclient.ProposalHandler,
			swingsetclient.CoreEvalProposalHandler,
		}),
		params.AppModuleBasic{},
		slashing.AppModuleBasic{},
		feegrantmodule.AppModuleBasic{},
		authzmodule.AppModuleBasic{},
		ibc.AppModuleBasic{},
		ibctm.AppModuleBasic{},
		ibcsolo.AppModuleBasic{},
		upgrade.AppModuleBasic{},
		evidence.AppModuleBasic{},
		ibctransfer.AppModuleBasic{},
		vesting.AppModuleBasic{},
		ica.AppModuleBasic{},
		packetforward.AppModuleBasic{},
		wasm.AppModuleBasic{},
		swingset.AppModuleBasic{},
		vstorage.AppModuleBasic{},
		vibc.AppModuleBasic{},
		vbank.AppModuleBasic{},
		vtransfer.AppModuleBasic{},
	)
	// module account permissions
	maccPerms = map[string][]string{
		authtypes.FeeCollectorName:     nil,
		distrtypes.ModuleName:          nil,
		icatypes.ModuleName:            nil,
		minttypes.ModuleName:           {authtypes.Minter},
		stakingtypes.BondedPoolName:    {authtypes.Burner, authtypes.Staking},
		stakingtypes.NotBondedPoolName: {authtypes.Burner, authtypes.Staking},
		govtypes.ModuleName:            {authtypes.Burner},
		ibctransfertypes.ModuleName:    {authtypes.Minter, authtypes.Burner},
		vbank.ModuleName:               {authtypes.Minter, authtypes.Burner},
		vbanktypes.ReservePoolName:     nil,
		vbanktypes.ProvisionPoolName:   nil,
		vbanktypes.GiveawayPoolName:    nil,
		wasmtypes.ModuleName:           {authtypes.Burner},
	}
)

var (
	_ runtime.AppI            = (*GaiaApp)(nil)
	_ servertypes.Application = (*GaiaApp)(nil)
	// _ ibctesting.TestingApp   = (*GaiaApp)(nil)
)

// GaiaApp extends an ABCI application, but with most of its parameters exported.
// They are exported for convenience in cr1eating helper functions, as object
// capabilities aren't needed for testing.
type GaiaApp struct { // nolint: golint
	*baseapp.BaseApp
	resolvedConfig    servertypes.AppOptions
	legacyAmino       *codec.LegacyAmino
	appCodec          codec.Codec
	interfaceRegistry types.InterfaceRegistry
	txConfig          client.TxConfig

	controllerInited bool
	bootstrapNeeded  bool
	swingsetPort     int
	vbankPort        int
	vibcPort         int
	vstoragePort     int
	vlocalchainPort  int
	vtransferPort    int

	upgradeDetails *upgradeDetails

	invCheckPeriod uint

	// keys to access the substores
	keys    map[string]*storetypes.KVStoreKey
	tkeys   map[string]*storetypes.TransientStoreKey
	memKeys map[string]*storetypes.MemoryStoreKey

	// manage communication from the VM to the ABCI app
	AgdServer *vm.AgdServer

	// keepers
	AccountKeeper         authkeeper.AccountKeeper
	BankKeeper            bankkeeper.Keeper
	CapabilityKeeper      *capabilitykeeper.Keeper
	StakingKeeper         *stakingkeeper.Keeper
	SlashingKeeper        slashingkeeper.Keeper
	MintKeeper            mintkeeper.Keeper
	DistrKeeper           distrkeeper.Keeper
	GovKeeper             *govkeeper.Keeper
	UpgradeKeeper         *upgradekeeper.Keeper
	ParamsKeeper          paramskeeper.Keeper
	ConsensusParamsKeeper consensusparamskeeper.Keeper
	// IBC Keeper must be a pointer in the app, so we can SetRouter on it correctly
	IBCKeeper           *ibckeeper.Keeper
	ICAHostKeeper       icahostkeeper.Keeper
	PacketForwardKeeper *packetforwardkeeper.Keeper
	EvidenceKeeper      evidencekeeper.Keeper
	TransferKeeper      ibctransferkeeper.Keeper
	FeeGrantKeeper      feegrantkeeper.Keeper
	AuthzKeeper         authzkeeper.Keeper

	SwingStoreExportsHandler swingset.SwingStoreExportsHandler
	SwingSetSnapshotter      swingset.ExtensionSnapshotter
	SwingSetKeeper           swingset.Keeper
	VstorageKeeper           vstorage.Keeper
	VibcKeeper               vibc.Keeper
	VbankKeeper              vbank.Keeper
	VlocalchainKeeper        vlocalchain.Keeper
	VtransferKeeper          vtransferkeeper.Keeper

	// make scoped keepers public for test purposes
	ScopedIBCKeeper      capabilitykeeper.ScopedKeeper
	ScopedTransferKeeper capabilitykeeper.ScopedKeeper
	ScopedICAHostKeeper  capabilitykeeper.ScopedKeeper
	ScopedVibcKeeper     capabilitykeeper.ScopedKeeper
	ScopedWasmKeeper     capabilitykeeper.ScopedKeeper

	// Wasm
	WasmKeeper wasmkeeper.Keeper

	// the module managers
	ModuleManager      *module.Manager
	BasicModuleManager module.BasicManager

	// simulation manager
	sm           *module.SimulationManager
	configurator module.Configurator
}

func init() {
	userHomeDir, err := os.UserHomeDir()
	if err != nil {
		stdlog.Println("Failed to get home dir %2", err)
	}

	DefaultNodeHome = filepath.Join(userHomeDir, ".agoric")
}

// NewSimApp returns a reference to an initialized sim app.
func NewSimApp(
	logger log.Logger,
	db dbm.DB, traceStore io.Writer,
	loadLatest bool,
	appOpts servertypes.AppOptions,
	wasmOpts []wasmkeeper.Option,
	baseAppOptions ...func(*baseapp.BaseApp),
) *GaiaApp {
	var defaultController vm.Sender = func(ctx context.Context, needReply bool, jsonRequest string) (jsonReply string, err error) {
		return "", fmt.Errorf("unexpected VM upcall with no controller: %s", jsonRequest)
	}

	app := NewAgoricApp(
		defaultController, vm.NewAgdServer(),
		logger, db, traceStore, loadLatest, appOpts, wasmOpts, baseAppOptions...,
	)
	app.SetName("SimApp")
	return app
}

func NewAgoricApp(
	sendToController vm.Sender,
	agdServer *vm.AgdServer,
	logger log.Logger,
	db dbm.DB,
	traceStore io.Writer,
	loadLatest bool,
	appOpts servertypes.AppOptions,
	wasmOpts []wasmkeeper.Option,
	baseAppOptions ...func(*baseapp.BaseApp),
) *GaiaApp {
	homePath := cast.ToString(appOpts.Get(flags.FlagHome))
	invCheckPeriod := cast.ToUint(appOpts.Get(server.FlagInvCheckPeriod))
	// get skipUpgradeHeights from the app options
	skipUpgradeHeights := map[int64]bool{}
	for _, h := range cast.ToIntSlice(appOpts.Get(server.FlagUnsafeSkipUpgrades)) {
		skipUpgradeHeights[int64(h)] = true
	}

	signingOptions := signing.Options{
		AddressCodec: address.Bech32Codec{
			Bech32Prefix: sdk.GetConfig().GetBech32AccountAddrPrefix(),
		},
		ValidatorAddressCodec: address.Bech32Codec{
			Bech32Prefix: sdk.GetConfig().GetBech32ValidatorAddrPrefix(),
		},
	}

	DefineCustomGetSigners(&signingOptions)

	interfaceRegistry, _ := types.NewInterfaceRegistryWithOptions(types.InterfaceRegistryOptions{
		ProtoFiles:     proto.HybridResolver,
		SigningOptions: signingOptions,
	})
	appCodec := codec.NewProtoCodec(interfaceRegistry)
	legacyAmino := codec.NewLegacyAmino()

	txConfig, err := txconfig.NewTxConfigWithOptionsWithCustomEncoders(appCodec, authtx.ConfigOptions{
		EnabledSignModes: authtx.DefaultSignModes,
		CustomSignModes:  []signing.SignModeHandler{},
	})
	if err != nil {
		panic(err)
	}

	if err := interfaceRegistry.SigningContext().Validate(); err != nil {
		panic(err)
	}

	std.RegisterLegacyAminoCodec(legacyAmino)
	std.RegisterInterfaces(interfaceRegistry)

	bApp := baseapp.NewBaseApp(appName, logger, db, txConfig.TxDecoder(), baseAppOptions...)
	bApp.SetCommitMultiStoreTracer(traceStore)
	bApp.SetVersion(version.Version)
	bApp.SetInterfaceRegistry(interfaceRegistry)
	bApp.SetTxEncoder(txConfig.TxEncoder())

	keys := storetypes.NewKVStoreKeys(
		authtypes.StoreKey, banktypes.StoreKey, stakingtypes.StoreKey,
		minttypes.StoreKey, distrtypes.StoreKey, slashingtypes.StoreKey,
		govtypes.StoreKey, paramstypes.StoreKey, ibcexported.StoreKey, upgradetypes.StoreKey,
		evidencetypes.StoreKey, ibctransfertypes.StoreKey, packetforwardtypes.StoreKey,
		capabilitytypes.StoreKey, feegrant.StoreKey, authzkeeper.StoreKey, icahosttypes.StoreKey,
		swingset.StoreKey, vstorage.StoreKey, vibc.StoreKey,
		vlocalchain.StoreKey, vtransfer.StoreKey, vbank.StoreKey, consensusparamstypes.StoreKey,
		wasmtypes.StoreKey,
	)
	tkeys := storetypes.NewTransientStoreKeys(paramstypes.TStoreKey, vbanktypes.TStoreKey)
	memKeys := storetypes.NewMemoryStoreKeys(capabilitytypes.MemStoreKey)

	app := &GaiaApp{
		BaseApp:           bApp,
		AgdServer:         agdServer,
		resolvedConfig:    appOpts,
		legacyAmino:       legacyAmino,
		appCodec:          appCodec,
		txConfig:          txConfig,
		interfaceRegistry: interfaceRegistry,
		invCheckPeriod:    invCheckPeriod,
		keys:              keys,
		tkeys:             tkeys,
		memKeys:           memKeys,
	}

	app.ParamsKeeper = initParamsKeeper(
		appCodec,
		legacyAmino,
		keys[paramstypes.StoreKey],
		tkeys[paramstypes.TStoreKey],
	)

	app.ConsensusParamsKeeper = consensusparamskeeper.NewKeeper(
		appCodec,
		runtime.NewKVStoreService(keys[consensusparamstypes.StoreKey]),
		authtypes.NewModuleAddress(govtypes.ModuleName).String(),
		runtime.EventService{},
	)

	// set the BaseApp's parameter store
	bApp.SetParamStore(app.ConsensusParamsKeeper.ParamsStore)

	// add capability keeper and ScopeToModule for ibc module
	app.CapabilityKeeper = capabilitykeeper.NewKeeper(appCodec, keys[capabilitytypes.StoreKey], memKeys[capabilitytypes.MemStoreKey])
	scopedIBCKeeper := app.CapabilityKeeper.ScopeToModule(ibcexported.ModuleName)
	scopedTransferKeeper := app.CapabilityKeeper.ScopeToModule(ibctransfertypes.ModuleName)
	scopedICAHostKeeper := app.CapabilityKeeper.ScopeToModule(icahosttypes.SubModuleName)
	scopedVibcKeeper := app.CapabilityKeeper.ScopeToModule(vibc.ModuleName)
	scopedWasmKeeper := app.CapabilityKeeper.ScopeToModule(wasmtypes.ModuleName)
	app.CapabilityKeeper.Seal()

	// add keepers

	app.AccountKeeper = authkeeper.NewAccountKeeper(
		appCodec,
		runtime.NewKVStoreService(keys[authtypes.StoreKey]),
		authtypes.ProtoBaseAccount,
		maccPerms,
		authcodec.NewBech32Codec(sdk.GetConfig().GetBech32AccountAddrPrefix()),
		sdk.GetConfig().GetBech32AccountAddrPrefix(),
		authtypes.NewModuleAddress(govtypes.ModuleName).String(),
	)

	app.BankKeeper = bankkeeper.NewBaseKeeper(
		appCodec,
		runtime.NewKVStoreService(keys[banktypes.StoreKey]),
		app.AccountKeeper,
		BlockedAddresses(),
		authtypes.NewModuleAddress(govtypes.ModuleName).String(),
		bApp.Logger(),
	)

	app.AuthzKeeper = authzkeeper.NewKeeper(
		runtime.NewKVStoreService(keys[authzkeeper.StoreKey]),
		appCodec,
		app.BaseApp.MsgServiceRouter(),
		app.AccountKeeper,
	)

	app.FeeGrantKeeper = feegrantkeeper.NewKeeper(
		appCodec,
		runtime.NewKVStoreService(keys[feegrant.StoreKey]),
		app.AccountKeeper,
	)
	app.StakingKeeper = stakingkeeper.NewKeeper(
		appCodec,
		runtime.NewKVStoreService(keys[stakingtypes.StoreKey]),
		app.AccountKeeper,
		app.BankKeeper,
		authtypes.NewModuleAddress(govtypes.ModuleName).String(),
		address.NewBech32Codec(sdk.GetConfig().GetBech32ValidatorAddrPrefix()),
		address.NewBech32Codec(sdk.GetConfig().GetBech32ConsensusAddrPrefix()),
	)

	app.MintKeeper = mintkeeper.NewKeeper(
		appCodec,
		runtime.NewKVStoreService(keys[minttypes.StoreKey]),
		app.StakingKeeper,
		app.AccountKeeper,
		app.BankKeeper,
		vbanktypes.GiveawayPoolName,
		authtypes.NewModuleAddress(govtypes.ModuleName).String(),
	)

	distrKeeper := distrkeeper.NewKeeper(
		appCodec,
		runtime.NewKVStoreService(keys[distrtypes.StoreKey]),
		app.AccountKeeper,
		app.BankKeeper,
		app.StakingKeeper,
		// This is the pool to distribute from immediately.  DO NOT ALTER.
		vbanktypes.GiveawayPoolName,
		authtypes.NewModuleAddress(govtypes.ModuleName).String(),
	)

	app.SlashingKeeper = slashingkeeper.NewKeeper(
		appCodec,
		legacyAmino,
		runtime.NewKVStoreService(keys[slashingtypes.StoreKey]),
		app.StakingKeeper,
		authtypes.NewModuleAddress(govtypes.ModuleName).String(),
	)

	// register the staking hooks
	// NOTE: stakingKeeper above is passed by reference, so that it will contain these hooks
	app.StakingKeeper.SetHooks(
		stakingtypes.NewMultiStakingHooks(distrKeeper.Hooks(), app.SlashingKeeper.Hooks()),
	)

	app.UpgradeKeeper = upgradekeeper.NewKeeper(
		skipUpgradeHeights,
		runtime.NewKVStoreService(keys[upgradetypes.StoreKey]),
		appCodec,
		homePath,
		app.BaseApp,
		authtypes.NewModuleAddress(govtypes.ModuleName).String(),
	)

	app.DistrKeeper = *distrKeeper.AddHooks(
		vestingtypes.NewDistributionHooks(app.AccountKeeper, app.BankKeeper, app.StakingKeeper),
	)

	app.IBCKeeper = ibckeeper.NewKeeper(
		appCodec,
		keys[ibcexported.StoreKey],
		app.GetSubspace(ibcexported.ModuleName),
		app.StakingKeeper,
		app.UpgradeKeeper,
		scopedIBCKeeper,
		authtypes.NewModuleAddress(govtypes.ModuleName).String(),
	)

	// This function is tricky to get right, so we build it ourselves.
	callToController := func(ctx sdk.Context, jsonRequest string) (jsonReply string, err error) {
		app.CheckControllerInited(true)
		// We use SwingSet-level metering to charge the user for the call.
		defer app.AgdServer.SetControllerContext(ctx)()
		return sendToController(sdk.WrapSDKContext(ctx), true, jsonRequest)
	}

	setBootstrapNeeded := func() {
		app.bootstrapNeeded = true
	}

	app.VstorageKeeper = vstorage.NewKeeper(
		vstorage.StoreKey,
		runtime.NewKVStoreService(keys[vstorage.StoreKey]),
	)
	app.vstoragePort = app.AgdServer.MustRegisterPortHandler("vstorage", vstorage.NewStorageHandler(app.VstorageKeeper))

	// The SwingSetKeeper is the Keeper from the SwingSet module
	app.SwingSetKeeper = swingset.NewKeeper(
		appCodec, runtime.NewKVStoreService(keys[swingset.StoreKey]),
		app.GetSubspace(swingset.ModuleName),
		app.AccountKeeper, app.BankKeeper,
		app.VstorageKeeper, vbanktypes.ReservePoolName,
		authtypes.NewModuleAddress(govtypes.ModuleName).String(),
		callToController,
	)
	app.swingsetPort = app.AgdServer.MustRegisterPortHandler("swingset", swingset.NewPortHandler(app.SwingSetKeeper))

	app.SwingStoreExportsHandler = *swingsetkeeper.NewSwingStoreExportsHandler(
		app.Logger(),
		func(action vm.Jsonable, mustNotBeInited bool) (string, error) {
			if mustNotBeInited {
				app.CheckControllerInited(false)
			}

			bz, err := json.Marshal(action)
			if err != nil {
				return "", err
			}
			return sendToController(context.Background(), true, string(bz))
		},
	)

	getSwingStoreExportDataShadowCopyReader := func(height int64) agorictypes.KVEntryReader {
		ctx := app.NewUncachedContext(false, tmproto.Header{Height: height})
		exportDataIterator := app.SwingSetKeeper.GetSwingStore(ctx).Iterator(nil, nil)
		if !exportDataIterator.Valid() {
			exportDataIterator.Close()
			return nil
		}
		return agorictypes.NewKVIteratorReader(exportDataIterator)
	}
	app.SwingSetSnapshotter = *swingsetkeeper.NewExtensionSnapshotter(
		bApp,
		&app.SwingStoreExportsHandler,
		getSwingStoreExportDataShadowCopyReader,
	)

	app.VibcKeeper = vibc.NewKeeper(
		appCodec,
		app.IBCKeeper.ChannelKeeper,
		app.IBCKeeper.PortKeeper,
		app.IBCKeeper.ClientKeeper,
	).WithScope(
		runtime.NewKVStoreService(keys[vibc.StoreKey]),
		scopedVibcKeeper,
		app.SwingSetKeeper.PushAction,
	)

	vibcModule := vibc.NewAppModule(app.VibcKeeper, app.BankKeeper)
	vibcIBCModule := vibc.NewIBCModule(app.VibcKeeper)
	app.vibcPort = app.AgdServer.MustRegisterPortHandler("vibc", vibc.NewReceiver(app.VibcKeeper))

	app.VtransferKeeper = vtransferkeeper.NewKeeper(
		appCodec,
		runtime.NewKVStoreService(keys[vtransfer.StoreKey]),
		app.VibcKeeper,
		scopedTransferKeeper,
		app.SwingSetKeeper.PushAction,
	)

	vtransferModule := vtransfer.NewAppModule(app.VtransferKeeper)
	app.vtransferPort = app.AgdServer.MustRegisterPortHandler("vtransfer",
		vibc.NewReceiver(app.VtransferKeeper),
	)

	app.VbankKeeper = vbank.NewKeeper(
		appCodec,
		runtime.NewKVStoreService(keys[vbank.StoreKey]),
		runtime.NewTransientStoreService(tkeys[vbanktypes.TStoreKey]),
		app.GetSubspace(vbank.ModuleName),
		app.AccountKeeper, app.BankKeeper, authtypes.FeeCollectorName,
		app.SwingSetKeeper.PushAction,
	)
	vbankModule := vbank.NewAppModule(app.VbankKeeper)
	app.vbankPort = app.AgdServer.MustRegisterPortHandler("bank", vbank.NewPortHandler(vbankModule, app.VbankKeeper))

	// register the proposal types
	govRouter := govv1beta1.NewRouter()
	govRouter.
		AddRoute(govtypes.RouterKey, govv1beta1.ProposalHandler).
		AddRoute(paramproposal.RouterKey, params.NewParamChangeProposalHandler(app.ParamsKeeper)).
		AddRoute(ibcclienttypes.RouterKey, ibcclient.NewClientProposalHandler(app.IBCKeeper.ClientKeeper)).
		AddRoute(swingsettypes.RouterKey, swingset.NewSwingSetProposalHandler(app.SwingSetKeeper))
	govConfig := govtypes.DefaultConfig()

	app.GovKeeper = govkeeper.NewKeeper(
		appCodec,
		runtime.NewKVStoreService(keys[govtypes.StoreKey]),
		app.AccountKeeper,
		app.BankKeeper,
		app.StakingKeeper,
		app.DistrKeeper,
		app.MsgServiceRouter(),
		govConfig,
		authtypes.NewModuleAddress(govtypes.ModuleName).String(),
	)
	app.GovKeeper.SetLegacyRouter(govRouter)

	governanceHooks := []govtypes.GovHooks{}
	app.GovKeeper = app.GovKeeper.SetHooks(
		// register the governance hooks
		govtypes.NewMultiGovHooks(governanceHooks...),
	)

	// Initialize the packet forward middleware Keeper
	// It's important to note that the PFM Keeper must be initialized before the Transfer Keeper
	app.PacketForwardKeeper = packetforwardkeeper.NewKeeper(
		appCodec,
		keys[packetforwardtypes.StoreKey],
		app.TransferKeeper, // will be zero-value here, reference is set later on with SetTransferKeeper.
		app.IBCKeeper.ChannelKeeper,
		app.BankKeeper,
		// Make vtransfer the middleware wrapper for the IBCKeeper.
		app.VtransferKeeper.GetICS4Wrapper(),
		authtypes.NewModuleAddress(govtypes.ModuleName).String(),
	)

	app.TransferKeeper = ibctransferkeeper.NewKeeper(
		appCodec,
		keys[ibctransfertypes.StoreKey],
		app.GetSubspace(ibctransfertypes.ModuleName),
		app.PacketForwardKeeper, // Wire in the middleware ICS4Wrapper.
		app.IBCKeeper.ChannelKeeper,
		app.IBCKeeper.PortKeeper,
		app.AccountKeeper,
		app.BankKeeper,
		scopedTransferKeeper,
		authtypes.NewModuleAddress(govtypes.ModuleName).String(),
	)

	app.PacketForwardKeeper.SetTransferKeeper(app.TransferKeeper)

	// NewAppModule uses a pointer to the host keeper in case there's a need to
	// tie a circular knot with IBC middleware before icahostkeeper.NewKeeper
	// can be called.
	app.ICAHostKeeper = icahostkeeper.NewKeeper(
		appCodec, keys[icahosttypes.StoreKey],
		app.GetSubspace(icahosttypes.SubModuleName),
		app.IBCKeeper.ChannelKeeper, // This is where middleware binding would happen.
		app.IBCKeeper.ChannelKeeper,
		app.IBCKeeper.PortKeeper,
		app.AccountKeeper,
		scopedICAHostKeeper,
		app.MsgServiceRouter(),
		authtypes.NewModuleAddress(govtypes.ModuleName).String(),
	)
	app.ICAHostKeeper.WithQueryRouter(app.GRPCQueryRouter())

	icaHostIBCModule := icahost.NewIBCModule(app.ICAHostKeeper)
	icaModule := ica.NewAppModule(nil, &app.ICAHostKeeper)

	ics20TransferModule := ibctransfer.NewAppModule(app.TransferKeeper)
	// Create the IBC router, which maps *module names* (not PortIDs) to modules.
	ibcRouter := ibcporttypes.NewRouter()

	// Add an IBC route for the ICA Host.
	ibcRouter.AddRoute(icahosttypes.SubModuleName, icaHostIBCModule)

	// Add an IBC route for vIBC.
	ibcRouter.AddRoute(vibc.ModuleName, vibcIBCModule)

	// Add an IBC route for ICS-20 fungible token transfers, wrapping base
	// Cosmos functionality with middleware (from the inside out, Cosmos
	// packet-forwarding and then our own "vtransfer").
	var ics20TransferIBCModule ibcporttypes.IBCModule = ibctransfer.NewIBCModule(app.TransferKeeper)
	var packetForwardMiddlewareDefaultNumbeOfRetriesOnTimeout uint8 = 0
	ics20TransferIBCModule = packetforward.NewIBCMiddleware(
		ics20TransferIBCModule,
		app.PacketForwardKeeper,
		packetForwardMiddlewareDefaultNumbeOfRetriesOnTimeout,            // retries on timeout
		packetforwardkeeper.DefaultForwardTransferPacketTimeoutTimestamp, // forward timeout
	)
	ics20TransferIBCModule = vtransfer.NewIBCMiddleware(ics20TransferIBCModule, app.VtransferKeeper)
	ibcRouter.AddRoute(ibctransfertypes.ModuleName, ics20TransferIBCModule)

	//Wasm Keeper
	// Use process-specific wasm directory to avoid lock conflicts in CI
	processID := fmt.Sprintf("%d", os.Getpid())
	hostname, err := os.Hostname()
	if err != nil {
		panic(fmt.Sprintf("error while getting hostname: %s", err))
	}
	wasmDir := filepath.Join(os.TempDir(), hostname, "wasm", processID)
	wasmConfig, err := wasm.ReadWasmConfig(appOpts)
	if err != nil {
		panic(fmt.Sprintf("error while reading wasm config: %s", err))
	}

	// The last arguments can contain custom message handlers, and custom query handlers,
	// if we want to allow any custom callbacks

	app.WasmKeeper = wasmkeeper.NewKeeper(
		appCodec,
		runtime.NewKVStoreService(keys[wasmtypes.StoreKey]),
		app.AccountKeeper,
		app.BankKeeper,
		app.StakingKeeper,
		distrkeeper.NewQuerier(app.DistrKeeper),
		app.PacketForwardKeeper, // ISC4 Wrapper: fee IBC middleware
		app.IBCKeeper.ChannelKeeper,
		app.IBCKeeper.PortKeeper,
		scopedWasmKeeper,
		app.TransferKeeper,
		app.MsgServiceRouter(),
		app.GRPCQueryRouter(),
		wasmDir,
		wasmConfig,
		AllCapabilities(),
		authtypes.NewModuleAddress(govtypes.ModuleName).String(),
		wasmOpts...,
	)

	// Create fee enabled wasm ibc Stack
	var wasmStack ibcporttypes.IBCModule
	wasmStack = wasm.NewIBCHandler(app.WasmKeeper, app.IBCKeeper.ChannelKeeper, app.PacketForwardKeeper)
	//wasmStack = ibcfee.NewIBCMiddleware(wasmStack, app.PacketForwardKeeper)

	// Add CosmWasm
	ibcRouter.AddRoute(wasmtypes.ModuleName, wasmStack)

	// Seal the router
	app.IBCKeeper.SetRouter(ibcRouter)
	// The local chain keeper provides ICA/ICQ-like support for the VM to
	// control a fresh account and/or query this Cosmos-SDK instance.
	app.VlocalchainKeeper = vlocalchain.NewKeeper(
		appCodec,
		keys[vlocalchain.StoreKey],
		app.BaseApp.MsgServiceRouter(),
		app.BaseApp.GRPCQueryRouter(),
		app.AccountKeeper,
	)
	app.vlocalchainPort = app.AgdServer.MustRegisterPortHandler(
		"vlocalchain",
		vlocalchain.NewReceiver(app.VlocalchainKeeper),
	)

	// create evidence keeper with router
	evidenceKeeper := evidencekeeper.NewKeeper(
		appCodec,
		runtime.NewKVStoreService(keys[evidencetypes.StoreKey]),
		app.StakingKeeper,
		app.SlashingKeeper,
		app.AccountKeeper.AddressCodec(),
		runtime.ProvideCometInfoService(),
	)
	// If evidence needs to be handled for the app, set routes in router here and seal
	app.EvidenceKeeper = *evidenceKeeper

	swingStoreExportDir := cast.ToString(appOpts.Get(FlagSwingStoreExportDir))
	swingStoreExportMode := cast.ToString(appOpts.Get(FlagSwingStoreExportMode))

	// NOTE: Any module instantiated in the module manager that is later modified
	// must be passed by reference here.
	app.ModuleManager = module.NewManager(
		genutil.NewAppModule(
			app.AccountKeeper,
			app.StakingKeeper,
			app,
			app.txConfig,
		),
		auth.NewAppModule(appCodec, app.AccountKeeper, authsims.RandomGenesisAccounts, app.GetSubspace(authtypes.ModuleName)),
		vesting.NewAppModule(app.AccountKeeper, app.BankKeeper, app.StakingKeeper),
		bank.NewAppModule(appCodec, app.BankKeeper, app.AccountKeeper, app.GetSubspace(banktypes.ModuleName)),
		capability.NewAppModule(appCodec, *app.CapabilityKeeper, false),
		gov.NewAppModule(appCodec, app.GovKeeper, app.AccountKeeper, app.BankKeeper, app.GetSubspace(govtypes.ModuleName)),
		mint.NewAppModule(appCodec, app.MintKeeper, app.AccountKeeper, nil, app.GetSubspace(minttypes.ModuleName)),
		slashing.NewAppModule(appCodec, app.SlashingKeeper, app.AccountKeeper, app.BankKeeper, app.StakingKeeper, app.GetSubspace(slashingtypes.ModuleName), app.interfaceRegistry),
		distr.NewAppModule(appCodec, app.DistrKeeper, app.AccountKeeper, app.BankKeeper, app.StakingKeeper, app.GetSubspace(distrtypes.ModuleName)),
		staking.NewAppModule(appCodec, app.StakingKeeper, app.AccountKeeper, app.BankKeeper, app.GetSubspace(stakingtypes.ModuleName)),
		upgrade.NewAppModule(app.UpgradeKeeper, app.AccountKeeper.AddressCodec()),
		evidence.NewAppModule(app.EvidenceKeeper),
		feegrantmodule.NewAppModule(appCodec, app.AccountKeeper, app.BankKeeper, app.FeeGrantKeeper, app.interfaceRegistry),
		authzmodule.NewAppModule(appCodec, app.AuthzKeeper, app.AccountKeeper, app.BankKeeper, app.interfaceRegistry),
		ibc.NewAppModule(app.IBCKeeper),
		ibctm.NewAppModule(),
		ibcsolo.NewAppModule(),
		wasm.NewAppModule(appCodec, &app.WasmKeeper, app.StakingKeeper, app.AccountKeeper, app.BankKeeper, app.MsgServiceRouter(), app.GetSubspace(wasmtypes.ModuleName)),
		params.NewAppModule(app.ParamsKeeper),
		ics20TransferModule,
		icaModule,
		packetforward.NewAppModule(app.PacketForwardKeeper, app.GetSubspace(packetforwardtypes.ModuleName)),
		vstorage.NewAppModule(app.VstorageKeeper),
		swingset.NewAppModule(
			app.SwingSetKeeper,
			&app.SwingStoreExportsHandler,
			setBootstrapNeeded,
			app.ensureControllerInited,
			swingStoreExportDir,
			swingStoreExportMode,
		),
		vibcModule,
		vbankModule,
		vtransferModule,
	)

	// BasicModuleManager defines the module BasicManager is in charge of setting up basic,
	// non-dependant module elements, such as codec registration and genesis verification.
	// By default it is composed of all the module from the module manager.
	// Additionally, app module basics can be overwritten by passing them as argument.
	app.BasicModuleManager = module.NewBasicManagerFromManager(
		app.ModuleManager,
		map[string]module.AppModuleBasic{
			genutiltypes.ModuleName: genutil.NewAppModuleBasic(genutiltypes.DefaultMessageValidator),
			govtypes.ModuleName: gov.NewAppModuleBasic(
				[]govclient.ProposalHandler{
					paramsclient.ProposalHandler,
					swingsetclient.CoreEvalProposalHandler,
				},
			),
		})
	app.BasicModuleManager.RegisterLegacyAminoCodec(legacyAmino)
	app.BasicModuleManager.RegisterInterfaces(interfaceRegistry)

	// According to the upgrading guide (https://github.com/cosmos/cosmos-sdk/blob/main/UPGRADING.md#set-preblocker),
	//upgrade types need to be added to the pre-blocker. While this part has been implemented, the guide also states
	//that these types should be removed from begin blocker. If we need to actually remove them, we would need to modify
	// the SetOrderBeginBlockers logic. However, it's unclear whether this removal is strictly required or optional.
	app.ModuleManager.SetOrderPreBlockers(upgradetypes.ModuleName)
	app.SetPreBlocker(app.PreBlocker)

	// During begin block slashing happens after distr.BeginBlocker so that
	// there is nothing left over in the validator fee pool, so as to keep the
	// CanWithdrawInvariant invariant.
	// NOTE: staking module is required if HistoricalEntries param > 0
	// NOTE: capability module's beginblocker must come before any modules using capabilities (e.g. IBC)
	app.ModuleManager.SetOrderBeginBlockers(
		// Cosmos-SDK modules appear roughly in the order used by simapp and gaiad.
		capabilitytypes.ModuleName,
		// params influence many other modules, so it should be near the top.
		paramstypes.ModuleName,
		govtypes.ModuleName,
		stakingtypes.ModuleName,
		// ibc apps are grouped together
		ibctransfertypes.ModuleName,
		ibcexported.ModuleName,
		icatypes.ModuleName,
		packetforwardtypes.ModuleName,
		authtypes.ModuleName,
		banktypes.ModuleName,
		distrtypes.ModuleName,
		slashingtypes.ModuleName,
		minttypes.ModuleName,
		genutiltypes.ModuleName,
		evidencetypes.ModuleName,
		authz.ModuleName,
		feegrant.ModuleName,
		vestingtypes.ModuleName,
		vstorage.ModuleName,
		// This will cause the swingset controller to init if it hadn't yet, passing
		// any upgrade plan or bootstrap flag when starting at an upgrade height
		swingset.ModuleName,
		vibc.ModuleName,
		vbank.ModuleName,
		vtransfer.ModuleName,

		wasmtypes.ModuleName,
	)
	app.ModuleManager.SetOrderEndBlockers(
		// Cosmos-SDK modules appear roughly in the order used by simapp and gaiad.
		govtypes.ModuleName,
		stakingtypes.ModuleName,
		// vibc is an Agoric-specific IBC app, so group it here with other IBC apps.
		vibc.ModuleName,
		vtransfer.ModuleName,
		ibctransfertypes.ModuleName,
		ibcexported.ModuleName,
		icatypes.ModuleName,
		packetforwardtypes.ModuleName,
		feegrant.ModuleName,
		authz.ModuleName,
		capabilitytypes.ModuleName,
		authtypes.ModuleName,
		banktypes.ModuleName,
		distrtypes.ModuleName,
		slashingtypes.ModuleName,
		minttypes.ModuleName,
		genutiltypes.ModuleName,
		evidencetypes.ModuleName,
		paramstypes.ModuleName,
		upgradetypes.ModuleName,
		vestingtypes.ModuleName,
		// Putting vbank before SwingSet VM will enable vbank to capture all event
		// history that was produced all the other modules, and push those balance
		// changes on the VM's actionQueue.
		vbank.ModuleName,
		// SwingSet VM needs to be last, for it to capture all the pushed actions.
		swingset.ModuleName,
		// And then vstorage, to produce SwingSet-induced events.
		vstorage.ModuleName,

		wasmtypes.ModuleName,
	)

	// NOTE: The genutils module must occur after staking so that pools are
	// properly initialized with tokens from genesis accounts.
	// NOTE: The genutils module must also occur after auth so that it can access the params from auth.
	// NOTE: Capability module must occur first so that it can initialize any capabilities
	// so that other modules that want to create or claim capabilities afterwards in InitChain
	// can do so safely.

	moduleOrderForGenesisAndUpgrade := []string{
		paramstypes.ModuleName,
		capabilitytypes.ModuleName,
		authtypes.ModuleName,
		banktypes.ModuleName,
		distrtypes.ModuleName,
		stakingtypes.ModuleName,
		slashingtypes.ModuleName,
		govtypes.ModuleName,
		minttypes.ModuleName,
		ibctransfertypes.ModuleName,
		packetforwardtypes.ModuleName,
		ibcexported.ModuleName,
		ibcsolo.ModuleName,
		ibctm.ModuleName,
		icatypes.ModuleName,
		evidencetypes.ModuleName,
		feegrant.ModuleName,
		authz.ModuleName,
		genutiltypes.ModuleName,
		upgradetypes.ModuleName,
		vestingtypes.ModuleName,
		// Agoric-specific modules go last since they may rely on other SDK modules.
		vstorage.ModuleName,
		vbank.ModuleName,
		vibc.ModuleName,
		vtransfer.ModuleName,
		swingset.ModuleName,

		// wasm after ibc transfer
		wasmtypes.ModuleName,
	}

	app.ModuleManager.SetOrderInitGenesis(moduleOrderForGenesisAndUpgrade...)
	app.ModuleManager.SetOrderMigrations(moduleOrderForGenesisAndUpgrade...)

	app.configurator = module.NewConfigurator(app.appCodec, app.MsgServiceRouter(), app.GRPCQueryRouter())
	app.ModuleManager.RegisterServices(app.configurator)

	autocliv1.RegisterQueryServer(app.GRPCQueryRouter(), runtimeservices.NewAutoCLIQueryService(app.ModuleManager.Modules))

	reflectionSvc, err := runtimeservices.NewReflectionService()
	if err != nil {
		panic(err)
	}
	reflectionv1.RegisterReflectionServiceServer(app.GRPCQueryRouter(), reflectionSvc)

	// create the simulation manager and define the order of the modules for deterministic simulations
	//
	// NOTE: this is not required apps that don't use the simulator for fuzz testing
	// transactions
	overrideModules := map[string]module.AppModuleSimulation{
		authtypes.ModuleName: auth.NewAppModule(appCodec, app.AccountKeeper, authsims.RandomGenesisAccounts, app.GetSubspace(authtypes.ModuleName)),
	}
	app.sm = module.NewSimulationManagerFromAppModules(app.ModuleManager.Modules, overrideModules)

	app.sm.RegisterStoreDecoders()

	// initialize stores
	app.MountKVStores(keys)
	app.MountTransientStores(tkeys)
	app.MountMemoryStores(memKeys)

	anteHandler, err := appante.NewAnteHandler(
		appante.HandlerOptions{
			HandlerOptions: ante.HandlerOptions{
				AccountKeeper:   app.AccountKeeper,
				BankKeeper:      app.BankKeeper,
				FeegrantKeeper:  app.FeeGrantKeeper,
				SignModeHandler: app.txConfig.SignModeHandler(),
				SigGasConsumer:  ante.DefaultSigVerificationGasConsumer,
			},
			IBCKeeper:         app.IBCKeeper,
			AdmissionData:     app.SwingSetKeeper,
			FeeCollectorName:  vbanktypes.ReservePoolName,
			SwingsetKeeper:    app.SwingSetKeeper,
			WasmConfig:        &wasmConfig,
			TXCounterStoreKey: keys[wasmtypes.StoreKey],
			WasmKeeper:        &app.WasmKeeper,
		},
	)
	if err != nil {
		panic(fmt.Errorf("failed to create AnteHandler: %s", err))
	}

	app.SetAnteHandler(anteHandler)
	app.SetInitChainer(app.InitChainer)
	app.SetBeginBlocker(app.BeginBlocker)
	app.SetEndBlocker(app.EndBlocker)

	app.RegisterUpgradeHandlers()

	// At this point we don't have a way to read from the store, so we have to
	// rely on data saved by the x/upgrade module in the previous software.
	upgradeInfo, err := app.UpgradeKeeper.ReadUpgradeInfoFromDisk()
	if err != nil {
		panic(err)
	}
	// Store migrations can only run once, so we use a notion of "primary upgrade
	// name" to trigger them. Testnets may end up upgrading from one rc to
	// another, which shouldn't re-run store upgrades.
	if isPrimaryUpgradeName(upgradeInfo.Name) && !app.UpgradeKeeper.IsSkipHeight(upgradeInfo.Height) {
		storeUpgrades := storetypes.StoreUpgrades{
			Added: []string{
				capabilitytypes.MemStoreKey,
				consensusparamstypes.StoreKey,
				wasmtypes.ModuleName,
			},
			Deleted: []string{},
		}

		// configure store loader that checks if version == upgradeHeight and applies store upgrades
		app.SetStoreLoader(upgradetypes.UpgradeStoreLoader(upgradeInfo.Height, &storeUpgrades))
	}

	if loadLatest {
		if err := app.LoadLatestVersion(); err != nil {
			tmos.Exit(fmt.Sprintf("failed to load latest version: %s", err))
		}
		ctx := app.BaseApp.NewUncachedContext(true, tmproto.Header{})

		// Initialize pinned codes in wasmvm as they are not persisted there
		if err := app.WasmKeeper.InitializePinnedCodes(ctx); err != nil {
			tmos.Exit(fmt.Sprintf("failed to initialize x/wasm pinned codes %s", err))
		}
	}

	app.ScopedIBCKeeper = scopedIBCKeeper
	app.ScopedVibcKeeper = scopedVibcKeeper
	app.ScopedTransferKeeper = scopedTransferKeeper
	app.ScopedICAHostKeeper = scopedICAHostKeeper
	app.ScopedWasmKeeper = scopedWasmKeeper
	snapshotManager := app.SnapshotManager()
	if snapshotManager != nil {
		if err = snapshotManager.RegisterExtensions(
			&app.SwingSetSnapshotter,
			wasmkeeper.NewWasmSnapshotter(app.CommitMultiStore(), &app.WasmKeeper),
		); err != nil {
			panic(fmt.Errorf("failed to register snapshot extension: %s", err))
		}
	}

	return app
}

// DropWasmPrivilegeParams returns new x/wasm params that enforce the use of
// "nobody" or address allowlists.  Governance authority is preserved.
func DropWasmPrivilegeParams(wparams wasmtypes.Params) wasmtypes.Params {
	switch wparams.CodeUploadAccess.Permission {
	case wasmtypes.AccessTypeNobody, wasmtypes.AccessTypeAnyOfAddresses:
		// Code upload is already sufficiently locked down, nothing more to do.

	default:
		// Override the unrecognized access type with a "nobody" permission.
		wparams.CodeUploadAccess = wasmtypes.AllowNobody
	}

	// Forcefully change the instantiation default to "nobody".
	wparams.InstantiateDefaultPermission = wasmtypes.AccessTypeNobody
	return wparams
}

// normalizeModuleAccount ensures that the given account is a module account,
// initializing or updating it if necessary. The account name must be listed in maccPerms.
func normalizeModuleAccount(ctx sdk.Context, ak authkeeper.AccountKeeper, name string) {
	ma := ak.GetModuleAccount(ctx, name)
	if ma != nil {
		// Properly modular.
		return
	}
	shadow := ak.GetAccount(ctx, authtypes.NewModuleAddress(name))
	if shadow == nil {
		panic(fmt.Errorf("module account %s shadow not found in account store", name))
	}

	perms := maccPerms[name]
	base := authtypes.NewBaseAccount(shadow.GetAddress(), shadow.GetPubKey(), shadow.GetAccountNumber(), shadow.GetSequence())
	ma = authtypes.NewModuleAccount(base, name, perms...)
	ak.SetModuleAccount(ctx, ma)
}

type upgradeDetails struct {
	Plan          upgradetypes.Plan `json:"plan"`
	CoreProposals *vm.CoreProposals `json:"coreProposals,omitempty"`
}

type cosmosInitAction struct {
	vm.ActionHeader `actionType:"AG_COSMOS_INIT"`
	ChainID         string                   `json:"chainID"`
	IsBootstrap     bool                     `json:"isBootstrap"`
	Params          swingset.Params          `json:"params"`
	ResolvedConfig  *swingset.SwingsetConfig `json:"resolvedConfig"`
	SupplyCoins     sdk.Coins                `json:"supplyCoins"`
	UpgradeDetails  *upgradeDetails          `json:"upgradeDetails,omitempty"`
	// CAVEAT: Every property ending in "Port" is saved in chain-main.js/portNums
	// with a key consisting of this name with the "Port" stripped.
	StoragePort     int `json:"storagePort"`
	SwingsetPort    int `json:"swingsetPort"`
	VbankPort       int `json:"vbankPort"`
	VibcPort        int `json:"vibcPort"`
	VlocalchainPort int `json:"vlocalchainPort"`
	VtransferPort   int `json:"vtransferPort"`
}

// Name returns the name of the App
func (app *GaiaApp) Name() string { return app.BaseApp.Name() }

// PreBlocker application updates before each begin block.
func (app *GaiaApp) PreBlocker(ctx sdk.Context, _ *abci.RequestFinalizeBlock) (*sdk.ResponsePreBlock, error) {
	// Set gas meter to the free gas meter.
	// This is because there is currently non-deterministic gas usage in the
	// pre-blocker, e.g. due to hydration of in-memory data structures.
	//
	// Note that we don't need to reset the gas meter after the pre-blocker
	// because Go is pass by value.
	ctx = ctx.WithGasMeter(storetypes.NewInfiniteGasMeter())
	return app.ModuleManager.PreBlock(ctx)
}

// CheckControllerInited exits if the controller initialization state does not match `expected`.
func (app *GaiaApp) CheckControllerInited(expected bool) {
	if app.controllerInited != expected {
		fmt.Fprintf(os.Stderr, "controllerInited != %t\n", expected)
		debug.PrintStack()
		os.Exit(1)
	}
}

// initController sends the initialization message to the VM.
// Exits if the controller has already been initialized.
// The init message will contain any upgrade plan if we're starting after an
// upgrade, and a flag indicating whether this is a bootstrap of the controller.
func (app *GaiaApp) initController(ctx sdk.Context, bootstrap bool) {
	app.CheckControllerInited(false)
	app.controllerInited = true

	// Begin initializing the controller here.
	swingsetConfig, err := swingset.SwingsetConfigFromViper(app.resolvedConfig)
	if err != nil {
		panic(err)
	}
	action := &cosmosInitAction{
		ChainID:        ctx.ChainID(),
		IsBootstrap:    bootstrap,
		Params:         app.SwingSetKeeper.GetParams(ctx),
		ResolvedConfig: swingsetConfig,
		SupplyCoins:    sdk.NewCoins(app.BankKeeper.GetSupply(ctx, "uist")),
		UpgradeDetails: app.upgradeDetails,
		// See CAVEAT in cosmosInitAction.
		StoragePort:     app.vstoragePort,
		SwingsetPort:    app.swingsetPort,
		VbankPort:       app.vbankPort,
		VibcPort:        app.vibcPort,
		VlocalchainPort: app.vlocalchainPort,
		VtransferPort:   app.vtransferPort,
	}
	// This uses `BlockingSend` as a friendly wrapper for `sendToController`
	//
	// CAVEAT: we are restarting after an in-consensus halt or just because this
	// node felt like it.  The controller must be able to handle either case
	// (inConsensus := action.IsBootstrap || action.UpgradeDetails != nil).
	out, err := app.SwingSetKeeper.BlockingSend(ctx, action)

	// fmt.Fprintf(os.Stderr, "AG_COSMOS_INIT Returned from SwingSet: %s, %v\n", out, err)

	if err != nil {
		panic(sdkioerrors.Wrap(err, "cannot initialize Controller"))
	}
	var res bool
	err = json.Unmarshal([]byte(out), &res)
	if err != nil {
		panic(sdkioerrors.Wrapf(err, "cannot unmarshal Controller init response: %s", out))
	}
	if !res {
		panic(fmt.Errorf("controller negative init response"))
	}
}

// ensureControllerInited inits the controller if needed. It's used by the
// x/swingset module's BeginBlock to lazily start the JS controller.
// We cannot init early as we don't know when starting the software if this
// might be a simple restart, or a chain init from genesis or upgrade which
// require the controller to not be inited yet.
func (app *GaiaApp) ensureControllerInited(ctx sdk.Context) {
	if app.controllerInited {
		return
	}

	// While we don't expect it anymore, some upgrade may want to throw away
	// the current JS state and bootstrap again (bulldozer). In that case the
	// upgrade handler can just set the bootstrapNeeded flag.
	app.initController(ctx, app.bootstrapNeeded)
}

// BeginBlocker application updates every begin block
func (app *GaiaApp) BeginBlocker(ctx sdk.Context) (sdk.BeginBlock, error) {
	return app.ModuleManager.BeginBlock(ctx)
}

// EndBlocker application updates every end block
func (app *GaiaApp) EndBlocker(ctx sdk.Context) (sdk.EndBlock, error) {
	return app.ModuleManager.EndBlock(ctx)
}

// InitChainer application update at chain initialization
func (app *GaiaApp) InitChainer(ctx sdk.Context, req *abci.RequestInitChain) (*abci.ResponseInitChain, error) {
	var genesisState GenesisState
	if err := tmjson.Unmarshal(req.AppStateBytes, &genesisState); err != nil {
		return nil, err
	}

	app.UpgradeKeeper.SetModuleVersionMap(ctx, app.ModuleManager.GetVersionMap())
	res, err := app.ModuleManager.InitGenesis(ctx, app.appCodec, genesisState)
	if err != nil {
		return nil, err
	}

	// initialize the provision and reserve module accounts, to avoid their implicit creation
	// as a default account upon receiving a transfer. See BlockedAddresses().
	normalizeModuleAccount(ctx, app.AccountKeeper, vbanktypes.ProvisionPoolName)
	normalizeModuleAccount(ctx, app.AccountKeeper, vbanktypes.ReservePoolName)

	wparams := DropWasmPrivilegeParams(app.WasmKeeper.GetParams(ctx))
	if err := app.WasmKeeper.SetParams(ctx, wparams); err != nil {
		panic(err)
	}

	// Init early (before first BeginBlock) to run the potentially lengthy bootstrap
	if app.bootstrapNeeded {
		app.initController(ctx, true)
	}

	// Agoric: report the genesis time explicitly.
	genTime := req.GetTime()
	if genTime.After(time.Now()) {
		d := time.Until(genTime)
		stdlog.Printf("Genesis time %s is in %s\n", genTime, d)
	}

	return res, nil
}

// Commit tells the controller that the block is commited
func (app *GaiaApp) Commit() (*abci.ResponseCommit, error) {
	err := swingsetkeeper.WaitUntilSwingStoreExportStarted()

	if err != nil {
		app.Logger().Error("swing-store export failed to start", "err", err)
		return nil, err
	}

	// Frontrun the BaseApp's Commit method
	err = swingset.CommitBlock(app.SwingSetKeeper)
	if err != nil {
		return nil, err
	}

	res, snapshotHeight, err := app.BaseApp.CommitWithoutSnapshot()

	err = swingset.AfterCommitBlock(app.SwingSetKeeper)
	if err != nil {
		return nil, err
	}

	if snapshotHeight > 0 {
		err = app.SwingSetSnapshotter.InitiateSnapshot(snapshotHeight)

		if err != nil {
			app.Logger().Error("failed to initiate swingset snapshot", "err", err)
			return nil, err
		}
	}

	return res, nil
}

// LoadHeight loads a particular height
func (app *GaiaApp) LoadHeight(height int64) error {
	return app.LoadVersion(height)
}

// ModuleAccountAddrs returns all the app's module account addresses.
func (app *GaiaApp) ModuleAccountAddrs() map[string]bool {
	modAccAddrs := make(map[string]bool)
	for acc := range maccPerms {
		modAccAddrs[authtypes.NewModuleAddress(acc).String()] = true
	}

	return modAccAddrs
}

// BlockedAddresses returns the app's module account addresses that
// are blocked from receiving funds.
func BlockedAddresses() map[string]bool {
	modAccAddrs := make(map[string]bool)
	for acc := range maccPerms {
		// The provision and reserve pools are not blocked from receiving funds.
		// NOTE: because of this, these pools must be explicitly
		// initialized as module accounts during bootstrap to avoid
		// implicit creation as a default account when funds are received.
		switch acc {
		case vbanktypes.ProvisionPoolName, vbanktypes.ReservePoolName:
			continue
		}
		modAccAddrs[authtypes.NewModuleAddress(acc).String()] = true
	}

	return modAccAddrs
}

// LegacyAmino returns GaiaApp's amino codec.
//
// NOTE: This is solely to be used for testing purposes as it may be desirable
// for modules to register their own custom testing types.
func (app *GaiaApp) LegacyAmino() *codec.LegacyAmino {
	return app.legacyAmino
}

// AppCodec returns Gaia's app codec.
//
// NOTE: This is solely to be used for testing purposes as it may be desirable
// for modules to register their own custom testing types.
func (app *GaiaApp) AppCodec() codec.Codec {
	return app.appCodec
}

// InterfaceRegistry returns Gaia's InterfaceRegistry
func (app *GaiaApp) InterfaceRegistry() types.InterfaceRegistry {
	return app.interfaceRegistry
}

// GetKey returns the KVStoreKey for the provided store key.
//
// NOTE: This is solely to be used for testing purposes.
func (app *GaiaApp) GetKey(storeKey string) *storetypes.KVStoreKey {
	return app.keys[storeKey]
}

// GetTKey returns the TransientStoreKey for the provided store key.
//
// NOTE: This is solely to be used for testing purposes.
func (app *GaiaApp) GetTKey(storeKey string) *storetypes.TransientStoreKey {
	return app.tkeys[storeKey]
}

// GetMemKey returns the MemStoreKey for the provided mem key.
//
// NOTE: This is solely used for testing purposes.
func (app *GaiaApp) GetMemKey(storeKey string) *storetypes.MemoryStoreKey {
	return app.memKeys[storeKey]
}

func DefineCustomGetSigners(signingOptions *signing.Options) {
	swingsettypes.DefineCustomGetSigners(signingOptions)
	vibctypes.DefineCustomGetSigners(signingOptions)
}

// GetSubspace returns a param subspace for a given module name.
//
// NOTE: This is solely to be used for testing purposes.
func (app *GaiaApp) GetSubspace(moduleName string) paramstypes.Subspace {
	subspace, _ := app.ParamsKeeper.GetSubspace(moduleName)
	return subspace
}

// SimulationManager implements the SimulationApp interface
func (app *GaiaApp) SimulationManager() *module.SimulationManager {
	return app.sm
}

// RegisterAPIRoutes registers all application module routes with the provided
// API server.
func (app *GaiaApp) RegisterAPIRoutes(apiSvr *api.Server, apiConfig config.APIConfig) {
	clientCtx := apiSvr.ClientCtx
	// Register new tx routes from grpc-gateway.
	authtx.RegisterGRPCGatewayRoutes(clientCtx, apiSvr.GRPCGatewayRouter)

	// Register new tendermint queries routes from grpc-gateway.
	cmtservice.RegisterGRPCGatewayRoutes(clientCtx, apiSvr.GRPCGatewayRouter)

	// Register node gRPC service for grpc-gateway.
	nodeservice.RegisterGRPCGatewayRoutes(clientCtx, apiSvr.GRPCGatewayRouter)

	// Register grpc-gateway routes for all modules.
	app.BasicModuleManager.RegisterGRPCGatewayRoutes(clientCtx, apiSvr.GRPCGatewayRouter)

	// register swagger API from root so that other applications can override easily
	// XXX figure out how to build the docs to make them available from the _ import above
	if false && apiConfig.Swagger {
		RegisterSwaggerAPI(apiSvr.Router)
	}
}

// RegisterTxService implements the Application.RegisterTxService method.
func (app *GaiaApp) RegisterTxService(clientCtx client.Context) {
	authtx.RegisterTxService(app.BaseApp.GRPCQueryRouter(), clientCtx, app.BaseApp.Simulate, app.interfaceRegistry)
}

// RegisterTendermintService implements the Application.RegisterTendermintService method.
func (app *GaiaApp) RegisterTendermintService(clientCtx client.Context) {
	cmtservice.RegisterTendermintService(clientCtx, app.BaseApp.GRPCQueryRouter(), app.interfaceRegistry, app.Query)
}

// RegisterSwaggerAPI registers swagger route with API Server
func RegisterSwaggerAPI(rtr *mux.Router) {
	statikFS, err := fs.New()
	if err != nil {
		panic(err)
	}

	staticServer := http.FileServer(statikFS)
	rtr.PathPrefix("/swagger/").Handler(http.StripPrefix("/swagger/", staticServer))
}

// GetMaccPerms returns a copy of the module account permissions
func GetMaccPerms() map[string][]string {
	dupMaccPerms := make(map[string][]string)
	for k, v := range maccPerms {
		dupMaccPerms[k] = v
	}
	return dupMaccPerms
}

// initParamsKeeper init params keeper and its subspaces
func initParamsKeeper(appCodec codec.BinaryCodec, legacyAmino *codec.LegacyAmino, key, tkey storetypes.StoreKey) paramskeeper.Keeper {
	paramsKeeper := paramskeeper.NewKeeper(appCodec, legacyAmino, key, tkey)

	// Subspaces can be removed after upgrade of params.
	paramsKeeper.Subspace(ibcexported.ModuleName)
	paramsKeeper.Subspace(icahosttypes.SubModuleName)
	paramsKeeper.Subspace(ibctransfertypes.ModuleName)
	paramsKeeper.Subspace(swingset.ModuleName)
	paramsKeeper.Subspace(vbank.ModuleName)
	paramsKeeper.Subspace(wasmtypes.ModuleName)

	return paramsKeeper
}

// TestingApp functions

// GetBaseApp implements the TestingApp interface.
func (app *GaiaApp) GetBaseApp() *baseapp.BaseApp {
	return app.BaseApp
}

// GetStakingKeeper implements the TestingApp interface.
func (app *GaiaApp) GetStakingKeeper() testtypes.StakingKeeper {
	return app.StakingKeeper
}

// GetIBCKeeper implements the TestingApp interface.
func (app *GaiaApp) GetIBCKeeper() *ibckeeper.Keeper {
	return app.IBCKeeper
}

// GetScopedIBCKeeper implements the TestingApp interface.
func (app *GaiaApp) GetScopedIBCKeeper() capabilitykeeper.ScopedKeeper {
	return app.ScopedIBCKeeper
}

// GetTxConfig implements the TestingApp interface.
func (app *GaiaApp) GetTxConfig() client.TxConfig {
	return app.txConfig
}

func (app *GaiaApp) AutoCliOpts() autocli.AppOptions {
	modules := make(map[string]appmodule.AppModule, 0)
	for _, m := range app.ModuleManager.Modules {
		if moduleWithName, ok := m.(module.HasName); ok {
			moduleName := moduleWithName.Name()
			if appModule, ok := moduleWithName.(appmodule.AppModule); ok {
				modules[moduleName] = appModule
			}
		}
	}

	return autocli.AppOptions{
		Modules:               modules,
		ModuleOptions:         runtimeservices.ExtractAutoCLIOptions(app.ModuleManager.Modules),
		AddressCodec:          authcodec.NewBech32Codec(sdk.GetConfig().GetBech32AccountAddrPrefix()),
		ValidatorAddressCodec: authcodec.NewBech32Codec(sdk.GetConfig().GetBech32ValidatorAddrPrefix()),
		ConsensusAddressCodec: authcodec.NewBech32Codec(sdk.GetConfig().GetBech32ConsensusAddrPrefix()),
	}
}

// For testing purposes
func (app *GaiaApp) SetSwingStoreExportDir(dir string) {
	module := app.ModuleManager.Modules[swingset.ModuleName].(swingset.AppModule)
	module.SetSwingStoreExportDir(dir)
}

// RegisterNodeService implements the Application.RegisterNodeService method.
func (app *GaiaApp) RegisterNodeService(clientCtx client.Context, cfg config.Config) {
	nodeservice.RegisterNodeService(clientCtx, app.GRPCQueryRouter(), cfg)
}
