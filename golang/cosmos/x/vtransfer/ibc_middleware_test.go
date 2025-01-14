package vtransfer_test

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"testing"
	"text/template"

	app "github.com/Agoric/agoric-sdk/golang/cosmos/app"
	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/cosmos/cosmos-sdk/store"
	"github.com/cosmos/cosmos-sdk/testutil/testdata"
	"github.com/stretchr/testify/suite"
	"github.com/tendermint/tendermint/libs/log"
	dbm "github.com/tendermint/tm-db"

	"github.com/Agoric/agoric-sdk/golang/cosmos/types"
	swingsettesting "github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/testing"
	swingsettypes "github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
	vibckeeper "github.com/Agoric/agoric-sdk/golang/cosmos/x/vibc/keeper"

	"github.com/cosmos/cosmos-sdk/baseapp"
	sdk "github.com/cosmos/cosmos-sdk/types"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"
	banktypes "github.com/cosmos/cosmos-sdk/x/bank/types"
	packetforwardkeeper "github.com/cosmos/ibc-apps/middleware/packet-forward-middleware/v6/packetforward/keeper"
	packetforwardtypes "github.com/cosmos/ibc-apps/middleware/packet-forward-middleware/v6/packetforward/types"
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

	channelOffset int

	queryClient ibctransfertypes.QueryClient
}

// interBlockCacheOpt returns a BaseApp option function that sets the persistent
// inter-block write-through cache.
func interBlockCacheOpt() func(*baseapp.BaseApp) {
	return baseapp.SetInterBlockCache(store.NewCommitKVStoreCacheManager())
}

type TestingAppMaker func() (ibctesting.TestingApp, map[string]json.RawMessage)

// Each instance has unique IBC genesis state with deterministic
// client/connection/channel initial sequence numbers
// (respectively, X000/X010/X050 where X is the zero-based
// instance number plus one, such that instance 0 uses
// 1000/1010/1050, instance 1 uses 2000/2010/2050, etc.).
func computeSequences(instance int) (clientSeq, connectionSeq, channelSeq int) {
	baseSequence := 1000 * (instance + 1)
	return baseSequence, baseSequence + 10, baseSequence + 50
}

func SetupAgoricTestingApp(instance int) TestingAppMaker {
	return func() (ibctesting.TestingApp, map[string]json.RawMessage) {
		db := dbm.NewMemDB()
		encCdc := app.MakeEncodingConfig()
		mockController := func(ctx context.Context, needReply bool, jsonRequest string) (jsonReply string, err error) {
			// fmt.Printf("controller %d got: %s\n", instance, jsonRequest)

			// Check that the message is at least JSON.
			var jsonAny interface{}
			if err := json.Unmarshal([]byte(jsonRequest), &jsonAny); err != nil {
				panic(err)
			}

			// Our reply must be truthy or else we don't make it past AG_COSMOS_INIT.
			jsonReply = `true`
			return jsonReply, nil
		}
		appd := app.NewAgoricApp(mockController, vm.NewAgdServer(), log.TestingLogger(), db, nil,
			true, map[int64]bool{}, app.DefaultNodeHome, simapp.FlagPeriodValue, encCdc, simapp.EmptyAppOptions{}, interBlockCacheOpt())
		genesisState := app.NewDefaultGenesisState()

		t := template.Must(template.New("").Parse(`
		{
				"client_genesis": {
						"clients": [],
						"clients_consensus": [],
						"clients_metadata": [],
						"create_localhost": false,
						"next_client_sequence": "{{.nextClientSequence}}",
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
						"next_connection_sequence": "{{.nextConnectionSequence}}",
						"params": {
								"max_expected_time_per_block": "30000000000"
						}
				},
				"channel_genesis": {
						"ack_sequences": [],
						"acknowledgements": [],
						"channels": [],
						"commitments": [],
						"next_channel_sequence": "{{.nextChannelSequence}}",
						"receipts": [],
						"recv_sequences": [],
						"send_sequences": []
				}
		}`))
		var result strings.Builder
		clientSeq, connectionSeq, channelSeq := computeSequences(instance)
		err := t.Execute(&result, map[string]any{
			"nextClientSequence":     clientSeq,
			"nextConnectionSequence": connectionSeq,
			"nextChannelSequence":    channelSeq,
		})
		if err != nil {
			panic(err)
		}
		genesisState["ibc"] = json.RawMessage(result.String())
		return appd, genesisState
	}
}

