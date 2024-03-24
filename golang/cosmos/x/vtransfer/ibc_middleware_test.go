package vtransfer_test

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"testing"

	app "github.com/Agoric/agoric-sdk/golang/cosmos/app"
	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/cosmos/cosmos-sdk/store"
	"github.com/stretchr/testify/suite"
	"github.com/tendermint/tendermint/libs/log"
	dbm "github.com/tendermint/tm-db"

	swingsettypes "github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vbank"
	vibckeeper "github.com/Agoric/agoric-sdk/golang/cosmos/x/vibc/keeper"

	"github.com/cosmos/cosmos-sdk/baseapp"
	sdk "github.com/cosmos/cosmos-sdk/types"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"
	banktypes "github.com/cosmos/cosmos-sdk/x/bank/types"
	ibctransfertypes "github.com/cosmos/ibc-go/v6/modules/apps/transfer/types"
	channeltypes "github.com/cosmos/ibc-go/v6/modules/core/04-channel/types"
	ibctesting "github.com/cosmos/ibc-go/v6/testing"
	"github.com/cosmos/ibc-go/v6/testing/simapp"
	tmproto "github.com/tendermint/tendermint/proto/tendermint/types"
)

type IntegrationTestSuite struct {
	suite.Suite

	coordinator *ibctesting.Coordinator

	// testing chains used for convenience and readability
	chainA *ibctesting.TestChain
	chainB *ibctesting.TestChain

	queryClient ibctransfertypes.QueryClient
}

// interBlockCacheOpt returns a BaseApp option function that sets the persistent
// inter-block write-through cache.
func interBlockCacheOpt() func(*baseapp.BaseApp) {
	return baseapp.SetInterBlockCache(store.NewCommitKVStoreCacheManager())
}

type TestingAppMaker func() (ibctesting.TestingApp, map[string]json.RawMessage)

func SetupAgoricTestingApp(instance int) TestingAppMaker {
	return func() (ibctesting.TestingApp, map[string]json.RawMessage) {
		db := dbm.NewMemDB()
		encCdc := app.MakeEncodingConfig()
		controller := func(ctx context.Context, needReply bool, str string) (string, error) {
			// fmt.Printf("controller got: %s\n", str)
			// fmt.Fprintln(os.Stderr, "FIXME: Would upcall to controller with", str)
			// FIXME: Unmarshal JSON and reply to the upcall.
			jsonReply := `true`
			return jsonReply, nil
		}
		appd := app.NewAgoricApp(controller, log.TestingLogger(), db, nil, true, map[int64]bool{}, app.DefaultNodeHome, simapp.FlagPeriodValue, encCdc, simapp.EmptyAppOptions{}, interBlockCacheOpt())
		genesisState := app.NewDefaultGenesisState()
		baseSequence := 1000 * (instance + 1)
		genesisState["ibc"] = json.RawMessage(fmt.Sprintf(`
  {
		"channel_genesis": {
			"ack_sequences": [],
			"acknowledgements": [],
			"channels": [],
			"commitments": [],
			"next_channel_sequence": "%d",
			"receipts": [],
			"recv_sequences": [],
			"send_sequences": []
		},
		"client_genesis": {
			"clients": [],
			"clients_consensus": [],
			"clients_metadata": [],
			"create_localhost": false,
			"next_client_sequence": "%d",
			"params": {
				"allowed_clients": [
					"06-solomachine",
					"07-tendermint"
				]
			}
		},
		"connection_genesis": {
			"client_connection_paths": [],
			"connections": [],
			"next_connection_sequence": "%d",
			"params": {
				"max_expected_time_per_block": "30000000000"
			}
		}
	}`, baseSequence+50, baseSequence, baseSequence+10))
		return appd, genesisState
	}
}

func TestKeeperTestSuite(t *testing.T) {
	suite.Run(t, new(IntegrationTestSuite))
}

