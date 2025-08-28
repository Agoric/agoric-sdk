package keeper_test

import (
	"github.com/stretchr/testify/suite"
	"go.uber.org/mock/gomock"

	storetypes "cosmossdk.io/store/types"
	cmtproto "github.com/cometbft/cometbft/proto/tendermint/types"
	cmttime "github.com/cometbft/cometbft/types/time"
	"github.com/cosmos/cosmos-sdk/codec"
	paramskeeper "github.com/cosmos/cosmos-sdk/x/params/keeper"

	"github.com/cosmos/cosmos-sdk/runtime"
	"github.com/cosmos/cosmos-sdk/testutil"
	sdk "github.com/cosmos/cosmos-sdk/types"
	moduletestutil "github.com/cosmos/cosmos-sdk/types/module/testutil"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/keeper"
	swingtestutil "github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/testutil"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
	vbanktypes "github.com/Agoric/agoric-sdk/golang/cosmos/x/vbank/types"
)

type KeeperTestSuite struct {
	suite.Suite

	msgServer types.MsgServer
	keeper    keeper.Keeper
	ctx       sdk.Context

	encCfg moduletestutil.TestEncodingConfig
	ctrl   *gomock.Controller
}

const authority = "agoric10d07y265gmmuvt4z0w9aw880jnsr6hcznym2zg"

func (suite *KeeperTestSuite) SetupTest() {
	key := storetypes.NewKVStoreKey(types.StoreKey)
	testCtx := testutil.DefaultContextWithDB(suite.T(), key, storetypes.NewTransientStoreKey("transient_test"))
	ctx := testCtx.Ctx.WithBlockHeader(cmtproto.Header{Time: cmttime.Now()})
	encCfg := moduletestutil.MakeTestEncodingConfig()

	suite.ctx = ctx
	suite.encCfg = encCfg
	suite.ctrl = gomock.NewController(suite.T())

	// Create mock keepers using gomock
	mockAccountKeeper := swingtestutil.NewMockAccountKeeper(suite.ctrl)
	mockBankKeeper := swingtestutil.NewMockBankKeeper(suite.ctrl)
	mockVstorageKeeper := swingtestutil.NewMockVstorageKeeper(suite.ctrl)

	callToController := func(ctx sdk.Context, jsonRequest string) (jsonReply string, err error) {
		return "", nil
	}

	// Initialize params keeper and subspace properly
	paramsKey := storetypes.NewKVStoreKey("params")
	paramsTKey := storetypes.NewTransientStoreKey("transient_params")
	paramsKeeper := paramskeeper.NewKeeper(suite.encCfg.Codec, codec.NewLegacyAmino(), paramsKey, paramsTKey)
	paramsKeeper.Subspace(types.ModuleName)
	paramsSubspace, _ := paramsKeeper.GetSubspace(types.ModuleName)

	suite.keeper = keeper.NewKeeper(
		suite.encCfg.Codec,
		runtime.NewKVStoreService(key),
		paramsSubspace,
		mockAccountKeeper,
		mockBankKeeper,
		mockVstorageKeeper,
		vbanktypes.ReservePoolName,
		authority,
		callToController,
	)
	suite.msgServer = keeper.NewMsgServerImpl(suite.keeper)
}

func (suite *KeeperTestSuite) TearDownTest() {
	suite.ctrl.Finish()
}

// TestCoreEval tests the CoreEval message handler
// Verifies that:
// 1. Authorized CoreEval requests create proper CORE_EVAL actions
// 2. Actions are pushed to the high priority queue with correct
// 3. Eval contains the expected JS code and permits
// 4. Proper metadata
func (suite *KeeperTestSuite) TestCoreEval() {
	suite.SetupTest()
	// Create a mock vstorage keeper that expects a queue push with the correct action
	mockVstorageKeeper := swingtestutil.NewMockVstorageKeeper(suite.ctrl)
	mockVstorageKeeper.EXPECT().
		PushQueueItem(gomock.Any(), gomock.Eq("highPriorityQueue"), gomock.Any()).
		DoAndReturn(func(ctx interface{}, queueName string, actionData string) error {
			// Verify the queue name is correct
			suite.Equal("highPriorityQueue", queueName)

			// Verify the action data contains the expected CoreEval action
			suite.Contains(actionData, `"type":"CORE_EVAL"`)
			suite.Contains(actionData, `"json_permits":"true"`)
			suite.Contains(actionData, `"js_code":"()=\u003e{}"`)

			suite.Contains(actionData, `"context":{"blockHeight":`)
			suite.Contains(actionData, `"txHash":"x/gov"`)
			suite.Contains(actionData, `"msgIdx":0`)

			return nil
		}).
		Times(1)

	// Test successful CoreEval
	msg := &types.MsgCoreEval{
		Authority:   authority,
		JsonPermits: "true",
		JsCode:      `()=>{}`,
	}

	resp, err := suite.msgServer.CoreEval(suite.ctx, msg)
	suite.NoError(err)
	suite.NotNil(resp)
	suite.Empty(resp.Result)
}