func TestKeeperTestSuite(t *testing.T) {
	suite.Run(t, new(IntegrationTestSuite))
}

// SetupTest initializes an IntegrationTestSuite with two similar chains, a
// shared coordinator, and a query client that happens to point at chainA.
func (s *IntegrationTestSuite) SetupTest() {
	s.coordinator = ibctesting.NewCoordinator(s.T(), 0)

	chains := make(map[string]*ibctesting.TestChain)
	for i := 0; i < 2; i++ {
		ibctesting.DefaultTestingAppInit = SetupAgoricTestingApp(i)

		chainID := ibctesting.GetChainID(i)
		chain := ibctesting.NewTestChain(s.T(), s.coordinator, chainID)

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

func (s *IntegrationTestSuite) NewTransferPath() *ibctesting.Path {
	chOffset := s.channelOffset
	s.channelOffset += 1
	path := ibctesting.NewPath(s.chainA, s.chainB)
	channelAClient, channelAConnection, channelASeq := computeSequences(0)
	channelBClient, channelBConnection, channelBSeq := computeSequences(1)
	path.EndpointA.ChannelID = fmt.Sprintf("channel-%d", channelASeq+chOffset)
	path.EndpointB.ChannelID = fmt.Sprintf("channel-%d", channelBSeq+chOffset)
	path.EndpointA.ChannelConfig.PortID = ibctesting.TransferPort
	path.EndpointB.ChannelConfig.PortID = ibctesting.TransferPort
	path.EndpointA.ChannelConfig.Version = "ics20-1"
	path.EndpointB.ChannelConfig.Version = "ics20-1"

	if chOffset == 0 {
		s.coordinator.SetupConnections(path)
	} else {
		path.EndpointA.ClientID = fmt.Sprintf("07-tendermint-%d", channelAClient)
		path.EndpointA.ConnectionID = fmt.Sprintf("connection-%d", channelAConnection)
		path.EndpointB.ClientID = fmt.Sprintf("07-tendermint-%d", channelBClient)
		path.EndpointB.ConnectionID = fmt.Sprintf("connection-%d", channelBConnection)
	}
	s.coordinator.CreateChannels(path)

	s.coordinator.CommitBlock(s.chainA, s.chainB)

	return path
}

func (s *IntegrationTestSuite) resetActionQueue(chain *ibctesting.TestChain) {
	err := swingsettesting.ResetActionQueue(s.T(), chain.GetContext(), s.GetApp(chain).SwingSetKeeper)
	s.Require().NoError(err)
}

func (s *IntegrationTestSuite) assertActionQueue(chain *ibctesting.TestChain, expectedRecords []swingsettypes.InboundQueueRecord) {
	actualRecords, err := swingsettesting.GetActionQueueRecords(
		s.T(),
		chain.GetContext(),
		s.GetApp(chain).SwingSetKeeper,
	)
	s.resetActionQueue(chain)
	s.Require().NoError(err)

	exLen := len(expectedRecords)
	recLen := len(actualRecords)
	maxLen := exLen
	if recLen > maxLen {
		maxLen = recLen
	}
	for i := 0; i < maxLen; i++ {
		if i >= recLen {
			s.Fail("expected record", "%d: %q", i, expectedRecords[i])
			continue
		} else if i >= exLen {
			s.Fail("unexpected record", "%d: %v", i, actualRecords[i])
			continue
		}
		expi := expectedRecords[i]
		var reci swingsettypes.InboundQueueRecord
		err := json.Unmarshal([]byte(actualRecords[i]), &reci)
		s.Require().NoError(err)

		if expi.Context.TxHash == "" {
			// Default the TxHash.
			expi.Context.TxHash = reci.Context.TxHash
		}

		// Comparing unmarshaled values with an inlined object fails.
		// So we marshal the expected object and compare the strings.
		expbz, err := json.Marshal(expi)
		s.Require().NoError(err)

		s.Equal(string(expbz), actualRecords[i])
	}
}

func (s *IntegrationTestSuite) RegisterBridgeTarget(chain *ibctesting.TestChain, target string) {
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

func (s *IntegrationTestSuite) TransferFromSourceChain(
	srcChain *ibctesting.TestChain,
	data ibctransfertypes.FungibleTokenPacketData,
	src, dst *ibctesting.Endpoint,
) (channeltypes.Packet, error) {
	tokenAmt, ok := sdk.NewIntFromString(data.Amount)
	s.Require().True(ok)

	timeoutHeight := srcChain.GetTimeoutHeight()
	packet := channeltypes.NewPacket(data.GetBytes(), 0, src.ChannelConfig.PortID, src.ChannelID, dst.ChannelConfig.PortID, dst.ChannelID, timeoutHeight, 0)

	// send a transfer packet from src
	imt := ibctransfertypes.MsgTransfer{
		SourcePort:       packet.SourcePort,
		SourceChannel:    packet.SourceChannel,
		Memo:             data.Memo,
		Token:            sdk.NewCoin(data.Denom, tokenAmt),
		Sender:           data.Sender,
		Receiver:         data.Receiver,
		TimeoutHeight:    packet.TimeoutHeight,
		TimeoutTimestamp: packet.TimeoutTimestamp,
	}
	imr, err := s.GetApp(srcChain).TransferKeeper.Transfer(srcChain.GetContext(), &imt)
	s.Require().NoError(err)
	packet.Sequence = imr.Sequence

	return packet, nil
}

func (s *IntegrationTestSuite) mintToAddress(chain *ibctesting.TestChain, addr sdk.AccAddress, denom, amount string) {
	app := s.GetApp(chain)
	tokenAmt, ok := sdk.NewIntFromString(amount)
	s.Require().True(ok)
	intAmt, err := strconv.ParseInt(amount, 10, 64)
	s.Require().NoError(err)
	coins := sdk.NewCoins(sdk.NewCoin(denom, tokenAmt.Mul(sdk.NewInt(intAmt))))
	err = app.BankKeeper.MintCoins(chain.GetContext(), ibctransfertypes.ModuleName, coins)
	s.Require().NoError(err)
	err = app.BankKeeper.SendCoinsFromModuleToAccount(chain.GetContext(), ibctransfertypes.ModuleName, addr, coins)
	s.Require().NoError(err)
}

type SpyTransferKeeper struct {
	tk        packetforwardtypes.TransferKeeper
	pfk       *packetforwardkeeper.Keeper
	s         *IntegrationTestSuite
	chain     *ibctesting.TestChain
	pfmPacket channeltypes.Packet
}

var _ packetforwardtypes.TransferKeeper = &SpyTransferKeeper{}

func (s *IntegrationTestSuite) NewSpyTransferKeeper(pfk *packetforwardkeeper.Keeper, tk packetforwardtypes.TransferKeeper, chain *ibctesting.TestChain) *SpyTransferKeeper {
	return &SpyTransferKeeper{
		pfk:   pfk,
		tk:    tk,
		s:     s,
		chain: chain,
	}
}

func (stk *SpyTransferKeeper) Transfer(ctx context.Context, msg *ibctransfertypes.MsgTransfer) (*ibctransfertypes.MsgTransferResponse, error) {
	tokenData := ibctransfertypes.NewFungibleTokenPacketData(
		msg.Token.Denom,
		msg.Token.Amount.String(),
		msg.Sender,
		msg.Receiver,
		msg.Memo,
	)

	// Deliberately json-marshal the token data to diverge from tokenData.GetBytes().
	tokenBz, err := json.Marshal(tokenData)
	if err != nil {
		return nil, err
	}

	sdkCtx := sdk.UnwrapSDKContext(ctx)
	channel, ok := stk.s.GetApp(stk.chain).IBCKeeper.ChannelKeeper.GetChannel(sdkCtx, msg.SourcePort, msg.SourceChannel)
	stk.s.Require().True(ok)

	pp := &stk.pfmPacket
	*pp = channeltypes.NewPacket(
		tokenBz, 0,
		msg.SourcePort, msg.SourceChannel,
		channel.Counterparty.PortId, channel.Counterparty.ChannelId,
		msg.TimeoutHeight, msg.TimeoutTimestamp)

	chanCap := stk.chain.GetChannelCapability(msg.SourcePort, msg.SourceChannel)
	sequence, err := stk.pfk.SendPacket(sdkCtx, chanCap, pp.SourcePort, pp.SourceChannel, pp.TimeoutHeight, pp.TimeoutTimestamp, pp.Data)
	if err != nil {
		return nil, err
	}
	pp.Sequence = sequence
	res := &ibctransfertypes.MsgTransferResponse{
		Sequence: sequence,
	}
	return res, nil
}

func (stk *SpyTransferKeeper) DenomPathFromHash(ctx sdk.Context, denom string) (string, error) {
	return stk.tk.DenomPathFromHash(ctx, denom)
}

// TestTransferFromAgdToAgd relays an IBC transfer initiated from a chain A to a
// chain B, and relays the chain B's resulting acknowledgement in return. It
// verifies that the source and destination accounts' bridge targets are called
// by inspecting their resulting actionQueue records.  By committing blocks
// between actions, the test verifies that the VM results are permitted to be
// async across blocks.
func (s *IntegrationTestSuite) TestTransferFromAgdToAgd() {
	testCases := []struct {
		name             string
		senderIsTarget   bool
		receiverIsTarget bool
		senderHookData   []byte
		receiverHookData []byte
		pfmBounce        bool
	}{
		{"no targets, no hooks", false, false, nil, nil, false},
		{"no targets, no hooks, PFM", false, false, nil, nil, true},
		{"no targets, hooked receiver", false, true, nil, []byte("?what=arbitrary-data&why=to-test-bridge-targets"), false},
		{"sender target, no hooks", true, false, nil, nil, false},
		{"sender target, hooked receiver", true, false, nil, []byte("?what=arbitrary-data&why=to-test-bridge-targets"), false},
		{"receiver target, no hooks", false, true, nil, nil, false},
		{"receiver target, hooked receiver", false, true, nil, []byte("?what=arbitrary-data&why=to-test-bridge-targets"), false},
		{"receiver target, no hooks, PFM", false, true, nil, nil, true},
		{"receiver target, hooked receiver, PFM", false, true, nil, []byte("?what=arbitrary-data&why=to-test-bridge-targets"), true},
		{"both targets, no hooks", true, true, nil, nil, false},
		{"both targets, hooked receiver", true, true, nil, []byte("?what=arbitrary-data&why=to-test-bridge-targets"), false},

		// TODO: Add tests for hooked sender after address hooks are tolerated by x/bank.
		// {"no targets, hooked sender", true, true, []byte("?name=alice&peer=bob"), nil},
		// {"no targets, both hooks", false, true, []byte("?name=alice&peer=bob"), []byte("?what=arbitrary-data&why=to-test-bridge-targets")},
		// {"sender target, hooked sender", true, false, []byte("?name=alice&peer=bob"), nil},
		// {"sender target, both hooks", true, false, []byte("?name=alice&peer=bob"), []byte("?what=arbitrary-data&why=to-test-bridge-targets")},
		// {"receiver target, hooked sender", false, true, []byte("?name=alice&peer=bob"), nil},
		// {"receiver target, both hooks", false, true, []byte("?name=alice&peer=bob"), []byte("?what=arbitrary-data&why=to-test-bridge-targets")},
		// {"both targets, hooked sender", true, true, []byte("?name=alice&peer=bob"), nil},
		// {"both targets, both hooks", true, true, []byte("?name=alice&peer=bob"), []byte("?what=arbitrary-data&why=to-test-bridge-targets")},
	}

	serial := make(chan struct{}, 1)
	serial <- struct{}{}

	for _, tc := range testCases {
		tc := tc
		s.Run("TransferFromAgdToAgd "+tc.name, func() {
			<-serial
			pfkB := s.GetApp(s.chainB).PacketForwardKeeper
			transferKeeperB := s.GetApp(s.chainB).TransferKeeper
			defer func() {
				pfkB.SetTransferKeeper(transferKeeperB)
				serial <- struct{}{}
			}()

			s.resetActionQueue(s.chainA)
			s.resetActionQueue(s.chainB)

			path := s.NewTransferPath()

			_, _, baseSenderAddr := testdata.KeyTestPubAddr()
			baseSender := baseSenderAddr.String()

			_, _, baseReceiverAddr := testdata.KeyTestPubAddr()
			baseReceiver := baseReceiverAddr.String()

			var receiver, sender string
			var err error
			if tc.senderHookData != nil {
				sender, err = types.JoinHookedAddress(baseSender, tc.senderHookData)
			} else {
				sender = baseSender
			}
			s.Require().NoError(err)
			if tc.receiverHookData != nil {
				receiver, err = types.JoinHookedAddress(baseReceiver, tc.receiverHookData)
			} else {
				receiver = baseReceiver
			}
			s.Require().NoError(err)

			// create a transfer packet's data contents
			var initialReceiver string
			var memo string
			m := struct {
				Forward packetforwardtypes.ForwardMetadata `json:"forward"`
			}{}
			var spyTransferKeeperB *SpyTransferKeeper
			receiverChain := s.chainB
			if tc.pfmBounce {
				initialReceiver = "pfm"
				receiverChain = s.chainA
				spyTransferKeeperB = s.NewSpyTransferKeeper(pfkB, transferKeeperB, s.chainB)
				pfkB.SetTransferKeeper(spyTransferKeeperB)

				memo = packetforwardtypes.ModuleName
				m.Forward.Receiver = receiver
				m.Forward.Port = path.EndpointB.ChannelConfig.PortID
				m.Forward.Channel = path.EndpointB.ChannelID
				memoBytes, err := json.Marshal(m)
				s.Require().NoError(err)
				memo = string(memoBytes)
			} else {
				initialReceiver = receiver
				memo = `"This is a JSON memo"`
			}
			transferData := ibctransfertypes.NewFungibleTokenPacketData(
				"uosmo",
				"1000000",
				sender,
				initialReceiver,
				memo,
			)

			// Register the sender and receiver as bridge targets on their specific
			// chain.
			if tc.senderIsTarget {
				s.RegisterBridgeTarget(s.chainA, baseSender)
			}
			if tc.receiverIsTarget {
				s.RegisterBridgeTarget(receiverChain, baseReceiver)
			}

			s.mintToAddress(s.chainA, baseSenderAddr, transferData.Denom, transferData.Amount)

			// Initiate the transfer
			initialPacket, err := s.TransferFromSourceChain(s.chainA, transferData, path.EndpointA, path.EndpointB)
			s.Require().NoError(err)

			// Relay the packet
			s.coordinator.CommitBlock(s.chainA)
			err = path.EndpointB.UpdateClient()
			s.Require().NoError(err)
			s.coordinator.CommitBlock(s.chainB)

			writeAcknowledgementHeight := s.chainB.CurrentHeader.Height
			writeAcknowledgementTime := s.chainB.CurrentHeader.Time.Unix()

			err = path.EndpointB.RecvPacket(initialPacket)
			s.Require().NoError(err)

			// Create a success ack as defined by ICS20.
			ack := channeltypes.NewResultAcknowledgement([]byte{1})
			// Create a different ack to show that a contract can change it.
			finalAck := channeltypes.NewResultAcknowledgement([]byte{5})

			s.coordinator.CommitBlock(s.chainA, s.chainB)

			{
				expectedRecords := []swingsettypes.InboundQueueRecord{}
				s.assertActionQueue(s.chainA, expectedRecords)
			}

			finalPacket := initialPacket
			if tc.pfmBounce {
				// The PFM should have received the packet and advertised a send back to the original chain.
				finalPacket = spyTransferKeeperB.pfmPacket

				err = path.EndpointA.UpdateClient()
				s.Require().NoError(err)
				s.coordinator.CommitBlock(s.chainA)

				writeAcknowledgementHeight = s.chainA.CurrentHeader.Height
				writeAcknowledgementTime = s.chainA.CurrentHeader.Time.Unix()

				err = path.EndpointA.RecvPacket(finalPacket)
				s.Require().NoError(err)

				s.coordinator.CommitBlock(s.chainA, s.chainB)
			}

			{
				expectedRecords := []swingsettypes.InboundQueueRecord{}
				if tc.receiverIsTarget {
					expectedRecords = append(expectedRecords, swingsettypes.InboundQueueRecord{
						Action: &vibckeeper.WriteAcknowledgementEvent{
							ActionHeader: &vm.ActionHeader{
								Type:        "VTRANSFER_IBC_EVENT",
								BlockHeight: writeAcknowledgementHeight,
								BlockTime:   writeAcknowledgementTime,
							},
							Event:           "writeAcknowledgement",
							Target:          baseReceiver,
							Packet:          finalPacket,
							Acknowledgement: ack.Acknowledgement(),
						},
						Context: swingsettypes.ActionContext{
							BlockHeight: writeAcknowledgementHeight,
							// TxHash is filled in below
							MsgIdx: 0,
						},
					})
				}

				s.assertActionQueue(receiverChain, expectedRecords)

				if tc.receiverIsTarget {
					// write out a different acknowledgement from the "contract", one block later.
					s.coordinator.CommitBlock(receiverChain)

					err = s.GetApp(receiverChain).VtransferKeeper.ReceiveWriteAcknowledgement(receiverChain.GetContext(), finalPacket, finalAck)
					s.Require().NoError(err)

					s.coordinator.CommitBlock(receiverChain)
				} else {
					finalAck = ack
				}
			}

			if tc.pfmBounce {
				// Update Client
				err = path.EndpointB.UpdateClient()
				s.Require().NoError(err)

				// Prove the PFM packet's acknowledgement.
				err = path.EndpointB.AcknowledgePacket(finalPacket, finalAck.Acknowledgement())
				s.Require().NoError(err)

				s.coordinator.CommitBlock(s.chainA, s.chainB)
			}

			// Update Client
			err = path.EndpointA.UpdateClient()
			s.Require().NoError(err)

			acknowledgementHeight := s.chainA.CurrentHeader.Height
			acknowledgementTime := s.chainA.CurrentHeader.Time.Unix()

			// Prove the initial packet's acknowledgement.
			err = path.EndpointA.AcknowledgePacket(initialPacket, finalAck.Acknowledgement())
			s.Require().NoError(err)

			s.coordinator.CommitBlock(s.chainA, s.chainB)

			{
				expectedRecords := []swingsettypes.InboundQueueRecord{}
				if tc.senderIsTarget {
					expectedRecords = append(expectedRecords, swingsettypes.InboundQueueRecord{
						Action: &vibckeeper.WriteAcknowledgementEvent{
							ActionHeader: &vm.ActionHeader{
								Type:        "VTRANSFER_IBC_EVENT",
								BlockHeight: acknowledgementHeight,
								BlockTime:   acknowledgementTime,
							},
							Event:           "acknowledgementPacket",
							Target:          baseSender,
							Packet:          initialPacket,
							Acknowledgement: finalAck.Acknowledgement(),
							Relayer:         s.chainA.SenderAccount.GetAddress(),
						},
						Context: swingsettypes.ActionContext{
							BlockHeight: acknowledgementHeight,
							// TxHash is filled in below
							MsgIdx: 0,
						},
					})
				}

				s.assertActionQueue(s.chainA, expectedRecords)
			}
		})
	}
}
