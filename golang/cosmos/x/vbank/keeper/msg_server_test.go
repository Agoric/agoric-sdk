package keeper_test

import (
	"context"
	"testing"

	"cosmossdk.io/core/address"
	sdkmath "cosmossdk.io/math"
	storetypes "cosmossdk.io/store/types"
	cmtproto "github.com/cometbft/cometbft/proto/tendermint/types"
	cmttime "github.com/cometbft/cometbft/types/time"
	"github.com/cosmos/cosmos-sdk/codec"
	"github.com/cosmos/cosmos-sdk/runtime"
	"github.com/cosmos/cosmos-sdk/testutil"
	sdk "github.com/cosmos/cosmos-sdk/types"
	moduletestutil "github.com/cosmos/cosmos-sdk/types/module/testutil"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"
	banktypes "github.com/cosmos/cosmos-sdk/x/bank/types"
	paramskeeper "github.com/cosmos/cosmos-sdk/x/params/keeper"
	"github.com/stretchr/testify/suite"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vbank/keeper"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vbank/types"
)

const testAuthority = "cosmos10d07y265gmmuvt4z0w9aw880jnsr700cw3yg84"

type MsgServerTestSuite struct {
	suite.Suite

	msgServer  types.MsgServer
	keeper     keeper.Keeper
	bankKeeper *mockBankKeeper
	ctx        sdk.Context
	encCfg     moduletestutil.TestEncodingConfig
}

type mockBankKeeper struct {
	denomMetadata map[string]banktypes.Metadata
}

func (m *mockBankKeeper) AppendSendRestriction(restriction banktypes.SendRestrictionFn) {}

func (m *mockBankKeeper) BurnCoins(ctx context.Context, moduleName string, amt sdk.Coins) error {
	return nil
}

func (m *mockBankKeeper) GetAllBalances(ctx context.Context, addr sdk.AccAddress) sdk.Coins {
	return sdk.NewCoins()
}

func (m *mockBankKeeper) GetBalance(ctx context.Context, addr sdk.AccAddress, denom string) sdk.Coin {
	return sdk.NewCoin(denom, sdkmath.ZeroInt())
}

func (m *mockBankKeeper) MintCoins(ctx context.Context, moduleName string, amt sdk.Coins) error {
	return nil
}

func (m *mockBankKeeper) SendCoinsFromAccountToModule(ctx context.Context, senderAddr sdk.AccAddress, recipientModule string, amt sdk.Coins) error {
	return nil
}

func (m *mockBankKeeper) SendCoinsFromModuleToAccount(ctx context.Context, senderModule string, recipientAddr sdk.AccAddress, amt sdk.Coins) error {
	return nil
}

func (m *mockBankKeeper) SendCoinsFromModuleToModule(ctx context.Context, senderModule, recipientModule string, amt sdk.Coins) error {
	return nil
}

func (m *mockBankKeeper) SetDenomMetaData(ctx context.Context, denomMetaData banktypes.Metadata) {
	if m.denomMetadata == nil {
		m.denomMetadata = make(map[string]banktypes.Metadata)
	}
	m.denomMetadata[denomMetaData.Base] = denomMetaData
}

type mockAccountKeeper struct{}

func (m *mockAccountKeeper) GetModuleAccount(ctx context.Context, name string) sdk.ModuleAccountI {
	return nil
}

func (m *mockAccountKeeper) GetAccount(ctx context.Context, addr sdk.AccAddress) sdk.AccountI {
	return nil
}

type mockAddressCodec struct{}

func (m mockAddressCodec) StringToBytes(text string) ([]byte, error) {
	return sdk.AccAddressFromBech32(text)
}

func (m mockAddressCodec) BytesToString(bz []byte) (string, error) {
	return sdk.AccAddress(bz).String(), nil
}

func (m *mockAccountKeeper) AddressCodec() address.Codec {
	return mockAddressCodec{}
}

func (suite *MsgServerTestSuite) SetupTest() {
	key := storetypes.NewKVStoreKey(types.StoreKey)
	tkey := storetypes.NewTransientStoreKey(types.TStoreKey)
	testCtx := testutil.DefaultContextWithDB(suite.T(), key, tkey)
	ctx := testCtx.Ctx.WithBlockHeader(cmtproto.Header{Time: cmttime.Now()})
	encCfg := moduletestutil.MakeTestEncodingConfig()

	suite.ctx = ctx
	suite.encCfg = encCfg

	// Create mock keepers
	suite.bankKeeper = &mockBankKeeper{
		denomMetadata: make(map[string]banktypes.Metadata),
	}
	mockAccountKeeper := &mockAccountKeeper{}

	// Initialize params keeper and subspace properly
	paramsKey := storetypes.NewKVStoreKey("params")
	paramsTKey := storetypes.NewTransientStoreKey("transient_params")
	paramsKeeper := paramskeeper.NewKeeper(suite.encCfg.Codec, codec.NewLegacyAmino(), paramsKey, paramsTKey)
	paramsKeeper.Subspace(types.ModuleName)
	paramsSubspace, _ := paramsKeeper.GetSubspace(types.ModuleName)

	pushAction := func(ctx sdk.Context, action vm.Action) error {
		return nil
	}

	suite.keeper = keeper.NewKeeper(
		suite.encCfg.Codec,
		runtime.NewKVStoreService(key),
		runtime.NewTransientStoreService(tkey),
		paramsSubspace,
		mockAccountKeeper,
		suite.bankKeeper,
		authtypes.FeeCollectorName,
		testAuthority,
		pushAction,
	)
	suite.msgServer = keeper.NewMsgServerImpl(suite.keeper)
}

