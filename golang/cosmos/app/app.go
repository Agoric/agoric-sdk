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

	sdkioerrors "cosmossdk.io/errors"
	"github.com/cosmos/cosmos-sdk/baseapp"
	"github.com/cosmos/cosmos-sdk/client"
	nodeservice "github.com/cosmos/cosmos-sdk/client/grpc/node"
	"github.com/cosmos/cosmos-sdk/client/grpc/tmservice"
	"github.com/cosmos/cosmos-sdk/codec"
	"github.com/cosmos/cosmos-sdk/codec/types"
	"github.com/cosmos/cosmos-sdk/server/api"
	"github.com/cosmos/cosmos-sdk/server/config"
	servertypes "github.com/cosmos/cosmos-sdk/server/types"
	"github.com/cosmos/cosmos-sdk/simapp"
	storetypes "github.com/cosmos/cosmos-sdk/store/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/module"
	"github.com/cosmos/cosmos-sdk/version"
	"github.com/cosmos/cosmos-sdk/x/auth"
	"github.com/cosmos/cosmos-sdk/x/auth/ante"
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
	"github.com/cosmos/cosmos-sdk/x/capability"
	capabilitykeeper "github.com/cosmos/cosmos-sdk/x/capability/keeper"
	capabilitytypes "github.com/cosmos/cosmos-sdk/x/capability/types"
	crisistypes "github.com/cosmos/cosmos-sdk/x/crisis/types"
	distr "github.com/cosmos/cosmos-sdk/x/distribution"
	distrclient "github.com/cosmos/cosmos-sdk/x/distribution/client"
	distrkeeper "github.com/cosmos/cosmos-sdk/x/distribution/keeper"
	distrtypes "github.com/cosmos/cosmos-sdk/x/distribution/types"
	"github.com/cosmos/cosmos-sdk/x/evidence"
	evidencekeeper "github.com/cosmos/cosmos-sdk/x/evidence/keeper"
	evidencetypes "github.com/cosmos/cosmos-sdk/x/evidence/types"
	"github.com/cosmos/cosmos-sdk/x/feegrant"
	feegrantkeeper "github.com/cosmos/cosmos-sdk/x/feegrant/keeper"
	feegrantmodule "github.com/cosmos/cosmos-sdk/x/feegrant/module"
	"github.com/cosmos/cosmos-sdk/x/genutil"
	genutiltypes "github.com/cosmos/cosmos-sdk/x/genutil/types"
	"github.com/cosmos/cosmos-sdk/x/gov"
	govclient "github.com/cosmos/cosmos-sdk/x/gov/client"
	govkeeper "github.com/cosmos/cosmos-sdk/x/gov/keeper"
	govtypes "github.com/cosmos/cosmos-sdk/x/gov/types"
	govtypesv1 "github.com/cosmos/cosmos-sdk/x/gov/types/v1"
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
	"github.com/cosmos/cosmos-sdk/x/upgrade"
	upgradeclient "github.com/cosmos/cosmos-sdk/x/upgrade/client"
	upgradekeeper "github.com/cosmos/cosmos-sdk/x/upgrade/keeper"
	upgradetypes "github.com/cosmos/cosmos-sdk/x/upgrade/types"
	ica "github.com/cosmos/ibc-go/v6/modules/apps/27-interchain-accounts"

	icahost "github.com/cosmos/ibc-go/v6/modules/apps/27-interchain-accounts/host"
	icahostkeeper "github.com/cosmos/ibc-go/v6/modules/apps/27-interchain-accounts/host/keeper"
	icahosttypes "github.com/cosmos/ibc-go/v6/modules/apps/27-interchain-accounts/host/types"
	icatypes "github.com/cosmos/ibc-go/v6/modules/apps/27-interchain-accounts/types"
	"github.com/cosmos/ibc-go/v6/modules/apps/transfer"
	ibctransferkeeper "github.com/cosmos/ibc-go/v6/modules/apps/transfer/keeper"
	ibctransfertypes "github.com/cosmos/ibc-go/v6/modules/apps/transfer/types"
	ibc "github.com/cosmos/ibc-go/v6/modules/core"
	ibcclient "github.com/cosmos/ibc-go/v6/modules/core/02-client"
	ibcclientclient "github.com/cosmos/ibc-go/v6/modules/core/02-client/client"
	ibcclienttypes "github.com/cosmos/ibc-go/v6/modules/core/02-client/types"
	porttypes "github.com/cosmos/ibc-go/v6/modules/core/05-port/types"
	ibchost "github.com/cosmos/ibc-go/v6/modules/core/24-host"
	ibckeeper "github.com/cosmos/ibc-go/v6/modules/core/keeper"
	"github.com/gorilla/mux"
	"github.com/rakyll/statik/fs"
	"github.com/spf13/cast"
	abci "github.com/tendermint/tendermint/abci/types"
	tmjson "github.com/tendermint/tendermint/libs/json"
	"github.com/tendermint/tendermint/libs/log"
	tmos "github.com/tendermint/tendermint/libs/os"
	tmproto "github.com/tendermint/tendermint/proto/tendermint/types"
	dbm "github.com/tendermint/tm-db"

	gaiaappparams "github.com/Agoric/agoric-sdk/golang/cosmos/app/params"

	appante "github.com/Agoric/agoric-sdk/golang/cosmos/ante"
	agorictypes "github.com/Agoric/agoric-sdk/golang/cosmos/types"
	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset"
	swingsetclient "github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/client"
	swingsetkeeper "github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/keeper"
	swingsettypes "github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vbank"
	vbanktypes "github.com/Agoric/agoric-sdk/golang/cosmos/x/vbank/types"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vibc"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vlocalchain"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vstorage"

	// Import the packet forward middleware
	packetforward "github.com/cosmos/ibc-apps/middleware/packet-forward-middleware/v6/packetforward"
	packetforwardkeeper "github.com/cosmos/ibc-apps/middleware/packet-forward-middleware/v6/packetforward/keeper"
	packetforwardtypes "github.com/cosmos/ibc-apps/middleware/packet-forward-middleware/v6/packetforward/types"

	// unnamed import of statik for swagger UI support
	_ "github.com/cosmos/cosmos-sdk/client/docs/statik"
)

