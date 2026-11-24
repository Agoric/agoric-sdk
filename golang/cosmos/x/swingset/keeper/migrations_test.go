package keeper_test

import (
	"testing"

	"cosmossdk.io/log"
	"cosmossdk.io/store"
	storemetrics "cosmossdk.io/store/metrics"
	storetypes "cosmossdk.io/store/types"
	cmtproto "github.com/cometbft/cometbft/proto/tendermint/types"
	dbm "github.com/cosmos/cosmos-db"
	"github.com/cosmos/cosmos-sdk/codec"
	"github.com/cosmos/cosmos-sdk/runtime"
	sdk "github.com/cosmos/cosmos-sdk/types"
	moduletestutil "github.com/cosmos/cosmos-sdk/types/module/testutil"
	paramskeeper "github.com/cosmos/cosmos-sdk/x/params/keeper"
	"github.com/stretchr/testify/require"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/keeper"
	swingsettypes "github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
	vbanktypes "github.com/Agoric/agoric-sdk/golang/cosmos/x/vbank/types"
)

func TestMigrateLegacyParams(t *testing.T) {
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
	require.NoError(t, ms.LoadLatestVersion())

	ctx := sdk.NewContext(ms, cmtproto.Header{}, false, logger)
	paramsKeeper := paramskeeper.NewKeeper(encCfg.Codec, codec.NewLegacyAmino(), paramsKey, paramsTKey)
	paramsKeeper.Subspace(swingsettypes.ModuleName)
	paramsSubspace, found := paramsKeeper.GetSubspace(swingsettypes.ModuleName)
	require.True(t, found)
	paramsSubspace = paramsSubspace.WithKeyTable(swingsettypes.ParamKeyTable())

	legacyParams := swingsettypes.DefaultParams()
	legacyParams.BootstrapVatConfig = "legacy-bootstrap"
	paramsSubspace.SetParamSet(ctx, &legacyParams)

	k := keeper.NewKeeper(
		encCfg.Codec,
		runtime.NewKVStoreService(key),
		paramsSubspace,
		nil,
		nil,
		nil,
		vbanktypes.ReservePoolName,
		authority,
		func(ctx sdk.Context, jsonRequest string) (string, error) {
			return "", nil
		},
	)

	require.NoError(t, keeper.NewMigrator(k).MigrateLegacyParams(ctx))
	require.Equal(t, "legacy-bootstrap", k.GetParams(ctx).BootstrapVatConfig)
}
