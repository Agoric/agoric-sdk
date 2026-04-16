package keeper_test

import (
	"bytes"
	"compress/gzip"
	"crypto/sha512"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/stretchr/testify/suite"
	"go.uber.org/mock/gomock"

	"cosmossdk.io/log"
	"cosmossdk.io/store"
	storemetrics "cosmossdk.io/store/metrics"
	storetypes "cosmossdk.io/store/types"
	cmtproto "github.com/cometbft/cometbft/proto/tendermint/types"
	cmttime "github.com/cometbft/cometbft/types/time"
	dbm "github.com/cosmos/cosmos-db"
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

var (
	submitAddr = sdk.AccAddress([]byte("submitter"))
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
// TODO: Fix this test https://github.com/Agoric/agoric-sdk/issues/12243
func (suite *KeeperTestSuite) SkipFailingTestCoreEval() {
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

func TestMsgServer(t *testing.T) {
	suite.Run(t, new(KeeperTestSuite))
}

// testMsgServerEnv holds the test environment for message server tests
type testMsgServerEnv struct {
	ctx       sdk.Context
	msgServer types.MsgServer
	ctrl      *gomock.Controller
}

// setupMsgServerTest creates a test environment with a configured keeper and message server.
// If expectPushQueueItem is true, the mock vstorage keeper will expect a PushQueueItem call.
func setupMsgServerTest(t *testing.T, expectPushQueueItem bool) *testMsgServerEnv {
	t.Helper()

	// Create mock controller
	ctrl := gomock.NewController(t)

	// Create mock keepers
	mockAccountKeeper := swingtestutil.NewMockAccountKeeper(ctrl)
	mockBankKeeper := swingtestutil.NewMockBankKeeper(ctrl)
	mockVstorageKeeper := swingtestutil.NewMockVstorageKeeper(ctrl)

	// Set up expectations if needed
	if expectPushQueueItem {
		mockVstorageKeeper.EXPECT().
			PushQueueItem(gomock.Any(), gomock.Eq("actionQueue"), gomock.Any()).
			Return(nil).
			Times(1)
	}

	// Create keeper with stores
	encCfg := moduletestutil.MakeTestEncodingConfig()
	key := storetypes.NewKVStoreKey(types.StoreKey)
	paramsKey := storetypes.NewKVStoreKey("params")
	paramsTKey := storetypes.NewTransientStoreKey("transient_params")

	db := dbm.NewMemDB()
	logger := log.NewNopLogger()
	ms := store.NewCommitMultiStore(db, logger, storemetrics.NewNoOpMetrics())
	ms.MountStoreWithDB(key, storetypes.StoreTypeIAVL, db)
	ms.MountStoreWithDB(paramsKey, storetypes.StoreTypeIAVL, db)
	ms.MountStoreWithDB(paramsTKey, storetypes.StoreTypeTransient, db)
	err := ms.LoadLatestVersion()
	if err != nil {
		t.Fatalf("Failed to load multi-store: %v", err)
	}

	ctx := sdk.NewContext(ms, cmtproto.Header{Time: cmttime.Now()}, false, logger)

	callToController := func(ctx sdk.Context, jsonRequest string) (jsonReply string, err error) {
		return "", nil
	}

	paramsKeeper := paramskeeper.NewKeeper(encCfg.Codec, codec.NewLegacyAmino(), paramsKey, paramsTKey)
	paramsKeeper.Subspace(types.ModuleName)
	paramsSubspace, _ := paramsKeeper.GetSubspace(types.ModuleName)

	testKeeper := keeper.NewKeeper(
		encCfg.Codec,
		runtime.NewKVStoreService(key),
		paramsSubspace,
		mockAccountKeeper,
		mockBankKeeper,
		mockVstorageKeeper,
		vbanktypes.ReservePoolName,
		authority,
		callToController,
	)
	testKeeper.SetParams(ctx, types.DefaultParams())

	return &testMsgServerEnv{
		ctx:       ctx,
		msgServer: keeper.NewMsgServerImpl(testKeeper),
		ctrl:      ctrl,
	}
}

func TestInstallBundle(t *testing.T) {
	env := setupMsgServerTest(t, true)
	defer env.ctrl.Finish()

	// Create a valid gzip-compressed bundle
	bundleData := `{"moduleFormat":"endoZipBase64","endoZipBase64":"test"}`
	var buf bytes.Buffer
	gzipWriter := gzip.NewWriter(&buf)
	_, err := gzipWriter.Write([]byte(bundleData))
	if err != nil {
		t.Fatalf("Failed to write gzip data: %v", err)
	}
	err = gzipWriter.Close()
	if err != nil {
		t.Fatalf("Failed to close gzip writer: %v", err)
	}

	// Test with bundle size matching actual data
	msg := &types.MsgInstallBundle{
		Submitter:        submitAddr,
		CompressedBundle: buf.Bytes(),
		UncompressedSize: int64(len(bundleData)),
	}
	resp, err := env.msgServer.InstallBundle(env.ctx, msg)
	if err != nil {
		t.Fatalf("InstallBundle failed: %v", err)
	}
	if resp == nil {
		t.Fatal("Expected non-nil response")
	}
}

func TestInstallBundleJustUnderSizeLimit(t *testing.T) {
	env := setupMsgServerTest(t, false)
	defer env.ctrl.Finish()

	// Create minimal gzip data
	var buf bytes.Buffer
	gzipWriter := gzip.NewWriter(&buf)
	if err := gzipWriter.Close(); err != nil {
		t.Fatalf("Failed to close gzip writer: %v", err)
	}

	msg := &types.MsgInstallBundle{
		Submitter:        submitAddr,
		UncompressedSize: int64(types.DefaultBundleUncompressedSizeLimitBytes) - 1,
		CompressedBundle: buf.Bytes(),
	}

	// Bundle just under the limit should pass size validation (but fail on decompression)
	_, err := env.msgServer.InstallBundle(env.ctx, msg)
	if err == nil {
		t.Fatal("Expected error for mismatched uncompressed size")
	}
	if strings.Contains(err.Error(), "Uncompressed size out of range") {
		t.Errorf("Should not fail on size validation just under the limit, got: %v", err)
	}
}

func TestInstallBundleAtSizeLimit(t *testing.T) {
	env := setupMsgServerTest(t, false)
	defer env.ctrl.Finish()

	// Create minimal gzip data
	var buf bytes.Buffer
	gzipWriter := gzip.NewWriter(&buf)
	if err := gzipWriter.Close(); err != nil {
		t.Fatalf("Failed to close gzip writer: %v", err)
	}

	msg := &types.MsgInstallBundle{
		Submitter:        submitAddr,
		UncompressedSize: int64(types.DefaultBundleUncompressedSizeLimitBytes),
		CompressedBundle: buf.Bytes(),
	}

	// With exclusive limit, a bundle at exactly the limit should be rejected
	_, err := env.msgServer.InstallBundle(env.ctx, msg)
	if err == nil {
		t.Fatal("Bundle at the limit should fail validation (exclusive limit)")
	}
	if !strings.Contains(err.Error(), "Uncompressed size out of range") {
		t.Errorf("Expected 'Uncompressed size out of range' error, got: %v", err)
	}
}

func TestInstallBundleChunkCountAtLimit(t *testing.T) {
	env := setupMsgServerTest(t, false)
	defer env.ctrl.Finish()

	params := types.DefaultParams()
	chunkIndexLimit := types.MaxArtifactChunksCount(
		params.BundleUncompressedSizeLimitBytes,
		params.ChunkSizeLimitBytes,
	)
	chunkedArtifact := makeChunkedArtifact(t, chunkIndexLimit)

	msg := &types.MsgInstallBundle{
		Submitter:       submitAddr,
		ChunkedArtifact: chunkedArtifact,
	}

	_, err := env.msgServer.InstallBundle(env.ctx, msg)
	if err != nil {
		t.Fatalf("bundle with max chunk count should be accepted, got %v", err)
	}
}

func TestInstallBundleChunkCountOverLimit(t *testing.T) {
	env := setupMsgServerTest(t, false)
	defer env.ctrl.Finish()

	params := types.DefaultParams()
	chunkIndexLimit := types.MaxArtifactChunksCount(
		params.BundleUncompressedSizeLimitBytes,
		params.ChunkSizeLimitBytes,
	)
	chunkedArtifact := makeChunkedArtifact(t, chunkIndexLimit+1)

	msg := &types.MsgInstallBundle{
		Submitter:       submitAddr,
		ChunkedArtifact: chunkedArtifact,
	}

	_, err := env.msgServer.InstallBundle(env.ctx, msg)
	if err == nil {
		t.Fatal("expected error for bundle with too many chunks")
	}
	if !strings.Contains(err.Error(), "Number of bundle chunks must be less than") {
		t.Fatalf("unexpected error for chunk count over limit: %v", err)
	}
}

func TestSendChunkUsesWrappedContext(t *testing.T) {
	env := setupMsgServerTest(t, false)
	defer env.ctrl.Finish()

	chunkData := make([]byte, int(types.DefaultChunkSizeLimitBytes)+1)
	msg := &types.MsgSendChunk{
		ChunkedArtifactId: 1,
		Submitter:         submitAddr,
		ChunkIndex:        0,
		ChunkData:         chunkData,
	}

	require.NotPanics(t, func() {
		_, err := env.msgServer.SendChunk(env.ctx, msg)
		require.Error(t, err)
		require.Contains(t, err.Error(), "Chunk size must be at most")
	})
}

func TestInstallBundleOverSizeLimit(t *testing.T) {
	env := setupMsgServerTest(t, false)
	defer env.ctrl.Finish()

	// Create minimal gzip data
	var buf bytes.Buffer
	gzipWriter := gzip.NewWriter(&buf)
	if err := gzipWriter.Close(); err != nil {
		t.Fatalf("Failed to close gzip writer: %v", err)
	}

	msg := &types.MsgInstallBundle{
		Submitter:        submitAddr,
		UncompressedSize: int64(types.DefaultBundleUncompressedSizeLimitBytes) + 1,
		CompressedBundle: buf.Bytes(),
	}

	// This should fail during size validation
	_, err := env.msgServer.InstallBundle(env.ctx, msg)
	if err == nil {
		t.Fatal("Bundle over the limit should fail validation")
	}
	if !strings.Contains(err.Error(), "Uncompressed size out of range") {
		t.Errorf("Expected 'Uncompressed size out of range' error, got: %v", err)
	}
}

func makeChunkedArtifact(t *testing.T, chunkCount int64) *types.ChunkedArtifact {
	t.Helper()
	if chunkCount <= 0 {
		t.Fatalf("chunkCount must be positive, got %d", chunkCount)
	}

	hash := strings.Repeat("0", sha512.Size*2)
	chunks := make([]*types.ChunkInfo, int(chunkCount))
	for i := range chunks {
		chunks[i] = &types.ChunkInfo{
			SizeBytes: 1,
			Sha512:    hash,
		}
	}

	return &types.ChunkedArtifact{
		Sha512:    hash,
		SizeBytes: uint64(chunkCount),
		Chunks:    chunks,
	}
}