const appName = "agoric"

// FlagSwingStoreExportDir defines the config flag used to specify where a
// genesis swing-store export is expected. For start from genesis, the default
// value is config/swing-store in the home directory. For genesis export, the
// value is always a "swing-store" directory sibling to the exported
// genesis.json file.
// TODO: document this flag in config, likely alongside the genesis path
const FlagSwingStoreExportDir = "swing-store-export-dir"

var (
	// DefaultNodeHome default home directories for the application daemon
	DefaultNodeHome string

	// ModuleBasics defines the module BasicManager is in charge of setting up basic,
	// non-dependant module elements, such as codec registration
	// and genesis verification.
	ModuleBasics = module.NewBasicManager(
		auth.AppModuleBasic{},
		genutil.AppModuleBasic{},
		bank.AppModuleBasic{},
		capability.AppModuleBasic{},
		staking.AppModuleBasic{},
		mint.AppModuleBasic{},
		distr.AppModuleBasic{},
		gov.NewAppModuleBasic([]govclient.ProposalHandler{
			paramsclient.ProposalHandler,
			distrclient.ProposalHandler,
			upgradeclient.LegacyProposalHandler,
			upgradeclient.LegacyCancelProposalHandler,
			ibcclientclient.UpdateClientProposalHandler,
			ibcclientclient.UpgradeProposalHandler,
			swingsetclient.CoreEvalProposalHandler,
		}),
		params.AppModuleBasic{},
		slashing.AppModuleBasic{},
		feegrantmodule.AppModuleBasic{},
		authzmodule.AppModuleBasic{},
		ibc.AppModuleBasic{},
		upgrade.AppModuleBasic{},
		evidence.AppModuleBasic{},
		transfer.AppModuleBasic{},
		vesting.AppModuleBasic{},
		ica.AppModuleBasic{},
		packetforward.AppModuleBasic{},
		swingset.AppModuleBasic{},
		vstorage.AppModuleBasic{},
		vibc.AppModuleBasic{},
		vbank.AppModuleBasic{},
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
	}
)

var (
	_ simapp.App              = (*GaiaApp)(nil)
	_ servertypes.Application = (*GaiaApp)(nil)
)