func (s *IntegrationTestSuite) SetupTest() {
	s.coordinator = ibctesting.NewCoordinator(s.T(), 0)

	chains := make(map[string]*ibctesting.TestChain)
	for i := 0; i < 2; i++ {
		ibctesting.DefaultTestingAppInit = SetupAgoricTestingApp(i)

		// create a chain with the temporary coordinator that we'll later override
		chainID := ibctesting.GetChainID(i)
		chain := ibctesting.NewTestChain(s.T(), ibctesting.NewCoordinator(s.T(), 0), chainID)

		balance := banktypes.Balance{
			Address: chain.SenderAccount.GetAddress().String(),
			Coins:   sdk.NewCoins(sdk.NewCoin(sdk.DefaultBondDenom, sdk.NewInt(100000000000000))),
		}

		// create application and override files in the IBC test chain
		app := ibctesting.SetupWithGenesisValSet(
			s.T(),
			chain.Vals,
			[]authtypes.GenesisAccount{
				chain.SenderAccount.(authtypes.GenesisAccount),
			},
			chainID,
			sdk.DefaultPowerReduction,
			balance,
		)

		chain.App = app
		chain.QueryServer = app.GetIBCKeeper()
		chain.TxConfig = app.GetTxConfig()
		chain.Codec = app.AppCodec()
		chain.CurrentHeader = tmproto.Header{
			ChainID: chainID,
			Height:  1,
			Time:    s.coordinator.CurrentTime.UTC(),
		}

		s.GetApp(chain).TransferKeeper.SetParams(chain.GetContext(), ibctransfertypes.DefaultParams())

		chain.Coordinator = s.coordinator
		s.coordinator.CommitBlock(chain)

		chains[chainID] = chain
	}

	s.coordinator.Chains = chains
	s.chainA = s.coordinator.GetChain(ibctesting.GetChainID(0))
	s.chainB = s.coordinator.GetChain(ibctesting.GetChainID(1))

	agoricApp := s.GetApp(s.chainA)

	queryHelper := baseapp.NewQueryServerTestHelper(s.chainA.GetContext(), agoricApp.InterfaceRegistry())
	ibctransfertypes.RegisterQueryServer(queryHelper, agoricApp.TransferKeeper)
	s.queryClient = ibctransfertypes.NewQueryClient(queryHelper)
}

func (s *IntegrationTestSuite) GetApp(chain *ibctesting.TestChain) *app.GaiaApp {
	app, ok := chain.App.(*app.GaiaApp)
	if !ok {
		panic("not agoric app")
	}

	return app
}

func (s *IntegrationTestSuite) PeekQueue(chain *ibctesting.TestChain, queuePath string) ([]string, error) {
	app := s.GetApp(chain)
	k := app.VstorageKeeper
	ctx := chain.GetContext()
	head, err := k.GetIntValue(ctx, queuePath+".head")
	if err != nil {
		return nil, err
	}
	tail, err := k.GetIntValue(ctx, queuePath+".tail")
	if err != nil {
		return nil, err
	}
	length := tail.Sub(head).Int64()
	values := make([]string, length)
	var i int64
	for i = 0; i < length; i++ {
		path := fmt.Sprintf("%s.%s", queuePath, head.Add(sdk.NewInt(i)).String())
		values[i] = k.GetEntry(ctx, path).StringValue()
	}
	return values, nil
}

func (s *IntegrationTestSuite) NewTransferPath() *ibctesting.Path {
	path := ibctesting.NewPath(s.chainA, s.chainB)
	path.EndpointA.ChannelID = "channel-1050"
	path.EndpointB.ChannelID = "channel-2050"
	path.EndpointA.ChannelConfig.PortID = ibctesting.TransferPort
	path.EndpointB.ChannelConfig.PortID = ibctesting.TransferPort
	path.EndpointA.ChannelConfig.Version = "ics20-1"
	path.EndpointB.ChannelConfig.Version = "ics20-1"

	s.coordinator.Setup(path)

	s.coordinator.CommitBlock(s.chainA, s.chainB)

	return path
}

