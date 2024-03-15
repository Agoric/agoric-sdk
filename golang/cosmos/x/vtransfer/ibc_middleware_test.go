package vtransfer_test

import (
	"context"
	"encoding/json"
	"fmt"
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

func SetupAgoricTestingApp() (ibctesting.TestingApp, map[string]json.RawMessage) {
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
	gensisState := app.NewDefaultGenesisState()
	return appd, gensisState
}

func TestKeeperTestSuite(t *testing.T) {
	suite.Run(t, new(IntegrationTestSuite))
}

func (s *IntegrationTestSuite) SetupTest() {
	s.coordinator = ibctesting.NewCoordinator(s.T(), 0)

	chains := make(map[string]*ibctesting.TestChain)
	for i := 0; i < 2; i++ {
		ibctesting.DefaultTestingAppInit = SetupAgoricTestingApp

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
	path.EndpointA.ChannelID = "channel-0"
	path.EndpointB.ChannelID = "channel-0"
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
	path.EndpointA.ChannelID = "channel-0"
	path.EndpointB.ChannelID = "channel-0"
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
	s.Require().Equal(path.EndpointA.ChannelID, "channel-0")

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

		// send a transfer packet
		timeoutHeight := s.chainA.GetTimeoutHeight()
		sequence, err := path.EndpointA.SendPacket(timeoutHeight, 0, transfer.GetBytes())
		s.Require().NoError(err)

		// commit the send on chainA
		s.coordinator.CommitBlock(s.chainA)

		// Update Clients
		err = path.EndpointA.UpdateClient()
		s.Require().NoError(err)
		err = path.EndpointB.UpdateClient()
		s.Require().NoError(err)

		// receive the transfer packet
		packet := channeltypes.NewPacket(transfer.GetBytes(), sequence, path.EndpointA.ChannelConfig.PortID, path.EndpointA.ChannelID, path.EndpointB.ChannelConfig.PortID, path.EndpointB.ChannelID, timeoutHeight, 0)
		err = path.EndpointB.RecvPacket(packet)
		s.Require().NoError(err)
		// commit the receive on chainB
		s.coordinator.CommitBlock(s.chainA, s.chainB)

		// Update Clients
		err = path.EndpointA.UpdateClient()
		s.Require().NoError(err)
		err = path.EndpointB.UpdateClient()
		s.Require().NoError(err)
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
							BlockHeight: 21,
							BlockTime:   1577923395,
						},
						Event:  "writeAcknowledgement",
						Target: s.chainB.SenderAccount.GetAddress().String(),
						Packet: channeltypes.Packet{
							Sequence:           1,
							SourcePort:         "transfer",
							SourceChannel:      "channel-0",
							DestinationPort:    "transfer",
							DestinationChannel: "channel-0",
							Data:               transfer.GetBytes(),
							TimeoutHeight:      timeoutHeight,
						},
						Acknowledgement: ack.GetResult(),
					},
					Context: swingsettypes.ActionContext{
						BlockHeight: 21,
						// TxHash is filled in below
						MsgIdx: 0,
					},
				},
				{
					Action: &vbank.VbankBalanceUpdate{
						ActionHeader: &vm.ActionHeader{
							Type:        "VBANK_BALANCE_UPDATE",
							BlockHeight: 21,
							BlockTime:   1577923395,
						},
						Nonce: 1,
						Updated: []vbank.VbankSingleBalanceUpdate{
							{
								Address: ibctransferAddress,
								Denom:   "ibc/ED07A3391A112B175915CD8FAF43A2DA8E4790EDE12566649D0C2F97716B8518",
								Amount:  "0",
							},
						},
					},
					Context: swingsettypes.ActionContext{
						BlockHeight: 21,
						TxHash:      "x/vbank",
						MsgIdx:      0,
					},
				},
			}

			s.checkQueue(qvalues, expected)

			// write out the acknowledgement verbatim from the transfer app.
			s.GetApp(s.chainB).VtransferKeeper.ReceiveWriteAcknowledgement(s.chainB.GetContext(), packet, ack)
		}

		// acknowledge the transfer packet
		ack := s.chainB.GetAcknowledgement(packet)
		s.Require().NotNil(ack)
		err = path.EndpointB.AcknowledgePacket(packet, ack)
		s.Require().NoError(err)

		// commit the receive on chainA
		// Update Clients
		err = path.EndpointA.UpdateClient()
		s.Require().NoError(err)
		err = path.EndpointB.UpdateClient()
		s.Require().NoError(err)
		s.coordinator.CommitBlock(s.chainA, s.chainB)
	})
}