func TestMsgServerTestSuite(t *testing.T) {
	suite.Run(t, new(MsgServerTestSuite))
}

// TestSetDenomMetadata_Success tests successful setting of denom metadata
func (suite *MsgServerTestSuite) TestSetDenomMetadata_Success() {
	// Create a valid metadata message
	msg := &types.MsgSetDenomMetadata{
		Authority: testAuthority,
		Metadata: banktypes.Metadata{
			Description: "USD Coin",
			DenomUnits: []*banktypes.DenomUnit{
				{
					Denom:    "uusdc",
					Exponent: 0,
					Aliases:  []string{},
				},
				{
					Denom:    "usdc",
					Exponent: 6,
					Aliases:  []string{"USDC"},
				},
			},
			Base:    "uusdc",
			Display: "usdc",
			Name:    "USDC",
			Symbol:  "USDC",
			URI:     "https://www.centre.io/usdc",
			URIHash: "abc123",
		},
	}

	// Execute the message
	resp, err := suite.msgServer.SetDenomMetadata(suite.ctx, msg)

	// Verify success
	suite.NoError(err)
	suite.NotNil(resp)

	// Verify metadata was set in the bank keeper
	metadata, exists := suite.bankKeeper.denomMetadata["uusdc"]
	suite.True(exists)
	suite.Equal("USD Coin", metadata.Description)
	suite.Equal("uusdc", metadata.Base)
	suite.Equal("usdc", metadata.Display)
	suite.Equal("USDC", metadata.Name)
	suite.Equal("USDC", metadata.Symbol)
	suite.Equal("https://www.centre.io/usdc", metadata.URI)
	suite.Equal("abc123", metadata.URIHash)
	suite.Len(metadata.DenomUnits, 2)
	suite.Equal("uusdc", metadata.DenomUnits[0].Denom)
	suite.Equal(uint32(0), metadata.DenomUnits[0].Exponent)
	suite.Equal("usdc", metadata.DenomUnits[1].Denom)
	suite.Equal(uint32(6), metadata.DenomUnits[1].Exponent)
}

// TestSetDenomMetadata_InvalidAuthority tests that invalid authority is rejected
func (suite *MsgServerTestSuite) TestSetDenomMetadata_InvalidAuthority() {
	msg := &types.MsgSetDenomMetadata{
		Authority: "cosmos1invalidauthority",
		Metadata: banktypes.Metadata{
			DenomUnits: []*banktypes.DenomUnit{
				{
					Denom:    "utoken",
					Exponent: 0,
				},
			},
			Base: "utoken",
		},
	}

	resp, err := suite.msgServer.SetDenomMetadata(suite.ctx, msg)

	suite.Error(err)
	suite.Nil(resp)
	suite.Contains(err.Error(), "invalid authority")
}

// TestSetDenomMetadata_MissingBaseDenom tests validation of missing base denom
func (suite *MsgServerTestSuite) TestSetDenomMetadata_MissingBaseDenom() {
	msg := &types.MsgSetDenomMetadata{
		Authority: testAuthority,
		Metadata: banktypes.Metadata{
			Name:   "Test Token",
			Symbol: "TEST",
			DenomUnits: []*banktypes.DenomUnit{
				{
					Denom:    "token",
					Exponent: 6,
				},
			},
			Base: "utoken", // Base denom not in denom_units
		},
	}

	resp, err := suite.msgServer.SetDenomMetadata(suite.ctx, msg)

	suite.Error(err)
	suite.Nil(resp)
	// The SDK validates that base must match a denom unit with exponent 0
	suite.Contains(err.Error(), "invalid")
}

// TestSetDenomMetadata_EmptyDenomUnits tests validation of empty denom units
func (suite *MsgServerTestSuite) TestSetDenomMetadata_EmptyDenomUnits() {
	msg := &types.MsgSetDenomMetadata{
		Authority: testAuthority,
		Metadata: banktypes.Metadata{
			Name:       "Test Token",
			Symbol:     "TEST",
			DenomUnits: []*banktypes.DenomUnit{},
			Base:       "utoken",
		},
	}

	resp, err := suite.msgServer.SetDenomMetadata(suite.ctx, msg)

	suite.Error(err)
	suite.Nil(resp)
	// The SDK validates that denom units cannot be empty
	suite.Contains(err.Error(), "invalid")
}