func (s *IntegrationTestSuite) SetupContract() *ibctesting.Path {
	path := ibctesting.NewPath(s.chainA, s.chainB)
	path.EndpointA.ChannelID = "channel-1050"
	path.EndpointB.ChannelID = "channel-2050"
	path.EndpointA.ChannelConfig.PortID = ibctesting.TransferPort
	path.EndpointB.ChannelConfig.PortID = ibctesting.TransferPort
	path.EndpointA.ChannelConfig.Version = "ics20-1"
	path.EndpointB.ChannelConfig.Version = "ics20-1"

	s.coordinator.Setup(path)

	s.coordinator.CommitBlock(s.chainA, s.chainB)

	return path
}

func (s *IntegrationTestSuite) checkQueue(qvalues []string, expected []swingsettypes.InboundQueueRecord) {
	s.Equal(len(expected), len(qvalues))
	for i, qv := range qvalues {
		if i >= len(expected) {
			break
		}
		var qr swingsettypes.InboundQueueRecord
		err := json.Unmarshal([]byte(qv), &qr)
		s.Require().NoError(err)
		if expected[i].Context.TxHash == "" {
			// Default the TxHash.
			expected[i].Context.TxHash = qr.Context.TxHash
		}

		expi, err := json.Marshal(expected[i])
		s.Require().NoError(err)
		s.Equal(string(expi), qv)
	}
}