// GaiaApp extends an ABCI application, but with most of its parameters exported.
// They are exported for convenience in creating helper functions, as object
// capabilities aren't needed for testing.
type GaiaApp struct { // nolint: golint
	*baseapp.BaseApp
	legacyAmino       *codec.LegacyAmino
	appCodec          codec.Codec
	interfaceRegistry types.InterfaceRegistry

	controllerInited bool
	bootstrapNeeded  bool
	swingsetPort     int
	vbankPort        int
	vibcPort         int
	vstoragePort     int
	vlocalchainPort  int

	upgradeDetails *upgradeDetails

	invCheckPeriod uint

	// keys to access the substores
	keys    map[string]*storetypes.KVStoreKey
	tkeys   map[string]*storetypes.TransientStoreKey
	memKeys map[string]*storetypes.MemoryStoreKey

	// manage communication from the VM to the ABCI app
	AgdServer *vm.AgdServer

	// keepers
	AccountKeeper    authkeeper.AccountKeeper
	BankKeeper       bankkeeper.Keeper
	CapabilityKeeper *capabilitykeeper.Keeper
	StakingKeeper    stakingkeeper.Keeper
	SlashingKeeper   slashingkeeper.Keeper
	MintKeeper       mintkeeper.Keeper
	DistrKeeper      distrkeeper.Keeper
	GovKeeper        govkeeper.Keeper
	UpgradeKeeper    upgradekeeper.Keeper
	ParamsKeeper     paramskeeper.Keeper
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

	// make scoped keepers public for test purposes
	ScopedIBCKeeper      capabilitykeeper.ScopedKeeper
	ScopedTransferKeeper capabilitykeeper.ScopedKeeper
	ScopedICAHostKeeper  capabilitykeeper.ScopedKeeper
	ScopedVibcKeeper     capabilitykeeper.ScopedKeeper

	// the module manager
	mm *module.Manager

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

// NewGaiaApp returns a reference to an initialized Gaia.
func NewGaiaApp(
	logger log.Logger,
	db dbm.DB, traceStore io.Writer,
	loadLatest bool,
	skipUpgradeHeights map[int64]bool,
	homePath string,
	invCheckPeriod uint,
	encodingConfig gaiaappparams.EncodingConfig,
	appOpts servertypes.AppOptions,
	baseAppOptions ...func(*baseapp.BaseApp),
) *GaiaApp {
	defaultController := func(ctx context.Context, needReply bool, str string) (string, error) {
		fmt.Fprintln(os.Stderr, "FIXME: Would upcall to controller with", str)
		return "", nil
	}
	return NewAgoricApp(
		defaultController, vm.NewAgdServer(),
		logger, db, traceStore, loadLatest, skipUpgradeHeights,
		homePath, invCheckPeriod, encodingConfig, appOpts, baseAppOptions...,
	)
}

func NewAgoricApp(
	sendToController func(context.Context, bool, string) (string, error), agdServer *vm.AgdServer,
	logger log.Logger, db dbm.DB, traceStore io.Writer, loadLatest bool, skipUpgradeHeights map[int64]bool,
	homePath string, invCheckPeriod uint, encodingConfig gaiaappparams.EncodingConfig, appOpts servertypes.AppOptions, baseAppOptions ...func(*baseapp.BaseApp),
) *GaiaApp {
	appCodec := encodingConfig.Marshaler
	legacyAmino := encodingConfig.Amino
	interfaceRegistry := encodingConfig.InterfaceRegistry

	bApp := baseapp.NewBaseApp(appName, logger, db, encodingConfig.TxConfig.TxDecoder(), baseAppOptions...)
	bApp.SetCommitMultiStoreTracer(traceStore)
	bApp.SetVersion(version.Version)
	bApp.SetInterfaceRegistry(interfaceRegistry)

	keys := sdk.NewKVStoreKeys(
		authtypes.StoreKey, banktypes.StoreKey, stakingtypes.StoreKey,
		minttypes.StoreKey, distrtypes.StoreKey, slashingtypes.StoreKey,
		govtypes.StoreKey, paramstypes.StoreKey, ibchost.StoreKey, upgradetypes.StoreKey,
		evidencetypes.StoreKey, ibctransfertypes.StoreKey, packetforwardtypes.StoreKey,
		capabilitytypes.StoreKey, feegrant.StoreKey, authzkeeper.StoreKey, icahosttypes.StoreKey,
		swingset.StoreKey, vstorage.StoreKey, vibc.StoreKey, vlocalchain.StoreKey, vbank.StoreKey,
	)
	tkeys := sdk.NewTransientStoreKeys(paramstypes.TStoreKey)
	memKeys := sdk.NewMemoryStoreKeys(capabilitytypes.MemStoreKey)

	app := &GaiaApp{
		BaseApp:           bApp,
		AgdServer:         agdServer,
		legacyAmino:       legacyAmino,
		appCodec:          appCodec,
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

	// set the BaseApp's parameter store
	bApp.SetParamStore(
		app.ParamsKeeper.Subspace(baseapp.Paramspace).WithKeyTable(paramstypes.ConsensusParamsKeyTable()),
	)

	// add capability keeper and ScopeToModule for ibc module
	app.CapabilityKeeper = capabilitykeeper.NewKeeper(appCodec, keys[capabilitytypes.StoreKey], memKeys[capabilitytypes.MemStoreKey])
	scopedIBCKeeper := app.CapabilityKeeper.ScopeToModule(ibchost.ModuleName)
	scopedTransferKeeper := app.CapabilityKeeper.ScopeToModule(ibctransfertypes.ModuleName)
	scopedICAHostKeeper := app.CapabilityKeeper.ScopeToModule(icahosttypes.SubModuleName)
	scopedVibcKeeper := app.CapabilityKeeper.ScopeToModule(vibc.ModuleName)
	app.CapabilityKeeper.Seal()

	// add keepers
	app.AccountKeeper = authkeeper.NewAccountKeeper(
		appCodec,
		keys[authtypes.StoreKey],
		app.GetSubspace(authtypes.ModuleName),
		authtypes.ProtoBaseAccount,
		maccPerms,
		appName,
	)

	app.BankKeeper = bankkeeper.NewBaseKeeper(
		appCodec,
		keys[banktypes.StoreKey],
		app.AccountKeeper,
		app.GetSubspace(banktypes.ModuleName),
		app.BlockedAddrs(),
	)
	app.AuthzKeeper = authzkeeper.NewKeeper(
		keys[authzkeeper.StoreKey],
		appCodec,
		app.BaseApp.MsgServiceRouter(),
		app.AccountKeeper,
	)
	app.FeeGrantKeeper = feegrantkeeper.NewKeeper(
		appCodec,
		keys[feegrant.StoreKey],
		app.AccountKeeper,
	)
	stakingKeeper := stakingkeeper.NewKeeper(
		appCodec,
		keys[stakingtypes.StoreKey],
		app.AccountKeeper,
		app.BankKeeper,
		app.GetSubspace(stakingtypes.ModuleName),
	)
	app.MintKeeper = mintkeeper.NewKeeper(
		appCodec,
		keys[minttypes.StoreKey],
		app.GetSubspace(minttypes.ModuleName),
		&stakingKeeper,
		app.AccountKeeper,
		app.BankKeeper,
		vbanktypes.GiveawayPoolName,
	)
	distrKeeper := distrkeeper.NewKeeper(
		appCodec,
		keys[distrtypes.StoreKey],
		app.GetSubspace(distrtypes.ModuleName),
		app.AccountKeeper,
		app.BankKeeper,
		&stakingKeeper,
		// This is the pool to distribute from immediately.  DO NOT ALTER.
		vbanktypes.GiveawayPoolName,
	)
	app.SlashingKeeper = slashingkeeper.NewKeeper(
		appCodec,
		keys[slashingtypes.StoreKey],
		&stakingKeeper,
		app.GetSubspace(slashingtypes.ModuleName),
	)
	app.UpgradeKeeper = upgradekeeper.NewKeeper(
		skipUpgradeHeights,
		keys[upgradetypes.StoreKey],
		appCodec,
		homePath,
		app.BaseApp,
		authtypes.NewModuleAddress(govtypes.ModuleName).String(),
	)

	// register the staking hooks
	// NOTE: stakingKeeper above is passed by reference, so that it will contain these hooks
	app.StakingKeeper = *stakingKeeper.SetHooks(
		stakingtypes.NewMultiStakingHooks(distrKeeper.Hooks(), app.SlashingKeeper.Hooks()),
	)
	app.DistrKeeper = *distrKeeper.AddHooks(vestingtypes.NewDistributionHooks(app.AccountKeeper, app.BankKeeper, app.StakingKeeper))

	app.IBCKeeper = ibckeeper.NewKeeper(
		appCodec,
		keys[ibchost.StoreKey],
		app.GetSubspace(ibchost.ModuleName),
		app.StakingKeeper,
		app.UpgradeKeeper,
		scopedIBCKeeper,
	)

	// This function is tricky to get right, so we build it ourselves.
	callToController := func(ctx sdk.Context, str string) (string, error) {
		app.CheckControllerInited(true)
		// We use SwingSet-level metering to charge the user for the call.
		defer app.AgdServer.SetControllerContext(ctx)()
		return sendToController(sdk.WrapSDKContext(ctx), true, str)
	}

	setBootstrapNeeded := func() {
		app.bootstrapNeeded = true
	}

	app.VstorageKeeper = vstorage.NewKeeper(
		keys[vstorage.StoreKey],
	)
	app.vstoragePort = app.AgdServer.MustRegisterPortHandler("vstorage", vstorage.NewStorageHandler(app.VstorageKeeper))

	// The SwingSetKeeper is the Keeper from the SwingSet module
	app.SwingSetKeeper = swingset.NewKeeper(
		appCodec, keys[swingset.StoreKey], app.GetSubspace(swingset.ModuleName),
		app.AccountKeeper, app.BankKeeper,
		app.VstorageKeeper, vbanktypes.ReservePoolName,
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
		app.IBCKeeper.ChannelKeeper, &app.IBCKeeper.PortKeeper,
	).WithScope(keys[vibc.StoreKey], scopedVibcKeeper, app.SwingSetKeeper.PushAction)

	vibcModule := vibc.NewAppModule(app.VibcKeeper, app.BankKeeper)
	vibcIBCModule := vibc.NewIBCModule(app.VibcKeeper)
	app.vibcPort = app.AgdServer.MustRegisterPortHandler("vibc", vibc.NewReceiver(app.VibcKeeper))

	app.VbankKeeper = vbank.NewKeeper(
		appCodec, keys[vbank.StoreKey], app.GetSubspace(vbank.ModuleName),
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
		AddRoute(distrtypes.RouterKey, distr.NewCommunityPoolSpendProposalHandler(app.DistrKeeper)).
		AddRoute(upgradetypes.RouterKey, upgrade.NewSoftwareUpgradeProposalHandler(app.UpgradeKeeper)).
		AddRoute(ibcclienttypes.RouterKey, ibcclient.NewClientProposalHandler(app.IBCKeeper.ClientKeeper)).
		AddRoute(swingsettypes.RouterKey, swingset.NewSwingSetProposalHandler(app.SwingSetKeeper))
	govConfig := govtypes.DefaultConfig()

	app.GovKeeper = govkeeper.NewKeeper(
		appCodec,
		keys[govtypes.StoreKey],
		app.GetSubspace(govtypes.ModuleName),
		app.AccountKeeper,
		app.BankKeeper,
		&stakingKeeper,
		govRouter,
		app.BaseApp.MsgServiceRouter(),
		govConfig,
	)

	// Initialize the packet forward middleware Keeper
	// It's important to note that the PFM Keeper must be initialized before the Transfer Keeper
	app.PacketForwardKeeper = packetforwardkeeper.NewKeeper(
		appCodec,
		keys[packetforwardtypes.StoreKey],
		app.GetSubspace(packetforwardtypes.ModuleName),
		app.TransferKeeper, // will be zero-value here, reference is set later on with SetTransferKeeper.
		app.IBCKeeper.ChannelKeeper,
		app.DistrKeeper,
		app.BankKeeper,
		app.IBCKeeper.ChannelKeeper,
	)

	app.TransferKeeper = ibctransferkeeper.NewKeeper(
		appCodec,
		keys[ibctransfertypes.StoreKey],
		app.GetSubspace(ibctransfertypes.ModuleName),
		app.PacketForwardKeeper,
		app.IBCKeeper.ChannelKeeper,
		&app.IBCKeeper.PortKeeper,
		app.AccountKeeper,
		app.BankKeeper,
		scopedTransferKeeper,
	)
	transferModule := transfer.NewAppModule(app.TransferKeeper)
	transferIBCModule := transfer.NewIBCModule(app.TransferKeeper)
	app.PacketForwardKeeper.SetTransferKeeper(app.TransferKeeper)
	transferPFMModule := packetforward.NewIBCMiddleware(
		transferIBCModule,
		app.PacketForwardKeeper,
		0, // retries on timeout
		packetforwardkeeper.DefaultForwardTransferPacketTimeoutTimestamp, // forward timeout
		packetforwardkeeper.DefaultRefundTransferPacketTimeoutTimestamp,  // refund timeout
	)

	app.ICAHostKeeper = icahostkeeper.NewKeeper(
		appCodec, keys[icahosttypes.StoreKey],
		app.GetSubspace(icahosttypes.SubModuleName),
		app.PacketForwardKeeper,
		app.IBCKeeper.ChannelKeeper,
		&app.IBCKeeper.PortKeeper,
		app.AccountKeeper,
		scopedICAHostKeeper,
		app.MsgServiceRouter(),
	)
	icaModule := ica.NewAppModule(nil, &app.ICAHostKeeper)
	icaHostIBCModule := icahost.NewIBCModule(app.ICAHostKeeper)

	// create static IBC router, add transfer route, then set and seal it
	// Don't be confused by the name!  The port router maps *module names* (not
	// PortIDs) to modules.
	ibcRouter := porttypes.NewRouter()

	// transfer stack contains (from top to bottom):
	// - ICA Host
	// - Packet Forward Middleware wrapping transfer IBC
	// - vIBC
	ibcRouter.AddRoute(icahosttypes.SubModuleName, icaHostIBCModule).
		AddRoute(ibctransfertypes.ModuleName, transferPFMModule).
		AddRoute(vibc.ModuleName, vibcIBCModule)

	// Seal the router
	app.IBCKeeper.SetRouter(ibcRouter)

	// The local chain keeper provides ICA/ICQ-like support for the VM to
	// control a fresh account and/or query this Cosmos-SDK instance.
	app.VlocalchainKeeper = vlocalchain.NewKeeper(
		appCodec,
		keys[vlocalchain.StoreKey],
		app.BaseApp.MsgServiceRouter(),
		app.BaseApp.GRPCQueryRouter(),
	)
	app.vlocalchainPort = app.AgdServer.MustRegisterPortHandler(
		"vlocalchain",
		vlocalchain.NewReceiver(app.VlocalchainKeeper),
	)

	// create evidence keeper with router
	evidenceKeeper := evidencekeeper.NewKeeper(
		appCodec,
		keys[evidencetypes.StoreKey],
		&app.StakingKeeper,
		app.SlashingKeeper,
	)

	app.EvidenceKeeper = *evidenceKeeper

	swingStoreExportDir := cast.ToString(appOpts.Get(FlagSwingStoreExportDir))

	// NOTE: Any module instantiated in the module manager that is later modified
	// must be passed by reference here.
	app.mm = module.NewManager(
		genutil.NewAppModule(
			app.AccountKeeper,
			app.StakingKeeper,
			app.BaseApp.DeliverTx,
			encodingConfig.TxConfig,
		),
		auth.NewAppModule(appCodec, app.AccountKeeper, nil),
		vesting.NewAppModule(app.AccountKeeper, app.BankKeeper, app.StakingKeeper),
		bank.NewAppModule(appCodec, app.BankKeeper, app.AccountKeeper),
		capability.NewAppModule(appCodec, *app.CapabilityKeeper),
		gov.NewAppModule(appCodec, app.GovKeeper, app.AccountKeeper, app.BankKeeper),
		mint.NewAppModule(appCodec, app.MintKeeper, app.AccountKeeper, nil),
		slashing.NewAppModule(appCodec, app.SlashingKeeper, app.AccountKeeper, app.BankKeeper, app.StakingKeeper),
		distr.NewAppModule(appCodec, app.DistrKeeper, app.AccountKeeper, app.BankKeeper, app.StakingKeeper),
		staking.NewAppModule(appCodec, app.StakingKeeper, app.AccountKeeper, app.BankKeeper),
		upgrade.NewAppModule(app.UpgradeKeeper),
		evidence.NewAppModule(app.EvidenceKeeper),
		feegrantmodule.NewAppModule(appCodec, app.AccountKeeper, app.BankKeeper, app.FeeGrantKeeper, app.interfaceRegistry),
		authzmodule.NewAppModule(appCodec, app.AuthzKeeper, app.AccountKeeper, app.BankKeeper, app.interfaceRegistry),
		ibc.NewAppModule(app.IBCKeeper),
		params.NewAppModule(app.ParamsKeeper),
		transferModule,
		icaModule,
		packetforward.NewAppModule(app.PacketForwardKeeper),
		vstorage.NewAppModule(app.VstorageKeeper),
		swingset.NewAppModule(app.SwingSetKeeper, &app.SwingStoreExportsHandler, setBootstrapNeeded, app.ensureControllerInited, swingStoreExportDir),
		vibcModule,
		vbankModule,
	)

	// During begin block slashing happens after distr.BeginBlocker so that
	// there is nothing left over in the validator fee pool, so as to keep the
	// CanWithdrawInvariant invariant.
	// NOTE: staking module is required if HistoricalEntries param > 0
	// NOTE: capability module's beginblocker must come before any modules using capabilities (e.g. IBC)
	app.mm.SetOrderBeginBlockers(
		// upgrades should be run first
		upgradetypes.ModuleName,
		capabilitytypes.ModuleName,
		govtypes.ModuleName,
		stakingtypes.ModuleName,
		ibctransfertypes.ModuleName,
		ibchost.ModuleName,
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
		paramstypes.ModuleName,
		vestingtypes.ModuleName,
		vstorage.ModuleName,
		// This will cause the swingset controller to init if it hadn't yet, passing
		// any upgrade plan or bootstrap flag when starting at an upgrade height
		swingset.ModuleName,
		vibc.ModuleName,
		vbank.ModuleName,
	)
	app.mm.SetOrderEndBlockers(
		vibc.ModuleName,
		vbank.ModuleName,
		govtypes.ModuleName,
		stakingtypes.ModuleName,
		ibctransfertypes.ModuleName,
		ibchost.ModuleName,
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
		// SwingSet needs to be last, for it to capture all the pushed actions.
		swingset.ModuleName,
		// And then vstorage, to produce SwingSet-induced events.
		vstorage.ModuleName,
	)

	// NOTE: The genutils module must occur after staking so that pools are
	// properly initialized with tokens from genesis accounts.
	// NOTE: The genutils module must also occur after auth so that it can access the params from auth.
	// NOTE: Capability module must occur first so that it can initialize any capabilities
	// so that other modules that want to create or claim capabilities afterwards in InitChain
	// can do so safely.

	moduleOrderForGenesisAndUpgrade := []string{
		capabilitytypes.ModuleName,
		authtypes.ModuleName,
		banktypes.ModuleName,
		distrtypes.ModuleName,
		stakingtypes.ModuleName,
		slashingtypes.ModuleName,
		govtypes.ModuleName,
		minttypes.ModuleName,
		ibctransfertypes.ModuleName,
		ibchost.ModuleName,
		icatypes.ModuleName,
		evidencetypes.ModuleName,
		feegrant.ModuleName,
		authz.ModuleName,
		genutiltypes.ModuleName,
		paramstypes.ModuleName,
		upgradetypes.ModuleName,
		vestingtypes.ModuleName,
		vstorage.ModuleName,
		vbank.ModuleName,
		vibc.ModuleName,
		swingset.ModuleName,
		packetforwardtypes.ModuleName,
	}

	app.mm.SetOrderInitGenesis(moduleOrderForGenesisAndUpgrade...)
	app.mm.SetOrderMigrations(moduleOrderForGenesisAndUpgrade...)

	app.mm.RegisterRoutes(app.Router(), app.QueryRouter(), encodingConfig.Amino)

	app.configurator = module.NewConfigurator(app.appCodec, app.MsgServiceRouter(), app.GRPCQueryRouter())
	app.mm.RegisterServices(app.configurator)

	// create the simulation manager and define the order of the modules for deterministic simulations
	//
	// NOTE: this is not required apps that don't use the simulator for fuzz testing
	// transactions
	app.sm = module.NewSimulationManager(
		auth.NewAppModule(appCodec, app.AccountKeeper, authsims.RandomGenesisAccounts),
		bank.NewAppModule(appCodec, app.BankKeeper, app.AccountKeeper),
		capability.NewAppModule(appCodec, *app.CapabilityKeeper),
		feegrantmodule.NewAppModule(appCodec, app.AccountKeeper, app.BankKeeper, app.FeeGrantKeeper, app.interfaceRegistry),
		authzmodule.NewAppModule(appCodec, app.AuthzKeeper, app.AccountKeeper, app.BankKeeper, app.interfaceRegistry),
		gov.NewAppModule(appCodec, app.GovKeeper, app.AccountKeeper, app.BankKeeper),
		mint.NewAppModule(appCodec, app.MintKeeper, app.AccountKeeper, nil),
		staking.NewAppModule(appCodec, app.StakingKeeper, app.AccountKeeper, app.BankKeeper),
		distr.NewAppModule(appCodec, app.DistrKeeper, app.AccountKeeper, app.BankKeeper, app.StakingKeeper),
		slashing.NewAppModule(appCodec, app.SlashingKeeper, app.AccountKeeper, app.BankKeeper, app.StakingKeeper),
		params.NewAppModule(app.ParamsKeeper),
		evidence.NewAppModule(app.EvidenceKeeper),
		ibc.NewAppModule(app.IBCKeeper),
		transferModule,
	)

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
				SignModeHandler: encodingConfig.TxConfig.SignModeHandler(),
				SigGasConsumer:  ante.DefaultSigVerificationGasConsumer,
			},
			IBCKeeper:        app.IBCKeeper,
			AdmissionData:    app.SwingSetKeeper,
			FeeCollectorName: vbanktypes.ReservePoolName,
			SwingsetKeeper:   app.SwingSetKeeper,
		},
	)
	if err != nil {
		panic(fmt.Errorf("failed to create AnteHandler: %s", err))
	}

	app.SetAnteHandler(anteHandler)
	app.SetInitChainer(app.InitChainer)
	app.SetBeginBlocker(app.BeginBlocker)
	app.SetEndBlocker(app.EndBlocker)

	for name := range upgradeNamesOfThisVersion {
		app.UpgradeKeeper.SetUpgradeHandler(
			name,
			unreleasedUpgradeHandler(app, name),
		)
	}

	upgradeInfo, err := app.UpgradeKeeper.ReadUpgradeInfoFromDisk()
	if err != nil {
		panic(err)
	}
	if upgradeNamesOfThisVersion[upgradeInfo.Name] && !app.UpgradeKeeper.IsSkipHeight(upgradeInfo.Height) {
		storeUpgrades := storetypes.StoreUpgrades{
			Added: []string{
				packetforwardtypes.ModuleName, // Added PFM
				vlocalchain.ModuleName,        // Agoric added vlocalchain
			},
			Deleted: []string{
				crisistypes.ModuleName, // The SDK discontinued the crisis module in v0.51.0
				"lien",                 // Agoric removed the lien module
			},
		}

		// configure store loader that checks if version == upgradeHeight and applies store upgrades
		app.SetStoreLoader(upgradetypes.UpgradeStoreLoader(upgradeInfo.Height, &storeUpgrades))
	}

	if loadLatest {
		if err := app.LoadLatestVersion(); err != nil {
			tmos.Exit(fmt.Sprintf("failed to load latest version: %s", err))
		}
	}

	app.ScopedIBCKeeper = scopedIBCKeeper
	app.ScopedVibcKeeper = scopedVibcKeeper
	app.ScopedTransferKeeper = scopedTransferKeeper
	app.ScopedICAHostKeeper = scopedICAHostKeeper
	snapshotManager := app.SnapshotManager()
	if snapshotManager != nil {
		if err = snapshotManager.RegisterExtensions(&app.SwingSetSnapshotter); err != nil {
			panic(fmt.Errorf("failed to register snapshot extension: %s", err))
		}
	}

	return app
}

