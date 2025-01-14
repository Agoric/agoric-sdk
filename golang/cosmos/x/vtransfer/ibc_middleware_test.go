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
	"github.com/iancoleman/orderedmap"
	"github.com/stretchr/testify/suite"
	"github.com/tendermint/tendermint/libs/log"
	dbm "github.com/tendermint/tm-db"

	"github.com/Agoric/agoric-sdk/golang/cosmos/types"
	swingsettesting "github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/testing"
	swingsettypes "github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
	vibckeeper "github.com/Agoric/agoric-sdk/golang/cosmos/x/vibc/keeper"
	vibctypes "github.com/Agoric/agoric-sdk/golang/cosmos/x/vibc/types"

	"github.com/cosmos/cosmos-sdk/baseapp"
	sdk "github.com/cosmos/cosmos-sdk/types"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"
	banktypes "github.com/cosmos/cosmos-sdk/x/bank/types"
	packetforwardtypes "github.com/cosmos/ibc-apps/middleware/packet-forward-middleware/v6/packetforward/types"
	ibctransfertypes "github.com/cosmos/ibc-go/v6/modules/apps/transfer/types"
	channeltypes "github.com/cosmos/ibc-go/v6/modules/core/04-channel/types"
	ibcexported "github.com/cosmos/ibc-go/v6/modules/core/exported"
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
	chainC *ibctesting.TestChain

	lastChannelOffset map[int]int
	endpoints         map[int]map[int]*ibctesting.Endpoint

	queryClient ibctransfertypes.QueryClient
}

type TestingAppMaker func() (ibctesting.TestingApp, map[string]json.RawMessage)

func TestTransferTestSuite(t *testing.T) {
	s := new(IntegrationTestSuite)
	suite.Run(t, s)
}

// interBlockCacheOpt returns a BaseApp option function that sets the persistent
// inter-block write-through cache.
func interBlockCacheOpt() func(*baseapp.BaseApp) {
	return baseapp.SetInterBlockCache(store.NewCommitKVStoreCacheManager())
}

func (s *IntegrationTestSuite) getEndpoint(a, b int) *ibctesting.Endpoint {
	amap := s.endpoints[a]
	if amap == nil {
		return nil
	}
	return amap[b]
}

func (s *IntegrationTestSuite) cacheEndpoint(a, b int, endpoint *ibctesting.Endpoint) {
	amap := s.endpoints[a]
	if amap == nil {
		amap = make(map[int]*ibctesting.Endpoint)
	}
	amap[b] = endpoint
}

// Each instance has unique IBC genesis state with deterministic
// client/connection/channel initial sequence numbers
// (respectively, X000/X010/X050 where X is the zero-based
// instance number plus one, such that instance 0 uses
// 1000/1010/1050, instance 1 uses 2000/2010/2050, etc.).
func computeSequences(instance int) (clientSeq, connectionSeq, channelSeq int) {
	baseSequence := 1000 * (instance + 1)
	return baseSequence, baseSequence + 10, baseSequence + 50
}

