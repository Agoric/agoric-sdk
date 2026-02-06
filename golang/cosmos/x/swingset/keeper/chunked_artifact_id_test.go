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

	first, err := env.keeper.AddPendingBundleInstall(env.ctx, &swingsettypes.MsgInstallBundle{Submitter: submitAddr})
	if err != nil {
		t.Fatalf("AddPendingBundleInstall failed: %v", err)
	}
	if first == 0 {
		t.Fatalf("allocated chunked artifact id must not be 0")
	}
	if err := env.keeper.SetPendingBundleInstall(env.ctx, first, nil); err != nil {
		t.Fatalf("SetPendingBundleInstall failed: %v", err)
	}
	second, err := env.keeper.AddPendingBundleInstall(env.ctx, &swingsettypes.MsgInstallBundle{Submitter: submitAddr})
	if err != nil {
		t.Fatalf("AddPendingBundleInstall failed: %v", err)
	}

	if second != first+1 {
		t.Fatalf("expected chunked artifact id to be monotonic after removal: got %d, want %d", second, first+1)
	}
}

func TestAddPendingBundleInstallLinksList(t *testing.T) {
	env := setupKeeperTestEnv(t)

	first, err := env.keeper.AddPendingBundleInstall(env.ctx, &swingsettypes.MsgInstallBundle{Submitter: submitAddr})
	if err != nil {
		t.Fatalf("AddPendingBundleInstall failed: %v", err)
	}
	second, err := env.keeper.AddPendingBundleInstall(env.ctx, &swingsettypes.MsgInstallBundle{Submitter: submitAddr})
	if err != nil {
		t.Fatalf("AddPendingBundleInstall failed: %v", err)
	}

	state := env.keeper.GetState(env.ctx)
	if state.FirstChunkedArtifactId != first {
		t.Fatalf("expected first chunked artifact id %d, got %d", first, state.FirstChunkedArtifactId)
	}
	if state.LastChunkedArtifactId != second {
		t.Fatalf("expected last chunked artifact id %d, got %d", second, state.LastChunkedArtifactId)
	}

	firstNode := env.keeper.GetChunkedArtifactNode(env.ctx, first)
	if firstNode == nil {
		t.Fatalf("expected node for chunked artifact id %d", first)
	}
	secondNode := env.keeper.GetChunkedArtifactNode(env.ctx, second)
	if secondNode == nil {
		t.Fatalf("expected node for chunked artifact id %d", second)
	}
	if firstNode.PrevId != 0 {
		t.Fatalf("expected first node prev id %d, got %d", 0, firstNode.PrevId)
	}
	if firstNode.NextId != second {
		t.Fatalf("expected first node next id %d, got %d", second, firstNode.NextId)
	}
	if secondNode.PrevId != first {
		t.Fatalf("expected second node prev id %d, got %d", first, secondNode.PrevId)
	}
	if secondNode.NextId != 0 {
		t.Fatalf("expected second node next id %d, got %d", 0, secondNode.PrevId)
	}
}

func TestPruneExpiredBundleInstallsClearsLastWhenEmpty(t *testing.T) {
	env := setupKeeperTestEnv(t)

	params := env.keeper.GetParams(env.ctx)
	params.InstallationDeadlineSeconds = 0
	params.InstallationDeadlineBlocks = 0
	env.keeper.SetParams(env.ctx, params)

	chunkedArtifactId, err := env.keeper.AddPendingBundleInstall(env.ctx, &swingsettypes.MsgInstallBundle{Submitter: submitAddr})
	if err != nil {
		t.Fatalf("AddPendingBundleInstall failed: %v", err)
	}

	state := env.keeper.GetState(env.ctx)
	state.FirstChunkedArtifactId = chunkedArtifactId
	state.LastChunkedArtifactId = chunkedArtifactId
	env.keeper.SetState(env.ctx, state)

	if err := env.keeper.PruneExpiredBundleInstalls(env.ctx); err != nil {
		t.Fatalf("PruneExpiredBundleInstalls failed: %v", err)
	}

	state = env.keeper.GetState(env.ctx)
	if state.FirstChunkedArtifactId != 0 {
		t.Fatalf("expected first chunked artifact id to be cleared, got %d", state.FirstChunkedArtifactId)
	}
	if state.LastChunkedArtifactId != 0 {
		t.Fatalf("expected last chunked artifact id to be cleared, got %d", state.LastChunkedArtifactId)
	}
}
