package keeper_test

import (
	"testing"

	"cosmossdk.io/log"
	"cosmossdk.io/store"
	storemetrics "cosmossdk.io/store/metrics"
	storetypes "cosmossdk.io/store/types"
	cmtproto "github.com/cometbft/cometbft/proto/tendermint/types"
	cmttime "github.com/cometbft/cometbft/types/time"
	dbm "github.com/cosmos/cosmos-db"
	"github.com/cosmos/cosmos-sdk/codec"
	"github.com/cosmos/cosmos-sdk/runtime"
	sdk "github.com/cosmos/cosmos-sdk/types"
	moduletestutil "github.com/cosmos/cosmos-sdk/types/module/testutil"
	paramskeeper "github.com/cosmos/cosmos-sdk/x/params/keeper"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/keeper"
	swingsettypes "github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
	vbanktypes "github.com/Agoric/agoric-sdk/golang/cosmos/x/vbank/types"
)

type keeperTestEnv struct {
	ctx    sdk.Context
	keeper keeper.Keeper
}

func setupKeeperTestEnv(t *testing.T) *keeperTestEnv {
	t.Helper()

	encCfg := moduletestutil.MakeTestEncodingConfig()
	key := storetypes.NewKVStoreKey(swingsettypes.StoreKey)
	paramsKey := storetypes.NewKVStoreKey("params")
	paramsTKey := storetypes.NewTransientStoreKey("transient_params")

	db := dbm.NewMemDB()
	logger := log.NewNopLogger()
	ms := store.NewCommitMultiStore(db, logger, storemetrics.NewNoOpMetrics())
	ms.MountStoreWithDB(key, storetypes.StoreTypeIAVL, db)
	ms.MountStoreWithDB(paramsKey, storetypes.StoreTypeIAVL, db)
	ms.MountStoreWithDB(paramsTKey, storetypes.StoreTypeTransient, db)
	if err := ms.LoadLatestVersion(); err != nil {
		t.Fatalf("failed to load multi-store: %v", err)
	}

	ctx := sdk.NewContext(ms, cmtproto.Header{Time: cmttime.Now()}, false, logger)

	paramsKeeper := paramskeeper.NewKeeper(encCfg.Codec, codec.NewLegacyAmino(), paramsKey, paramsTKey)
	paramsKeeper.Subspace(swingsettypes.ModuleName)
	paramsSubspace, _ := paramsKeeper.GetSubspace(swingsettypes.ModuleName)

	callToController := func(ctx sdk.Context, jsonRequest string) (string, error) {
		return "", nil
	}

	k := keeper.NewKeeper(
		encCfg.Codec,
		runtime.NewKVStoreService(key),
		paramsSubspace,
		nil,
		nil,
		nil,
		vbanktypes.ReservePoolName,
		authority,
		callToController,
	)
	k.SetParams(ctx, swingsettypes.DefaultParams())
	k.SetState(ctx, swingsettypes.State{})

	return &keeperTestEnv{ctx: ctx, keeper: k}
}

func TestChunkedArtifactIdMonotonicAfterRemoval(t *testing.T) {
	env := setupKeeperTestEnv(t)

	first := env.keeper.AddPendingBundleInstall(env.ctx, &swingsettypes.MsgInstallBundle{Submitter: submitAddr})
	env.keeper.SetPendingBundleInstall(env.ctx, first, nil)
	second := env.keeper.AddPendingBundleInstall(env.ctx, &swingsettypes.MsgInstallBundle{Submitter: submitAddr})

	if second != first+1 {
		t.Fatalf("expected chunked artifact id to be monotonic after removal: got %d, want %d", second, first+1)
	}
}
