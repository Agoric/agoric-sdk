package vbank_test

import (
	"cosmossdk.io/math"
	"github.com/stretchr/testify/suite"

	"github.com/cometbft/cometbft/crypto/secp256k1"
	"github.com/cosmos/cosmos-sdk/testutil/network"
	sdk "github.com/cosmos/cosmos-sdk/types"
	banktypes "github.com/cosmos/cosmos-sdk/x/bank/types"
)

// Generate test accounts using secp256k1 keys
var (
	priv1 = secp256k1.GenPrivKey()
	priv2 = secp256k1.GenPrivKey()
	addr1 = sdk.AccAddress(priv1.PubKey().Address()).String()
	addr2 = sdk.AccAddress(priv2.PubKey().Address()).String()
)

type E2ETestSuite struct {
	suite.Suite
	cfg     network.Config
	network *network.Network
}

func NewE2ETestSuite(cfg network.Config) *E2ETestSuite {
	return &E2ETestSuite{cfg: cfg}
}

func (s *E2ETestSuite) SetupSuite() {
	s.T().Log("setting up e2e test suite")

	genesisState := s.cfg.GenesisState
	bankGenesis := banktypes.DefaultGenesisState()

	bankGenesis.DenomMetadata = []banktypes.Metadata{
		{
			Name:        "Agoric",
			Symbol:      "BLD",
			Description: "AgorickToken",
			DenomUnits: []*banktypes.DenomUnit{
				{
					Denom:    "ulbd",
					Exponent: 0,
					Aliases:  []string{"microlbd"},
				},
				{
					Denom:    "lbd",
					Exponent: 6,
					Aliases:  []string{"LBD"},
				},
			},
			Base:    "ulbd",
			Display: "lbd",
		},
	}

	// Add two accounts with 10000 lbd each (10000 * 10^6 ulbd = 10000000000 ulbd)
	// Using generated addresses from testutil
	bankGenesis.Balances = []banktypes.Balance{
		{
			Address: addr1,
			Coins: sdk.NewCoins(
				sdk.NewCoin("ulbd", math.NewInt(10000000000)), // 10000 lbd
			),
		},
		{
			Address: addr2,
			Coins: sdk.NewCoins(
				sdk.NewCoin("ulbd", math.NewInt(10000000000)), // 10000 lbd
			),
		},
	}

	genesisState[banktypes.ModuleName] = s.cfg.Codec.MustMarshalJSON(bankGenesis)
	s.cfg.GenesisState = genesisState

	var err error
	s.network, err = network.New(s.T(), s.T().TempDir(), s.cfg)
	s.Require().NoError(err)

	_, err = s.network.WaitForHeight(1)
	s.Require().NoError(err)
}

func (s *E2ETestSuite) TearDownSuite() {
	s.T().Log("tearing down e2e test suite")
	s.network.Cleanup()
}

func (s *E2ETestSuite) TestSendTokens() {
	s.T().Log("testing token transfer")

	val := s.network.Validators[0]
	ctx := val.ClientCtx

	// Generate a new recipient account
	recipientPriv := secp256k1.GenPrivKey()
	recipientAddr := sdk.AccAddress(recipientPriv.PubKey().Address())

	// Get the app instance for direct keeper access
	app := val.ClientCtx.InterfaceRegistry
	s.Require().NotNil(app)

	// Create a send message for 1000 lbd (1000000000 ulbd)
	sendAmount := sdk.NewCoins(sdk.NewCoin("ulbd", math.NewInt(1000000000))) // 1000 lbd

	msgSend := &banktypes.MsgSend{
		FromAddress: addr1,
		ToAddress:   recipientAddr.String(),
		Amount:      sendAmount,
	}

	s.T().Logf("Sending %s from %s to %s", sendAmount, addr1, recipientAddr.String())

	// Create and broadcast the transaction
	txBuilder := ctx.TxConfig.NewTxBuilder()
	err := txBuilder.SetMsgs(msgSend)
	s.Require().NoError(err)

	// Set gas and fees
	txBuilder.SetGasLimit(200000)
	fees := sdk.NewCoins(sdk.NewCoin("ulbd", math.NewInt(100000))) // Fee in ulbd
	txBuilder.SetFeeAmount(fees)

	// For this test, we'll broadcast using the validator's address as a proxy
	// In a real scenario, we'd sign with the actual sender's private key
	txBuilder.SetFeeGranter(val.Address)

	// Build and encode the transaction
	txBytes, err := ctx.TxConfig.TxEncoder()(txBuilder.GetTx())
	s.Require().NoError(err)
	s.Require().NotNil(txBytes)

	s.T().Logf("Transaction created successfully with size: %d bytes", len(txBytes))

	// Broadcast the transaction
	res, err := ctx.BroadcastTx(txBytes)
	s.Require().NoError(err)
	s.T().Logf("Transaction broadcast result: %+v", res)

	// Wait for the transaction to be processed
	s.Require().NoError(s.network.WaitForNextBlock())

	// Query the recipient's balance to verify they received the tokens
	queryClient := banktypes.NewQueryClient(ctx)
	balanceReq := &banktypes.QueryAllBalancesRequest{
		Address: recipientAddr.String(),
	}

	balanceResp, err := queryClient.AllBalances(val.ClientCtx.CmdContext, balanceReq)
	s.Require().NoError(err)

	// Verify the recipient received exactly 1000 lbd (1000000000 ulbd)
	expectedAmount := math.NewInt(1000000000)
	found := false
	actualBalance := math.ZeroInt()

	for _, coin := range balanceResp.Balances {
		if coin.Denom == "ulbd" {
			actualBalance = coin.Amount
			if coin.Amount.Equal(expectedAmount) {
				found = true
			}
			break
		}
	}

	s.Require().True(found, "Recipient should have received exactly 1000 lbd (1000000000 ulbd), but got %s ulbd", actualBalance.String())

}