func (s *IntegrationTestSuite) TestOnAcknowledgementPacket() {
	path := s.NewTransferPath()
	s.Require().Equal(path.EndpointA.ChannelID, "channel-1050")

	ibctransferAddress := authtypes.NewModuleAddress(ibctransfertypes.ModuleName).String()
	s.Run("OnReceiveTransferToReceiverTarget", func() {
		// create a transfer packet
		transfer := ibctransfertypes.NewFungibleTokenPacketData(
			"uosmo",
			"1000000",
			s.chainA.SenderAccount.GetAddress().String(),
			s.chainB.SenderAccount.GetAddress().String(),
			`"This is a JSON memo"`,
		)

		tokenAmt, ok := sdk.NewIntFromString(transfer.Amount)
		s.Require().True(ok)

		// Whale up.
		amount, err := strconv.ParseInt(transfer.Amount, 10, 64)
		s.Require().NoError(err)
		coins := sdk.NewCoins(sdk.NewCoin(transfer.Denom, tokenAmt.Mul(sdk.NewInt(amount))))
		err = s.GetApp(s.chainA).BankKeeper.MintCoins(s.chainA.GetContext(), ibctransfertypes.ModuleName, coins)
		s.Require().NoError(err)
		err = s.GetApp(s.chainA).BankKeeper.SendCoinsFromModuleToAccount(s.chainA.GetContext(), ibctransfertypes.ModuleName, s.chainA.SenderAccount.GetAddress(), coins)
		s.Require().NoError(err)

		// Ensure we have the coins we need
		balances := s.GetApp(s.chainA).BankKeeper.GetAllBalances(s.chainA.GetContext(), s.chainA.SenderAccount.GetAddress())
		s.Require().Equal(coins[0], balances[1])

		timeoutHeight := s.chainA.GetTimeoutHeight()
		packet := channeltypes.NewPacket(transfer.GetBytes(), 1, path.EndpointA.ChannelConfig.PortID, path.EndpointA.ChannelID, path.EndpointB.ChannelConfig.PortID, path.EndpointB.ChannelID, timeoutHeight, 0)

		module, _, err := s.GetApp(s.chainA).GetIBCKeeper().PortKeeper.LookupModuleByPort(s.chainA.GetContext(), "transfer")
		s.Assert().NoError(err)
		ibcModuleA, ok := s.GetApp(s.chainB).GetIBCKeeper().Router.GetRoute(module)
		s.Assert().True(ok)
		ibcModuleB, ok := s.GetApp(s.chainB).GetIBCKeeper().Router.GetRoute(module)
		s.Assert().True(ok)

		ack := ibcModuleB.OnRecvPacket(s.chainB.GetContext(), packet, s.chainB.SenderAccounts[1].SenderAccount.GetAddress())

		s.coordinator.CommitBlock(s.chainA, s.chainB)
		{
			qvalues, err := s.PeekQueue(s.chainA, "actionQueue")
			s.Require().NoError(err)
			expected := []swingsettypes.InboundQueueRecord{}

			s.checkQueue(qvalues, expected)
		}

		{
			qvalues, err := s.PeekQueue(s.chainB, "actionQueue")
			s.Require().NoError(err)

			ack := channeltypes.NewResultAcknowledgement([]byte(`{"result":"AQ=="}`))
			expected := []swingsettypes.InboundQueueRecord{
				{
					Action: &vibckeeper.WriteAcknowledgementEvent{
						ActionHeader: &vm.ActionHeader{
							Type:        "VTRANSFER_IBC_EVENT",
							BlockHeight: 19,
							BlockTime:   1577923370,
						},
						Event:           "writeAcknowledgement",
						Target:          s.chainB.SenderAccount.GetAddress().String(),
						Packet:          packet,
						Acknowledgement: ack.GetResult(),
					},
					Context: swingsettypes.ActionContext{
						BlockHeight: 19,
						// TxHash is filled in below
						MsgIdx: 0,
					},
				},
				{
					Action: &vbank.VbankBalanceUpdate{
						ActionHeader: &vm.ActionHeader{
							Type:        "VBANK_BALANCE_UPDATE",
							BlockHeight: 19,
							BlockTime:   1577923370,
						},
						Nonce: 1,
						Updated: []vbank.VbankSingleBalanceUpdate{
							{
								Address: ibctransferAddress,
								Denom:   "ibc/606B0C64906F01DE868378A127EAC5C5D243EB4CDA2DE26230B4E42DB4CEC56B",
								Amount:  "0",
							},
						},
					},
					Context: swingsettypes.ActionContext{
						BlockHeight: 19,
						TxHash:      "x/vbank",
						MsgIdx:      0,
					},
				},
			}

			s.checkQueue(qvalues, expected)

			s.coordinator.CommitBlock(s.chainB)

			// write out the acknowledgement verbatim from the transfer app,
			// one block later.
			err = s.GetApp(s.chainB).VtransferKeeper.ReceiveWriteAcknowledgement(s.chainB.GetContext(), packet, ack)
			s.Require().NoError(err)

			s.coordinator.CommitBlock(s.chainB)
		}

		// Update Client
		err = path.EndpointA.UpdateClient()
		s.Require().NoError(err)

		// FIXME: Should this be the way to propagate the acknowledgement?
		// failed to execute message; message index: 0: acknowledge packet verification
		// failed: failed packet acknowledgement verification for client (07-tendermint-0):
		// chained membership proof failed to verify membership of value:
		// 63AEBE4D744BA3766038D6F222B20F7F67ED498CB5AB4C5AF95E7EEF96A62B61 in subroot
		// 4C4CADA3C15E8E4DCFBCE33E49E6F779ACC612543F77C0A6671C3640DC946BE5 at index 0.
		// Please ensure the path and value are both correct.: invalid proof
		err = ibcModuleA.OnAcknowledgementPacket(s.chainA.GetContext(), packet, ack.Acknowledgement(), s.chainB.SenderAccounts[1].SenderAccount.GetAddress())

		// This one fails in the way I would expect:
		// failed to execute message; message index: 0: could not retrieve module from port-id:
		// capabilities/ports/transfer/channels/channel-1050: capability not found
		// err = path.EndpointB.AcknowledgePacket(packet, ack)
		s.Require().NoError(err)

		s.coordinator.CommitBlock(s.chainA, s.chainB)

		{
			qvalues, err := s.PeekQueue(s.chainA, "actionQueue")
			s.Require().NoError(err)
			// FIXME: This should have a queue record for the acknowledgement.
			expected := []swingsettypes.InboundQueueRecord{}

			s.checkQueue(qvalues, expected)
		}
	})
}