func (s *IntegrationTestSuite) nextChannelOffset(instance int) int {
	offset, ok := s.lastChannelOffset[instance]
	if ok {
		offset += 1
	}
	s.lastChannelOffset[instance] = offset
	return offset
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

// SetupTest initializes an IntegrationTestSuite with three similar chains, a
// shared coordinator, and a query client that happens to point at chainA.
func (s *IntegrationTestSuite) SetupTest() {
	s.lastChannelOffset = make(map[int]int)
	s.endpoints = make(map[int]map[int]*ibctesting.Endpoint)
	s.coordinator = ibctesting.NewCoordinator(s.T(), 0)

	chains := make(map[string]*ibctesting.TestChain)
	for i := 0; i < 3; i++ {
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
	s.chainC = s.coordinator.GetChain(ibctesting.GetChainID(2))

	agoricApp := s.GetApp(s.chainA)

	queryHelper := baseapp.NewQueryServerTestHelper(s.chainA.GetContext(), agoricApp.InterfaceRegistry())
	ibctransfertypes.RegisterQueryServer(queryHelper, agoricApp.TransferKeeper)
	s.queryClient = ibctransfertypes.NewQueryClient(queryHelper)
}

func (s *IntegrationTestSuite) GetChainByIndex(index int) *ibctesting.TestChain {
	return s.coordinator.GetChain(ibctesting.GetChainID(index))
}

func (s *IntegrationTestSuite) GetApp(chain *ibctesting.TestChain) *app.GaiaApp {
	app, ok := chain.App.(*app.GaiaApp)
	if !ok {
		panic("not agoric app")
	}

	return app
}

func (s *IntegrationTestSuite) NewTransferPath(a, b int) *ibctesting.Path {
	chainA := s.coordinator.GetChain(ibctesting.GetChainID(a))
	chainB := s.coordinator.GetChain(ibctesting.GetChainID(b))

	chAOffset := s.nextChannelOffset(a)
	chBOffset := s.nextChannelOffset(b)
	path := ibctesting.NewPath(chainA, chainB)
	_, _, channelASeq := computeSequences(a)
	_, _, channelBSeq := computeSequences(b)
	path.EndpointA.ChannelID = fmt.Sprintf("channel-%d", channelASeq+chAOffset)
	path.EndpointB.ChannelID = fmt.Sprintf("channel-%d", channelBSeq+chBOffset)
	path.EndpointA.ChannelConfig.PortID = ibctesting.TransferPort
	path.EndpointB.ChannelConfig.PortID = ibctesting.TransferPort
	path.EndpointA.ChannelConfig.Version = "ics20-1"
	path.EndpointB.ChannelConfig.Version = "ics20-1"

	endpoint := s.getEndpoint(a, b)
	if endpoint == nil {
		s.coordinator.SetupConnections(path)
		s.cacheEndpoint(a, b, path.EndpointA)
		s.cacheEndpoint(b, a, path.EndpointB)
	} else {
		path.EndpointA.ClientID = endpoint.ClientID
		path.EndpointA.ConnectionID = endpoint.ConnectionID

		path.EndpointB.ClientID = endpoint.Counterparty.ClientID
		path.EndpointB.ConnectionID = endpoint.Counterparty.ConnectionID
	}
	s.coordinator.CreateChannels(path)

	s.coordinator.CommitBlock(chainA, chainB)

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
	bz, err := json.Marshal(struct {
		Type   string
		Target string
	}{"BRIDGE_TARGET_REGISTER", target})
	s.Require().NoError(err)
	err = agdServer.ReceiveMessage(
		&vm.Message{
			Port: agdServer.GetPort("vtransfer"),
			Data: string(bz),
		},
		&reply,
	)
	s.Require().NoError(err)
	s.Require().Equal(reply, "true")
}

func (s *IntegrationTestSuite) TransferFromEndpoint(
	srcContext sdk.Context,
	src *ibctesting.Endpoint,
	data ibctransfertypes.FungibleTokenPacketData,
) error {
	tokenAmt, ok := sdk.NewIntFromString(data.Amount)
	s.Require().True(ok)

	timeoutHeight := src.Counterparty.Chain.GetTimeoutHeight()

	// send a transfer packet from src
	imt := ibctransfertypes.NewMsgTransfer(
		src.ChannelConfig.PortID,
		src.ChannelID,
		sdk.NewCoin(data.Denom, tokenAmt),
		data.Sender,
		data.Receiver,
		timeoutHeight,
		0,
		data.Memo,
	)

	tk := s.GetApp(src.Chain).TransferKeeper
	_, err := tk.Transfer(srcContext, imt)
	return err
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

// TestHops relays an IBC transfer initiated from a chain A to a chain B, via 0
// or more intermediate chains' PacketForwardMiddleware, and relays the chain
// B's resulting acknowledgement back through the intermediate chains to chain A
// in return. It verifies that the source and destination accounts' bridge
// targets are called by inspecting their resulting actionQueue records.  By
// committing blocks between actions, the test verifies that the VM results are
// permitted to be async across blocks.
func (s *IntegrationTestSuite) TestHops() {
	testCases := []struct {
		name             string
		senderIsTarget   bool
		receiverIsTarget bool
		senderHookData   []byte
		receiverHookData []byte
	}{
		{"NoTargetsNoHooks", false, false, nil, nil},
		{"NoTargetsReceiverHook", false, false, nil, []byte("?what=arbitrary-data&why=to-test-bridge-targets")},
		{"SenderTargetNoHooks", true, false, nil, nil},
		{"SenderTargetReceiverHook", true, false, nil, []byte("?what=arbitrary-data&why=to-test-bridge-targets")},
		{"ReceiverTargetNoHooks", false, true, nil, nil},
		{"ReceiverTargetReceiverHook", false, true, nil, []byte("?what=arbitrary-data&why=to-test-bridge-targets")},
		{"BothTargetsNoHooks", true, true, nil, nil},
		{"BothTargetsReceiverHook", true, true, nil, []byte("?what=arbitrary-data&why=to-test-bridge-targets")},

		// TODO: Add tests for hooked sender after address hooks are tolerated by x/bank.
		// {"NoTargetsSenderHook, true, true, []byte("?name=alice&peer=bob"), nil},
		// {"NoTargetsBothHooks", false, true, []byte("?name=alice&peer=bob"), []byte("?what=arbitrary-data&why=to-test-bridge-targets")},
		// {"SenderTargetSenderHook, true, false, []byte("?name=alice&peer=bob"), nil},
		// {"SenderTargetBothHooks", true, false, []byte("?name=alice&peer=bob"), []byte("?what=arbitrary-data&why=to-test-bridge-targets")},
		// {"ReceiverTargetSenderHook, false, true, []byte("?name=alice&peer=bob"), nil},
		// {"ReceiverTargetBothHooks", false, true, []byte("?name=alice&peer=bob"), []byte("?what=arbitrary-data&why=to-test-bridge-targets")},
		// {"BothTargetsSenderHook, true, true, []byte("?name=alice&peer=bob"), nil},
		// {"BothTargetsBothHooks", true, true, []byte("?name=alice&peer=bob"), []byte("?what=arbitrary-data&why=to-test-bridge-targets")},
	}

	for hops := 1; hops <= 2; hops += 1 {
		for _, tc := range testCases {
			tc := tc
			s.Run(fmt.Sprintf("%s_%dHop", tc.name, hops), func() {
				// Construct the transfer path from 0, 2, 3..., to 1.
				paths := make([]*ibctesting.Path, hops)
				{
					endpointAChainIndex := 0
					endpointBChainIndex := 2
					for i := 0; i < hops; i += 1 {
						if i == hops-1 {
							endpointBChainIndex = 1
						}
						paths[i] = s.NewTransferPath(endpointAChainIndex, endpointBChainIndex)
						endpointAChainIndex = endpointBChainIndex
						endpointBChainIndex += 1
					}
				}

				// Reset the queues.
				for i := 0; i < hops; i += 1 {
					s.resetActionQueue(s.GetChainByIndex(i))
				}

				_, _, baseSenderAddr := testdata.KeyTestPubAddr()
				baseSender := baseSenderAddr.String()

				_, _, baseReceiverAddr := testdata.KeyTestPubAddr()
				baseReceiver := baseReceiverAddr.String()

				var receiver, sender string
				var err error
				if tc.senderHookData != nil {
					sender, err = types.JoinHookedAddress(baseSender, tc.senderHookData)
					s.Require().NoError(err)
				} else {
					sender = baseSender
				}

				if tc.receiverHookData != nil {
					receiver, err = types.JoinHookedAddress(baseReceiver, tc.receiverHookData)
					s.Require().NoError(err)
				} else {
					receiver = baseReceiver
				}

				// create a transfer packet's data contents
				hopReceiver := receiver
				var memoBytes []byte
				for pathIdx := hops - 1; pathIdx > 0; pathIdx -= 1 {
					m := struct {
						Forward packetforwardtypes.ForwardMetadata `json:"forward"`
					}{}
					if memoBytes != nil {
						m.Forward.Next = packetforwardtypes.NewJSONObject(false, memoBytes, *orderedmap.New())
					}
					m.Forward.Receiver = hopReceiver

					// Previous hops should not have a bech32 address in the receiver field,
					// or tokens may get stuck en route rather than returned on error.
					hopReceiver = "pfm"
					m.Forward.Port = paths[pathIdx].EndpointA.ChannelConfig.PortID
					m.Forward.Channel = paths[pathIdx].EndpointA.ChannelID

					memoBytes, err = json.Marshal(m)
					s.Require().NoError(err)
				}

				var memo string
				if memoBytes != nil {
					memo = string(memoBytes)
				} else {
					memo = `This is not a JSON memo`
				}

				transferData := ibctransfertypes.NewFungibleTokenPacketData(
					"uosmo",
					"1000000",
					sender,
					hopReceiver,
					memo,
				)

				// Register the sender and receiver as bridge targets on their specific
				// chain.
				if tc.senderIsTarget {
					s.RegisterBridgeTarget(s.chainA, baseSender)
				}
				if tc.receiverIsTarget {
					s.RegisterBridgeTarget(s.chainB, baseReceiver)
				}

				s.mintToAddress(s.chainA, baseSenderAddr, transferData.Denom, transferData.Amount)

				// Initiate the transfer
				sendContext := s.chainA.GetContext()
				err = s.TransferFromEndpoint(sendContext, paths[0].EndpointA, transferData)
				s.Require().NoError(err)

				sendPacket, err := ParsePacketFromEvents(sendContext.EventManager().Events())
				s.Require().NoError(err)

				s.coordinator.CommitBlock(s.chainA)

				// Relay the packet through the intermediaries to the final destination.
				var packetRes *sdk.Result
				var writeAcknowledgementHeight, writeAcknowledgementTime int64
				for pathIdx := 0; pathIdx < hops; pathIdx += 1 {
					nextPath := paths[pathIdx]
					err = nextPath.EndpointB.UpdateClient()
					s.Require().NoError(err)
					s.coordinator.CommitBlock(nextPath.EndpointB.Chain)

					writeAcknowledgementHeight = nextPath.EndpointB.Chain.CurrentHeader.Height
					writeAcknowledgementTime = nextPath.EndpointB.Chain.CurrentHeader.Time.Unix()

					packetRes, err = nextPath.EndpointB.RecvPacketWithResult(sendPacket)
					s.Require().NoError(err)

					s.coordinator.CommitBlock(nextPath.EndpointA.Chain, nextPath.EndpointB.Chain)

					{
						expectedRecords := []swingsettypes.InboundQueueRecord{}
						s.assertActionQueue(nextPath.EndpointA.Chain, expectedRecords)
					}

					if pathIdx >= hops-1 {
						break
					}

					// The PFM should have received the packet and advertised a send toward the last path.
					sendPacket, err = ParsePacketFromEvents(packetRes.GetEvents())
					s.Require().NoError(err)
				}

				var ack ibcexported.Acknowledgement
				var ackedPacket channeltypes.Packet

				expectedAck := channeltypes.NewResultAcknowledgement([]byte{1})

				{
					var events sdk.Events
					var ackData []byte
					if packetRes != nil {
						events = packetRes.GetEvents()
						ackData, err = ibctesting.ParseAckFromEvents(events)
					}
					if tc.receiverIsTarget {
						// The packet was not yet acknowledged, so write out an ack from the VM, one block later
						s.coordinator.CommitBlock(s.chainB)

						vmAckContext := s.chainB.GetContext()
						err = s.GetApp(s.chainB).VtransferKeeper.ReceiveWriteAcknowledgement(vmAckContext, sendPacket, expectedAck)
						s.Require().NoError(err)

						events = vmAckContext.EventManager().Events()
						ackData, err = ibctesting.ParseAckFromEvents(events)
					}

					s.Require().NoError(err)

					ackedPacket, err = ParsePacketFromFilteredEvents(events, channeltypes.EventTypeWriteAck)
					s.Require().NoError(err)
					ack = vibctypes.NewRawAcknowledgement(ackData)

					s.coordinator.CommitBlock(s.chainB)

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
								Packet:          sendPacket,
								Acknowledgement: expectedAck.Acknowledgement(),
							},
							Context: swingsettypes.ActionContext{
								BlockHeight: writeAcknowledgementHeight,
								// TxHash is filled in below
								MsgIdx: 0,
							},
						})
					}

					s.assertActionQueue(s.chainB, expectedRecords)
				}

				// Send the acks back.
				for pathIdx := hops - 1; pathIdx > 0; pathIdx -= 1 {
					priorPath := paths[pathIdx]

					// Update Client
					err = priorPath.EndpointA.UpdateClient()
					s.Require().NoError(err)

					// Prove the PFM packet's acknowledgement.
					ackRes, err := acknowledgePacketWithResult(priorPath.EndpointA, ackedPacket, ack.Acknowledgement())
					s.Require().NoError(err)

					ackedPacket, err = ParsePacketFromFilteredEvents(ackRes.GetEvents(), channeltypes.EventTypeWriteAck)
					s.Require().NoError(err)

					ackData, err := ibctesting.ParseAckFromEvents(ackRes.GetEvents())
					s.Require().NoError(err)
					ack = vibctypes.NewRawAcknowledgement(ackData)

					s.coordinator.CommitBlock(priorPath.EndpointA.Chain, priorPath.EndpointB.Chain)
				}

				// Update Client
				err = paths[0].EndpointA.UpdateClient()
				s.Require().NoError(err)

				acknowledgementHeight := s.chainA.CurrentHeader.Height
				acknowledgementTime := s.chainA.CurrentHeader.Time.Unix()

				// Prove the initial packet's acknowledgement.
				err = paths[0].EndpointA.AcknowledgePacket(ackedPacket, ack.Acknowledgement())
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
								Packet:          ackedPacket,
								Acknowledgement: ack.Acknowledgement(),
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
				s.Require().Equal(ack.Acknowledgement(), expectedAck.Acknowledgement())
			})
		}
	}
}
