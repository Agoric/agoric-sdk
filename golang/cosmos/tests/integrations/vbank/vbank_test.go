package vbank_test

import (
	"fmt"
	"os"
	"testing"
	"time"

	appmodule "cosmossdk.io/core/appmodule"
	"cosmossdk.io/log"
	sdkmath "cosmossdk.io/math"
	storetypes "cosmossdk.io/store/types"
	"github.com/cometbft/cometbft/crypto/secp256k1"
	cmtproto "github.com/cometbft/cometbft/proto/tendermint/types"
	"github.com/cosmos/cosmos-sdk/codec"
	addresscodec "github.com/cosmos/cosmos-sdk/codec/address"
	"github.com/cosmos/cosmos-sdk/runtime"
	"github.com/cosmos/cosmos-sdk/testutil/integration"
	sdk "github.com/cosmos/cosmos-sdk/types"
	moduletestutil "github.com/cosmos/cosmos-sdk/types/module/testutil"
	"github.com/cosmos/cosmos-sdk/x/auth"
	authkeeper "github.com/cosmos/cosmos-sdk/x/auth/keeper"
	authsims "github.com/cosmos/cosmos-sdk/x/auth/simulation"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"
	"github.com/cosmos/cosmos-sdk/x/bank"
	bankkeeper "github.com/cosmos/cosmos-sdk/x/bank/keeper"
	banktypes "github.com/cosmos/cosmos-sdk/x/bank/types"
	minttypes "github.com/cosmos/cosmos-sdk/x/mint/types"
	paramskeeper "github.com/cosmos/cosmos-sdk/x/params/keeper"
	paramstypes "github.com/cosmos/cosmos-sdk/x/params/types"
	"github.com/stretchr/testify/require"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vbank"
	vbanktypes "github.com/Agoric/agoric-sdk/golang/cosmos/x/vbank/types"

	vstorage "github.com/Agoric/agoric-sdk/golang/cosmos/x/vstorage"
)

var (
	priv1 = secp256k1.GenPrivKey()
	priv2 = secp256k1.GenPrivKey()
	priv3 = secp256k1.GenPrivKey()
	priv4 = secp256k1.GenPrivKey()
	addr1 = sdk.AccAddress(priv1.PubKey().Address()).String()
	addr2 = sdk.AccAddress(priv2.PubKey().Address()).String()
	addr3 = sdk.AccAddress(priv3.PubKey().Address()).String()
	addr4 = sdk.AccAddress(priv4.PubKey().Address()).String()
)

type VbankFixtures struct {
	ctx         sdk.Context
	vbankKeeper vbank.Keeper
	bankKeeper  bankkeeper.Keeper
	vbankModule vbank.AppModule
	bankModule  bank.AppModule
}

func (f *VbankFixtures) advanceBlock(t *testing.T) {
	currentHeight := f.ctx.BlockHeight()
	currentTime := f.ctx.BlockTime()

	f.ctx = f.ctx.WithBlockHeight(currentHeight + 1).WithBlockTime(currentTime.Add(5 * time.Second))

	err := f.vbankModule.EndBlock(f.ctx)

	require.NoError(t, err)

}