// TestSetDenomMetadata_DuplicateDenomUnits tests validation of duplicate denom units
func (suite *MsgServerTestSuite) TestSetDenomMetadata_DuplicateDenomUnits() {
	msg := &types.MsgSetDenomMetadata{
		Authority: testAuthority,
		Metadata: banktypes.Metadata{
			Name:   "Test Token",
			Symbol: "TEST",
			DenomUnits: []*banktypes.DenomUnit{
				{
					Denom:    "utoken",
					Exponent: 0,
				},
				{
					Denom:    "utoken",
					Exponent: 6,
				},
			},
			Base: "utoken",
		},
	}

	resp, err := suite.msgServer.SetDenomMetadata(suite.ctx, msg)

	suite.Error(err)
	suite.Nil(resp)
	// The SDK validates for duplicate denom units
	suite.Contains(err.Error(), "invalid")
}

// TestSetDenomMetadata_InvalidDisplayDenom tests validation of display denom not in units
func (suite *MsgServerTestSuite) TestSetDenomMetadata_InvalidDisplayDenom() {
	msg := &types.MsgSetDenomMetadata{
		Authority: testAuthority,
		Metadata: banktypes.Metadata{
			Name:   "Test Token",
			Symbol: "TEST",
			DenomUnits: []*banktypes.DenomUnit{
				{
					Denom:    "utoken",
					Exponent: 0,
				},
			},
			Base:    "utoken",
			Display: "token", // Display denom not in denom_units
		},
	}

	resp, err := suite.msgServer.SetDenomMetadata(suite.ctx, msg)

	suite.Error(err)
	suite.Nil(resp)
	// The SDK validates that display must be present in denom units
	suite.Contains(err.Error(), "invalid")
}

// TestSetDenomMetadata_BlankBase tests validation of blank base denom
func (suite *MsgServerTestSuite) TestSetDenomMetadata_BlankBase() {
	msg := &types.MsgSetDenomMetadata{
		Authority: testAuthority,
		Metadata: banktypes.Metadata{
			Name:   "Test Token",
			Symbol: "TEST",
			DenomUnits: []*banktypes.DenomUnit{
				{
					Denom:    "utoken",
					Exponent: 0,
				},
			},
			Base: "", // Blank base
		},
	}

	resp, err := suite.msgServer.SetDenomMetadata(suite.ctx, msg)

	suite.Error(err)
	suite.Nil(resp)
	// The SDK validates that base denom cannot be blank
	suite.Contains(err.Error(), "invalid")
}

// TestSetDenomMetadata_IBCDenom tests setting metadata for an IBC denom
func (suite *MsgServerTestSuite) TestSetDenomMetadata_IBCDenom() {
	ibcDenom := "ibc/FA7775734CC73176B7425910DE001A1D2AD9B6D9E93129A5D0750EAD13E4E63A"

	msg := &types.MsgSetDenomMetadata{
		Authority: testAuthority,
		Metadata: banktypes.Metadata{
			Description: "USDC transferred from Noble",
			DenomUnits: []*banktypes.DenomUnit{
				{
					Denom:    ibcDenom,
					Exponent: 0,
				},
				{
					Denom:    "usdc",
					Exponent: 6,
				},
			},
			Base:    ibcDenom,
			Display: "usdc",
			Name:    "Noble USDC",
			Symbol:  "USDC",
		},
	}

	resp, err := suite.msgServer.SetDenomMetadata(suite.ctx, msg)

	suite.NoError(err)
	suite.NotNil(resp)

	// Verify the metadata was set correctly
	metadata, exists := suite.bankKeeper.denomMetadata[ibcDenom]
	suite.True(exists)
	suite.Equal("USDC transferred from Noble", metadata.Description)
	suite.Equal(ibcDenom, metadata.Base)
	suite.Equal("usdc", metadata.Display)
}

// TestSetDenomMetadata_MultipleAliases tests metadata with multiple aliases
func (suite *MsgServerTestSuite) TestSetDenomMetadata_MultipleAliases() {
	msg := &types.MsgSetDenomMetadata{
		Authority: testAuthority,
		Metadata: banktypes.Metadata{
			DenomUnits: []*banktypes.DenomUnit{
				{
					Denom:    "utoken",
					Exponent: 0,
					Aliases:  []string{"microtoken", "uTOKEN"},
				},
				{
					Denom:    "mtoken",
					Exponent: 3,
					Aliases:  []string{"millitoken"},
				},
				{
					Denom:    "token",
					Exponent: 6,
					Aliases:  []string{"TOKEN", "TKN"},
				},
			},
			Base:    "utoken",
			Display: "token",
			Name:    "Test Token",
			Symbol:  "TKN",
		},
	}

	resp, err := suite.msgServer.SetDenomMetadata(suite.ctx, msg)

	suite.NoError(err)
	suite.NotNil(resp)

	metadata, exists := suite.bankKeeper.denomMetadata["utoken"]
	suite.True(exists)
	suite.Len(metadata.DenomUnits, 3)
	suite.Equal([]string{"microtoken", "uTOKEN"}, metadata.DenomUnits[0].Aliases)
	suite.Equal([]string{"millitoken"}, metadata.DenomUnits[1].Aliases)
	suite.Equal([]string{"TOKEN", "TKN"}, metadata.DenomUnits[2].Aliases)
}