var upgradeNamesOfThisVersion = map[string]bool{
	"UNRELEASED_UPGRADE":      true,
	"UNRELEASED_TEST_UPGRADE": true,
}

func isFirstTimeUpgradeOfThisVersion(app *GaiaApp, ctx sdk.Context) bool {
	for name := range upgradeNamesOfThisVersion {
		if app.UpgradeKeeper.GetDoneHeight(ctx, name) != 0 {
			return false
		}
	}
	return true
}

// unreleasedUpgradeHandler performs standard upgrade actions plus custom actions for the unreleased upgrade.
func unreleasedUpgradeHandler(app *GaiaApp, targetUpgrade string) func(sdk.Context, upgradetypes.Plan, module.VersionMap) (module.VersionMap, error) {
	return func(ctx sdk.Context, plan upgradetypes.Plan, fromVm module.VersionMap) (module.VersionMap, error) {
		app.CheckControllerInited(false)

		CoreProposalSteps := []vm.CoreProposalStep{}

		// These CoreProposalSteps are not idempotent and should only be executed
		// as part of the first upgrade using this handler on any given chain.
		if isFirstTimeUpgradeOfThisVersion(app, ctx) {
			// Each CoreProposalStep runs sequentially, and can be constructed from
			// one or more modules executing in parallel within the step.
			CoreProposalSteps = []vm.CoreProposalStep{
				/* upgrade-15 evals */
				// Upgrade ZCF only
				vm.CoreProposalStepForModules("@agoric/builders/scripts/vats/upgrade-zcf.js"),
				// Upgrade walletFactory
				vm.CoreProposalStepForModules("@agoric/builders/scripts/smart-wallet/build-wallet-factory2-upgrade.js"),
				// upgrade the provisioning vat
				vm.CoreProposalStepForModules("@agoric/builders/scripts/vats/replace-provisioning.js"),
				// Enable low-level Orchestration.
				vm.CoreProposalStepForModules(
					"@agoric/builders/scripts/vats/init-network.js",
					"@agoric/builders/scripts/vats/init-localchain.js",
				),
				// Add new vats for price feeds. The existing ones will be retired shortly.
				vm.CoreProposalStepForModules(
					"@agoric/builders/scripts/vats/updateAtomPriceFeed.js",
					"@agoric/builders/scripts/vats/updateStAtomPriceFeed.js",
					"@agoric/builders/scripts/vats/updateStOsmoPriceFeed.js",
					"@agoric/builders/scripts/vats/updateStTiaPriceFeed.js",
					"@agoric/builders/scripts/vats/updateStkAtomPriceFeed.js",
				),
				// Add new auction contract. The old one will be retired shortly.
				vm.CoreProposalStepForModules( "@agoric/builders/scripts/vats/add-auction.js"),
				// upgrade vaultFactory.
				vm.CoreProposalStepForModules( "@agoric/builders/scripts/vats/upgradeVaults.js"),
				// upgrade scaledPriceAuthorities.
				vm.CoreProposalStepForModules( "@agoric/builders/scripts/vats/upgradeScaledPriceAuthorities.js"),
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

// normalizeModuleAccount ensures that the given account is a module account,
// initializing or updating it if necessary. The account name must be listed in maccPerms.
func normalizeModuleAccount(ctx sdk.Context, ak authkeeper.AccountKeeper, name string) {
	addr := ak.GetModuleAddress(name)
	acct := ak.GetAccount(ctx, addr)
	if _, ok := acct.(authtypes.ModuleAccountI); ok {
		return
	}
	perms := maccPerms[name]
	newAcct := authtypes.NewEmptyModuleAccount(name, perms...)
	if acct != nil {
		newAcct.AccountNumber = acct.GetAccountNumber()
		newAcct.Sequence = acct.GetSequence()
	}
	ak.SetModuleAccount(ctx, newAcct)
}

type upgradeDetails struct {
	Plan          upgradetypes.Plan `json:"plan"`
	CoreProposals *vm.CoreProposals `json:"coreProposals,omitempty"`
}

type cosmosInitAction struct {
	vm.ActionHeader `actionType:"AG_COSMOS_INIT"`
	ChainID         string          `json:"chainID"`
	IsBootstrap     bool            `json:"isBootstrap"`
	UpgradeDetails  *upgradeDetails `json:"upgradeDetails,omitempty"`
	Params          swingset.Params `json:"params"`
	SupplyCoins     sdk.Coins       `json:"supplyCoins"`
	// CAVEAT: Every property ending in "Port" is saved in chain-main.js/portNums
	// with a key consisting of this name with the "Port" stripped.
	StoragePort     int `json:"storagePort"`
	SwingsetPort    int `json:"swingsetPort"`
	VbankPort       int `json:"vbankPort"`
	VibcPort        int `json:"vibcPort"`
	VlocalchainPort int `json:"vlocalchainPort"`
}

// Name returns the name of the App
func (app *GaiaApp) Name() string { return app.BaseApp.Name() }

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
	action := &cosmosInitAction{
		ChainID:        ctx.ChainID(),
		IsBootstrap:    bootstrap,
		Params:         app.SwingSetKeeper.GetParams(ctx),
		SupplyCoins:    sdk.NewCoins(app.BankKeeper.GetSupply(ctx, "uist")),
		UpgradeDetails: app.upgradeDetails,
		// See CAVEAT in cosmosInitAction.
		StoragePort:     app.vstoragePort,
		SwingsetPort:    app.swingsetPort,
		VbankPort:       app.vbankPort,
		VibcPort:        app.vibcPort,
		VlocalchainPort: app.vlocalchainPort,
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
func (app *GaiaApp) BeginBlocker(ctx sdk.Context, req abci.RequestBeginBlock) abci.ResponseBeginBlock {
	return app.mm.BeginBlock(ctx, req)
}

// EndBlocker application updates every end block
func (app *GaiaApp) EndBlocker(ctx sdk.Context, req abci.RequestEndBlock) abci.ResponseEndBlock {
	return app.mm.EndBlock(ctx, req)
}

// InitChainer application update at chain initialization
func (app *GaiaApp) InitChainer(ctx sdk.Context, req abci.RequestInitChain) abci.ResponseInitChain {
	var genesisState GenesisState
	if err := tmjson.Unmarshal(req.AppStateBytes, &genesisState); err != nil {
		panic(err)
	}

	app.UpgradeKeeper.SetModuleVersionMap(ctx, app.mm.GetVersionMap())
	res := app.mm.InitGenesis(ctx, app.appCodec, genesisState)

	// initialize the provision and reserve module accounts, to avoid their implicit creation
	// as a default account upon receiving a transfer. See BlockedAddrs().
	normalizeModuleAccount(ctx, app.AccountKeeper, vbanktypes.ProvisionPoolName)
	normalizeModuleAccount(ctx, app.AccountKeeper, vbanktypes.ReservePoolName)

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

	return res
}

// Commit tells the controller that the block is commited
func (app *GaiaApp) Commit() abci.ResponseCommit {
	err := swingsetkeeper.WaitUntilSwingStoreExportStarted()

	if err != nil {
		app.Logger().Error("swing-store export failed to start", "err", err)
	}

	// Frontrun the BaseApp's Commit method
	err = swingset.CommitBlock(app.SwingSetKeeper)
	if err != nil {
		panic(err.Error())
	}

	res, snapshotHeight := app.BaseApp.CommitWithoutSnapshot()

	err = swingset.AfterCommitBlock(app.SwingSetKeeper)
	if err != nil {
		panic(err.Error())
	}

	if snapshotHeight > 0 {
		err = app.SwingSetSnapshotter.InitiateSnapshot(snapshotHeight)

		if err != nil {
			app.Logger().Error("failed to initiate swingset snapshot", "err", err)
		}
	}

	return res
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

// BlockedAddrs returns the app's module account addresses that
// are blocked from receiving funds.
func (app *GaiaApp) BlockedAddrs() map[string]bool {
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
	tmservice.RegisterGRPCGatewayRoutes(clientCtx, apiSvr.GRPCGatewayRouter)

	// Register node gRPC service for grpc-gateway.
	nodeservice.RegisterGRPCGatewayRoutes(clientCtx, apiSvr.GRPCGatewayRouter)

	// Register grpc-gateway routes for all modules.
	ModuleBasics.RegisterGRPCGatewayRoutes(clientCtx, apiSvr.GRPCGatewayRouter)

	// register swagger API from root so that other applications can override easily
	if apiConfig.Swagger {
		RegisterSwaggerAPI(apiSvr.Router)
	}
}

// RegisterTxService implements the Application.RegisterTxService method.
func (app *GaiaApp) RegisterTxService(clientCtx client.Context) {
	authtx.RegisterTxService(app.BaseApp.GRPCQueryRouter(), clientCtx, app.BaseApp.Simulate, app.interfaceRegistry)
}

// RegisterTendermintService implements the Application.RegisterTendermintService method.
func (app *GaiaApp) RegisterTendermintService(clientCtx client.Context) {
	tmservice.RegisterTendermintService(clientCtx, app.BaseApp.GRPCQueryRouter(), app.interfaceRegistry, app.Query)
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

	paramsKeeper.Subspace(authtypes.ModuleName)
	paramsKeeper.Subspace(banktypes.ModuleName)
	paramsKeeper.Subspace(stakingtypes.ModuleName)
	paramsKeeper.Subspace(minttypes.ModuleName)
	paramsKeeper.Subspace(distrtypes.ModuleName)
	paramsKeeper.Subspace(slashingtypes.ModuleName)
	paramsKeeper.Subspace(govtypes.ModuleName).WithKeyTable(govtypesv1.ParamKeyTable())
	paramsKeeper.Subspace(ibctransfertypes.ModuleName)
	paramsKeeper.Subspace(ibchost.ModuleName)
	paramsKeeper.Subspace(icahosttypes.SubModuleName)
	paramsKeeper.Subspace(packetforwardtypes.ModuleName).WithKeyTable(packetforwardtypes.ParamKeyTable())
	paramsKeeper.Subspace(swingset.ModuleName)
	paramsKeeper.Subspace(vbank.ModuleName)

	return paramsKeeper
}