func initVbankFixtures(t *testing.T) VbankFixtures {
	// Create encoding config with all required modules
	encodingCfg := moduletestutil.MakeTestEncodingConfig(
		auth.AppModuleBasic{},
		bank.AppModuleBasic{},
		vbank.AppModuleBasic{},
	)

	// Define all required store keys
	keys := storetypes.NewKVStoreKeys(
		authtypes.StoreKey,
		banktypes.StoreKey,
		vbank.StoreKey,
		paramstypes.StoreKey,
		vstorage.StoreKey,
		swingset.StoreKey,
	)
	tkeys := storetypes.NewTransientStoreKeys(
		vbanktypes.TStoreKey,
		paramstypes.TStoreKey,
	)

	logger := log.NewTestLogger(t)
	cms := integration.CreateMultiStore(keys, logger)

	// Mount transient stores manually
	for _, tkey := range tkeys {
		cms.MountStoreWithDB(tkey, storetypes.StoreTypeTransient, nil)
	}

	// Load latest version after mounting stores
	if err := cms.LoadLatestVersion(); err != nil {
		t.Fatalf("failed to load multistore: %v", err)
	}

	newCtx := sdk.NewContext(cms, cmtproto.Header{}, true, logger)
	authority := authtypes.NewModuleAddress("gov")

	maccPerms := map[string][]string{
		minttypes.ModuleName:         {authtypes.Minter},
		vbank.ModuleName:             {authtypes.Burner, authtypes.Staking},
		vbanktypes.ReservePoolName:   nil,
		vbanktypes.ProvisionPoolName: nil,
		vbanktypes.GiveawayPoolName:  nil,
	}

	// Initialize all keepers
	accountKeeper := authkeeper.NewAccountKeeper(
		encodingCfg.Codec,
		runtime.NewKVStoreService(keys[authtypes.StoreKey]),
		authtypes.ProtoBaseAccount,
		maccPerms,
		addresscodec.NewBech32Codec(sdk.Bech32MainPrefix),
		sdk.Bech32MainPrefix,
		authority.String(),
	)

	blockedAddresses := BlockedAddresses(maccPerms)

	bankKeeper := bankkeeper.NewBaseKeeper(
		encodingCfg.Codec,
		runtime.NewKVStoreService(keys[banktypes.StoreKey]),
		accountKeeper,
		blockedAddresses,
		authority.String(),
		logger,
	)

	vstorageKeeper := vstorage.NewKeeper(
		vstorage.StoreKey,
		runtime.NewKVStoreService(keys[vstorage.StoreKey]),
	)

	paramsKeeper := initParamsKeeper(encodingCfg.Codec, codec.NewLegacyAmino(), keys[paramstypes.StoreKey], tkeys[paramstypes.TStoreKey])

	// Dummy controller function for testing
	callToController := func(ctx sdk.Context, jsonRequest string) (jsonReply string, err error) {
		return `{"ok": true}`, nil
	}

	// Initialize swingset keeper
	swingSetKeeper := swingset.NewKeeper(
		encodingCfg.Codec,
		runtime.NewKVStoreService(keys[swingset.StoreKey]),
		getSubspace(swingset.ModuleName, paramsKeeper),
		accountKeeper,
		bankKeeper,
		vstorageKeeper,
		vbanktypes.ReservePoolName,
		callToController,
	)

	// Initialize vbank keeper
	vbankKeeper := vbank.NewKeeper(
		encodingCfg.Codec,
		runtime.NewKVStoreService(keys[vbank.StoreKey]),
		runtime.NewTransientStoreService(tkeys[vbanktypes.TStoreKey]),
		getSubspace(vbank.ModuleName, paramsKeeper),
		accountKeeper,
		bankKeeper,
		authtypes.FeeCollectorName,
		swingSetKeeper.PushAction,
	)

	// Create app modules
	authModule := auth.NewAppModule(
		encodingCfg.Codec,
		accountKeeper,
		authsims.RandomGenesisAccounts,
		getSubspace(authtypes.ModuleName, paramsKeeper),
	)
	bankModule := bank.NewAppModule(
		encodingCfg.Codec,
		bankKeeper,
		accountKeeper,
		getSubspace(banktypes.ModuleName, paramsKeeper),
	)
	vbankModule := vbank.NewAppModule(vbankKeeper)

	// Create integration app
	integrationApp := integration.NewIntegrationApp(
		newCtx,
		logger,
		keys,
		encodingCfg.Codec,
		map[string]appmodule.AppModule{
			authtypes.ModuleName: authModule,
			banktypes.ModuleName: bankModule,
			vbank.ModuleName:     vbankModule,
		},
	)

	// Get the SDK context from the integration app
	sdkCtx := sdk.UnwrapSDKContext(integrationApp.Context())

	// Register message and query servers
	vbanktypes.RegisterMsgServer(integrationApp.MsgServiceRouter(), vbanktypes.UnimplementedMsgServer{})
	vbanktypes.RegisterQueryServer(integrationApp.QueryHelper(), &vbanktypes.UnimplementedQueryServer{})

	return VbankFixtures{
		ctx:         sdkCtx,
		vbankKeeper: vbankKeeper,
		bankKeeper:  bankKeeper,
		vbankModule: vbankModule,
		bankModule:  bankModule,
	}
}

