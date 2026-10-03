package vbank

import (
	"testing"

	"cosmossdk.io/log"
	"cosmossdk.io/math"
	"cosmossdk.io/store"
	storemetrics "cosmossdk.io/store/metrics"
	storetypes "cosmossdk.io/store/types"
	"github.com/Agoric/agoric-sdk/golang/cosmos/app/params"
	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	keeperpkg "github.com/Agoric/agoric-sdk/golang/cosmos/x/vbank/keeper"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vbank/types"
	cmtproto "github.com/cometbft/cometbft/proto/tendermint/types"
	dbm "github.com/cosmos/cosmos-db"
	"github.com/cosmos/cosmos-sdk/codec"
	"github.com/cosmos/cosmos-sdk/runtime"
	sdk "github.com/cosmos/cosmos-sdk/types"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"
	govtypes "github.com/cosmos/cosmos-sdk/x/gov/types"
	paramskeeper "github.com/cosmos/cosmos-sdk/x/params/keeper"
	paramstypes "github.com/cosmos/cosmos-sdk/x/params/types"
	"github.com/stretchr/testify/require"
)

const testAuthority = "agoric10d07y265gmmuvt4z0w9aw880jnsr6hcznym2zg"

func TestMsgUpdateParams(t *testing.T) {
	k, ctx := makeTestKit(nil, nil)
	server := keeperpkg.NewMsgServerImpl(k)

	params := types.DefaultParams()
	params.AllowedMonitoringAccounts = []string{"*"}
	_, err := server.UpdateParams(ctx, types.NewMsgUpdateParams(authtypes.NewModuleAddress(govtypes.ModuleName).String(), params))
	require.NoError(t, err)
	require.Equal(t, []string{"*"}, k.GetParams(ctx).AllowedMonitoringAccounts)
}

func TestMsgUpdateParamsRejectsInvalidAuthority(t *testing.T) {
	k, ctx := makeTestKit(nil, nil)
	server := keeperpkg.NewMsgServerImpl(k)

	_, err := server.UpdateParams(ctx, types.NewMsgUpdateParams("agoric1invalid", types.DefaultParams()))
	require.Error(t, err)
}

func TestMsgUpdateParamsRejectsInvalidParams(t *testing.T) {
	k, ctx := makeTestKit(nil, nil)
	server := keeperpkg.NewMsgServerImpl(k)

	params := types.DefaultParams()
	params.PerEpochRewardFraction = math.LegacyNewDec(2)
	_, err := server.UpdateParams(ctx, types.NewMsgUpdateParams(authtypes.NewModuleAddress(govtypes.ModuleName).String(), params))
	require.Error(t, err)
}

func TestMigrateLegacyParams(t *testing.T) {
	encodingConfig := params.MakeEncodingConfig()
	cdc := encodingConfig.Codec
	vbankStoreKey := storetypes.NewKVStoreKey(types.StoreKey)
	paramsStoreKey := storetypes.NewKVStoreKey(paramstypes.StoreKey)
	paramsTStoreKey := storetypes.NewTransientStoreKey(paramstypes.TStoreKey)

	db := dbm.NewMemDB()
	logger := log.NewNopLogger()
	ms := store.NewCommitMultiStore(db, logger, storemetrics.NewNoOpMetrics())
	ms.MountStoreWithDB(vbankStoreKey, storetypes.StoreTypeIAVL, db)
	ms.MountStoreWithDB(paramsStoreKey, storetypes.StoreTypeIAVL, db)
	ms.MountStoreWithDB(paramsTStoreKey, storetypes.StoreTypeTransient, db)
	require.NoError(t, ms.LoadLatestVersion())

	ctx := sdk.NewContext(ms, cmtproto.Header{}, false, logger)
	paramsKeeper := paramskeeper.NewKeeper(cdc, codec.NewLegacyAmino(), paramsStoreKey, paramsTStoreKey)
	paramsSubspace := paramsKeeper.Subspace(types.ModuleName).WithKeyTable(types.ParamKeyTable())

	legacyParams := types.DefaultParams()
	legacyParams.AllowedMonitoringAccounts = []string{"*"}
	paramsSubspace.SetParamSet(ctx, &legacyParams)

	k := NewKeeper(
		cdc,
		runtime.NewKVStoreService(vbankStoreKey),
		runtime.NewTransientStoreService(paramsTStoreKey),
		paramsSubspace,
		&mockAuthKeeper{},
		&mockBank{},
		"feeCollectorName",
		testAuthority,
		func(ctx sdk.Context, action vm.Action) error {
			return nil
		},
	)

	require.NoError(t, keeperpkg.NewMigrator(k).MigrateLegacyParams(ctx))
	require.Equal(t, []string{"*"}, k.GetParams(ctx).AllowedMonitoringAccounts)
}
