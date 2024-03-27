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
			// fmt.Printf("controller %d got: %s\n", instance, str)
			// fmt.Fprintln(os.Stderr, "FIXME: Would upcall to controller with", str)
			// FIXME: Unmarshal JSON and reply to the upcall.
			jsonReply := `true`
			return jsonReply, nil
		}
		appd := app.NewAgoricApp(controller, vm.NewAgdServer(), log.TestingLogger(), db, nil,
			true, map[int64]bool{}, app.DefaultNodeHome, simapp.FlagPeriodValue, encCdc, simapp.EmptyAppOptions{}, interBlockCacheOpt())
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
	exLen := len(expected)
	qvLen := len(qvalues)
	maxLen := exLen
	if qvLen > maxLen {
		maxLen = qvLen
	}
	for i := 0; i < maxLen; i++ {
		var qr swingsettypes.InboundQueueRecord
		if i >= qvLen {
			s.Fail("unexpected record", "%d: %v", i, expected[i])
			continue
		} else if i >= exLen {
			s.Fail("expected record", "%d: %v", i, qvalues[i])
			continue
		}
		err := json.Unmarshal([]byte(qvalues[i]), &qr)
		s.Require().NoError(err)
		if expected[i].Context.TxHash == "" {
			// Default the TxHash.
			expected[i].Context.TxHash = qr.Context.TxHash
		}

		expi, err := json.Marshal(expected[i])
		s.Require().NoError(err)
		s.Equal(string(expi), qvalues[i])
	}
}

func (s *IntegrationTestSuite) RegisterTarget(chain *ibctesting.TestChain, target string) {
	agdServer := s.GetApp(chain).AgdServer
	defer agdServer.SetControllerContext(chain.GetContext())()
	var reply string
	err := agdServer.ReceiveMessage(
		&vm.Message{
			Port: agdServer.GetPort("vtransfer"),
			Data: `{"type":"BRIDGE_TARGET_REGISTER","target":"` + target + `"}`,
		},
		&reply,
	)
	s.Require().NoError(err)
	s.Require().Equal(reply, "true")
}

func (s *IntegrationTestSuite) TestOnAcknowledgementPacket() {
	path := s.NewTransferPath()
	s.Require().Equal(path.EndpointA.ChannelID, "channel-1050")

	s.Run("OnReceiveTransferToReceiverTarget", func() {
		// create a transfer packet
		transfer := ibctransfertypes.NewFungibleTokenPacketData(
			"uosmo",
			"1000000",
			s.chainA.SenderAccount.GetAddress().String(),
			s.chainB.SenderAccounts[1].SenderAccount.GetAddress().String(),
			`"This is a JSON memo"`,
		)

		// Register the sender and receiver as targets.
		s.RegisterTarget(s.chainA, transfer.Sender)
		s.RegisterTarget(s.chainB, transfer.Receiver)

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
		packet := channeltypes.NewPacket(transfer.GetBytes(), 0, path.EndpointA.ChannelConfig.PortID, path.EndpointA.ChannelID, path.EndpointB.ChannelConfig.PortID, path.EndpointB.ChannelID, timeoutHeight, 0)

		// send a transfer packet from the VM
		imt := ibctransfertypes.MsgTransfer{
			SourcePort:       packet.SourcePort,
			SourceChannel:    packet.SourceChannel,
			Memo:             transfer.Memo,
			Token:            sdk.NewCoin(transfer.Denom, tokenAmt),
			Sender:           transfer.Sender,
			Receiver:         transfer.Receiver,
			TimeoutHeight:    packet.TimeoutHeight,
			TimeoutTimestamp: packet.TimeoutTimestamp,
		}
		imr, err := s.GetApp(s.chainA).TransferKeeper.Transfer(s.chainA.GetContext(), &imt)
		s.Require().NoError(err)
		packet.Sequence = imr.Sequence

		// Send the packet
		s.coordinator.CommitBlock(s.chainA)
		err = path.EndpointB.UpdateClient()
		s.Require().NoError(err)
		s.coordinator.CommitBlock(s.chainB)

		err = path.EndpointB.RecvPacket(packet)
		s.Require().NoError(err)

		// Create success ack
		ack := channeltypes.NewResultAcknowledgement([]byte{1})
		contractAck := channeltypes.NewResultAcknowledgement([]byte{5})

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

			expected := []swingsettypes.InboundQueueRecord{
				{
					Action: &vibckeeper.WriteAcknowledgementEvent{
						ActionHeader: &vm.ActionHeader{
							Type:        "VTRANSFER_IBC_EVENT",
							BlockHeight: 20,
							BlockTime:   1577923375,
						},
						Event:           "writeAcknowledgement",
						Target:          transfer.Receiver,
						Packet:          packet,
						Acknowledgement: ack.Acknowledgement(),
					},
					Context: swingsettypes.ActionContext{
						BlockHeight: 20,
						// TxHash is filled in below
						MsgIdx: 0,
					},
				},
				{
					Action: &vbank.VbankBalanceUpdate{
						ActionHeader: &vm.ActionHeader{
							Type:        "VBANK_BALANCE_UPDATE",
							BlockHeight: 20,
							BlockTime:   1577923375,
						},
						Nonce: 1,
						Updated: []vbank.VbankSingleBalanceUpdate{
							{
								Address: "cosmos1yl6hdjhmkf37639730gffanpzndzdpmhwlkfhr",
								Denom:   "ibc/606B0C64906F01DE868378A127EAC5C5D243EB4CDA2DE26230B4E42DB4CEC56B",
								Amount:  "0",
							},
						},
					},
					Context: swingsettypes.ActionContext{
						BlockHeight: 20,
						// TxHash is filled in below
						MsgIdx: 0,
					},
				},
			}

			s.checkQueue(qvalues, expected)

			// write out a different acknowledgement from the "contract", one block later.
			s.coordinator.CommitBlock(s.chainB)
			err = s.GetApp(s.chainB).VtransferKeeper.ReceiveWriteAcknowledgement(s.chainB.GetContext(), packet, contractAck)
			s.Require().NoError(err)

			s.coordinator.CommitBlock(s.chainB)
		}

		// Update Client
		err = path.EndpointA.UpdateClient()
		s.Require().NoError(err)

		// Prove the packet's acknowledgement.
		err = path.EndpointA.AcknowledgePacket(packet, contractAck.Acknowledgement())
		s.Require().NoError(err)

		s.coordinator.CommitBlock(s.chainA, s.chainB)

		{
			qvalues, err := s.PeekQueue(s.chainA, "actionQueue")
			s.Require().NoError(err)
			expected := []swingsettypes.InboundQueueRecord{
				{
					Action: &vibckeeper.WriteAcknowledgementEvent{
						ActionHeader: &vm.ActionHeader{
							Type:        "VTRANSFER_IBC_EVENT",
							BlockHeight: 23,
							BlockTime:   1577923415,
						},
						Event:           "acknowledgementPacket",
						Target:          transfer.Sender,
						Packet:          packet,
						Acknowledgement: contractAck.Acknowledgement(),
						Relayer:         s.chainA.SenderAccount.GetAddress(),
					},
					Context: swingsettypes.ActionContext{
						BlockHeight: 23,
						// TxHash is filled in below
						MsgIdx: 0,
					},
				},
			}

			s.checkQueue(qvalues, expected)
		}
	})
}