// BlockedAddresses returns the app's module account addresses that
// are blocked from receiving funds.
func BlockedAddresses(maccPerms map[string][]string) map[string]bool {
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

func getSubspace(moduleName string, paramsKeeper paramskeeper.Keeper) paramstypes.Subspace {
	subspace, _ := paramsKeeper.GetSubspace(moduleName)
	return subspace
}

// initParamsKeeper init params keeper and its subspaces
func initParamsKeeper(appCodec codec.BinaryCodec, legacyAmino *codec.LegacyAmino, key, tkey storetypes.StoreKey) paramskeeper.Keeper {
	paramsKeeper := paramskeeper.NewKeeper(appCodec, legacyAmino, key, tkey)

	paramsKeeper.Subspace(authtypes.ModuleName)
	paramsKeeper.Subspace(banktypes.ModuleName)
	paramsKeeper.Subspace(minttypes.ModuleName)
	paramsKeeper.Subspace(swingset.ModuleName)
	paramsKeeper.Subspace(vbank.ModuleName)

	return paramsKeeper
}

func Test_EndBlock_Events(t *testing.T) {
	t.Parallel()
	f := initVbankFixtures(t)

	addr1 := sdk.AccAddress(priv1.PubKey().Address())
	addr2 := sdk.AccAddress(priv2.PubKey().Address())
	addr4 := sdk.AccAddress(priv4.PubKey().Address())

	adStore := f.vbankKeeper.OpenAddressToUpdateStore(f.ctx)

	t.Log("Address Update Store contents before:")
	preCount := 0
	iterator := adStore.Iterator(nil, nil)
	for ; iterator.Valid(); iterator.Next() {
		addressBytes := iterator.Key()
		denoms := string(iterator.Value())

		// Convert raw address bytes to bech32 format for readability
		address, err := f.vbankKeeper.AddressCodec().BytesToString(addressBytes)
		if err != nil {
			address = fmt.Sprintf("(invalid address: %x)", addressBytes)
		}

		fmt.Fprintf(os.Stderr, "Address: %s, Denoms: %s\n", address, denoms)
		t.Logf("Address: %s, Denoms: %s", address, denoms)
		preCount++
	}
	iterator.Close()

	require.Equal(t, preCount, 0)

	// Mint and distribute coins to match unit test setup
	// addr1: 1000 ubld
	f.bankKeeper.MintCoins(f.ctx, "mint", sdk.NewCoins(sdk.NewInt64Coin("ubld", 1000)))
	f.bankKeeper.SendCoinsFromModuleToAccount(f.ctx, "mint", addr1, sdk.NewCoins(sdk.NewInt64Coin("ubld", 1000)))

	// addr2: 4000 urun and 7 arcadeTokens
	f.bankKeeper.MintCoins(f.ctx, "mint", sdk.NewCoins(
		sdk.NewInt64Coin("urun", 4000),
		sdk.NewInt64Coin("arcadeTokens", 7),
	))

	f.bankKeeper.SendCoinsFromModuleToAccount(f.ctx, "mint", addr2, sdk.NewCoins(
		sdk.NewInt64Coin("urun", 4000),
		sdk.NewInt64Coin("arcadeTokens", 7),
	))

	// addr1 send to addr4: 1000 urun
	f.bankKeeper.SendCoins(f.ctx, addr1, addr4, sdk.NewCoins(sdk.NewInt64Coin("ubld", 1000)))

	// Set params
	f.vbankKeeper.SetParams(f.ctx, vbanktypes.Params{
		PerEpochRewardFraction:    sdkmath.LegacyZeroDec(),
		AllowedMonitoringAccounts: []string{"*"},
	})

	// Get the address update store
	f.advanceBlock(t)
	adStore = f.vbankKeeper.OpenAddressToUpdateStore(f.ctx)

	// Print all entries in the store
	iterator = adStore.Iterator(nil, nil)
	defer iterator.Close()
	postCount := 0

	t.Logf("addr1: %s", addr1)
	t.Logf("addr2: %s", addr2)
	t.Logf("addr3: %s", addr3)
	t.Logf("addr4: %s", addr4)
	t.Logf("mint: %s", authtypes.NewModuleAddress("mint"))
	expected := map[string]string{
		addr1.String(): "2000ubld",
		addr2.String(): "7arcadeTokens,4000urun",
		addr4.String(): "1000ubld",
		authtypes.NewModuleAddress("mint").String(): "7arcadeTokens,1000ubld,4000urun",
	}

	for ; iterator.Valid(); iterator.Next() {
		addressBytes := iterator.Key()
		denoms := string(iterator.Value())

		// Convert raw address bytes to bech32 format for readability
		address, err := f.vbankKeeper.AddressCodec().BytesToString(addressBytes)
		if err != nil {
			address = fmt.Sprintf("(invalid address: %x)", addressBytes)
		}

		require.Equal(t, expected[address], denoms)

		postCount++
	}

}
