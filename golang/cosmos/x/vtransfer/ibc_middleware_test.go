package vtransfer_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"testing"
	"text/template"

	"cosmossdk.io/log"
	"cosmossdk.io/store"
	app "github.com/Agoric/agoric-sdk/golang/cosmos/app"
	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	dbm "github.com/cosmos/cosmos-db"
	"github.com/cosmos/cosmos-sdk/codec"
	"github.com/cosmos/cosmos-sdk/testutil/sims"
	"github.com/cosmos/cosmos-sdk/testutil/testdata"
	"github.com/iancoleman/orderedmap"
	"github.com/stretchr/testify/suite"

	"github.com/Agoric/agoric-sdk/golang/cosmos/types"
	swingsettesting "github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/testing"
	swingsettypes "github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
	vibctypes "github.com/Agoric/agoric-sdk/golang/cosmos/x/vibc/types"

	sdkmath "cosmossdk.io/math"
	abci "github.com/cometbft/cometbft/abci/types"
	wasmkeeper "github.com/CosmWasm/wasmd/x/wasm/keeper"
	tmproto "github.com/cometbft/cometbft/proto/tendermint/types"
	"github.com/cosmos/cosmos-sdk/baseapp"
	sdk "github.com/cosmos/cosmos-sdk/types"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"
	banktypes "github.com/cosmos/cosmos-sdk/x/bank/types"
	packetforwardtypes "github.com/cosmos/ibc-apps/middleware/packet-forward-middleware/v8/packetforward/types"
	ibctransfertypes "github.com/cosmos/ibc-go/v8/modules/apps/transfer/types"
	channeltypes "github.com/cosmos/ibc-go/v8/modules/core/04-channel/types"
	ibcexported "github.com/cosmos/ibc-go/v8/modules/core/exported"
	ibctesting "github.com/cosmos/ibc-go/v8/testing"
)

const (
	StorePacketData = true
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

func SetupAgoricTestingApp(t *testing.T, instance int) TestingAppMaker {
	return func() (ibctesting.TestingApp, map[string]json.RawMessage) {
		db := dbm.NewMemDB()
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
			true, sims.EmptyAppOptions{}, []wasmkeeper.Option{}, interBlockCacheOpt())
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
						"params": {
							"upgrade_timeout": {
								"height": {
									"revision_number": "0",
									"revision_height": "0"
								},
								"timestamp": "600000000000"
							}
						},
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
		ibctesting.DefaultTestingAppInit = SetupAgoricTestingApp(s.T(), i)

		chainID := ibctesting.GetChainID(i)
		chain := ibctesting.NewTestChain(s.T(), s.coordinator, chainID)

		balance := banktypes.Balance{
			Address: chain.SenderAccount.GetAddress().String(),
			Coins:   sdk.NewCoins(sdk.NewCoin(sdk.DefaultBondDenom, sdkmath.NewInt(100000000000000))),
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

func (s *IntegrationTestSuite) NewTransferPath(endpointAChainIdx, endpointBChainIdx int) *ibctesting.Path {
	endpointAChain := s.coordinator.GetChain(ibctesting.GetChainID(endpointAChainIdx))
	endpointBChain := s.coordinator.GetChain(ibctesting.GetChainID(endpointBChainIdx))

	chAOffset := s.nextChannelOffset(endpointAChainIdx)
	chBOffset := s.nextChannelOffset(endpointBChainIdx)
	path := ibctesting.NewPath(endpointAChain, endpointBChain)
	_, _, channelASeq := computeSequences(endpointAChainIdx)
	_, _, channelBSeq := computeSequences(endpointBChainIdx)
	path.EndpointA.ChannelID = fmt.Sprintf("channel-%d", channelASeq+chAOffset)
	path.EndpointB.ChannelID = fmt.Sprintf("channel-%d", channelBSeq+chBOffset)
	path.EndpointA.ChannelConfig.PortID = ibctesting.TransferPort
	path.EndpointB.ChannelConfig.PortID = ibctesting.TransferPort
	path.EndpointA.ChannelConfig.Version = "ics20-1"
	path.EndpointB.ChannelConfig.Version = "ics20-1"

	endpoint := s.getEndpoint(endpointAChainIdx, endpointBChainIdx)
	if endpoint == nil {
		s.coordinator.SetupConnections(path)
		s.cacheEndpoint(endpointAChainIdx, endpointBChainIdx, path.EndpointA)
		s.cacheEndpoint(endpointBChainIdx, endpointAChainIdx, path.EndpointB)
	} else {
		path.EndpointA.ClientID = endpoint.ClientID
		path.EndpointA.ConnectionID = endpoint.ConnectionID

		path.EndpointB.ClientID = endpoint.Counterparty.ClientID
		path.EndpointB.ConnectionID = endpoint.Counterparty.ConnectionID
	}
	s.coordinator.CreateChannels(path)

	s.coordinator.CommitBlock(endpointAChain, endpointBChain)

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
	s.Require().Equal("true", reply)
}

func (s *IntegrationTestSuite) TransferFromEndpoint(
	srcContext sdk.Context,
	src *ibctesting.Endpoint,
	data ibctransfertypes.FungibleTokenPacketData,
) error {
	tokenAmt, ok := sdkmath.NewIntFromString(data.Amount)
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

func (s *IntegrationTestSuite) prependDenomTrace(sender *ibctesting.Endpoint, trace string) string {
	return fmt.Sprintf("%s/%s/%s", sender.ChannelConfig.PortID, sender.ChannelID, trace)
}

func (s *IntegrationTestSuite) overrideSendPacketData(cdc codec.Codec, data []byte, hookedSender string) ([]byte, error) {
	var ftpd ibctransfertypes.FungibleTokenPacketData
	err := json.Unmarshal(data, &ftpd)
	if err != nil {
		return nil, err
	}

	// XXX: This is a hack to get around the fact that `TransferKeeper.Transfer`
	// doesn't understand hooked senders.  We need to put the hooked sender back
	// in so that the vtransfer keeper can strip it out as if it had been there
	// all along.
	newFtpd := ftpd
	newFtpd.Sender = hookedSender

	// Permute the encoded data to ensure that it is different that what the TransferKeeper.Transfer specified.
	if bz := ftpd.GetBytes(); !bytes.Equal(data, bz) {
		return newFtpd.GetBytes(), nil
	}

	bz, err := cdc.MarshalJSON(&ftpd)
	if err != nil {
		return nil, err
	}

	if !bytes.Equal(data, bz) {
		newBz, err := cdc.MarshalJSON(&newFtpd)
		if err != nil {
			return nil, err
		}
		return newBz, nil
	}

	return nil, fmt.Errorf("failed to find a way to permute packet data: %s", string(data))
}

func (s *IntegrationTestSuite) mintToAddress(chain *ibctesting.TestChain, addr sdk.AccAddress, denom, amount string) {
	app := s.GetApp(chain)
	tokenAmt, ok := sdkmath.NewIntFromString(amount)
	s.Require().True(ok)
	intAmt, err := strconv.ParseInt(amount, 10, 64)
	s.Require().NoError(err)
	coins := sdk.NewCoins(sdk.NewCoin(denom, tokenAmt.Mul(sdkmath.NewInt(intAmt))))
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
		{"NoTargetsSenderHook", false, false, []byte("?name=alice&peer=bob"), nil},
		{"NoTargetsBothHooks", false, false, []byte("?name=alice&peer=bob"), []byte("?what=arbitrary-data&why=to-test-bridge-targets")},
		{"SenderTargetNoHooks", true, false, nil, nil},
		{"SenderTargetReceiverHook", true, false, nil, []byte("?what=arbitrary-data&why=to-test-bridge-targets")},
		{"SenderTargetSenderHook", true, false, []byte("?name=alice&peer=bob"), nil},
		{"SenderTargetBothHooks", true, false, []byte("?name=alice&peer=bob"), []byte("?what=arbitrary-data&why=to-test-bridge-targets")},
		{"ReceiverTargetNoHooks", false, true, nil, nil},
		{"ReceiverTargetReceiverHook", false, true, nil, []byte("?what=arbitrary-data&why=to-test-bridge-targets")},
		{"ReceiverTargetSenderHook", false, true, []byte("?name=alice&peer=bob"), nil},
		{"ReceiverTargetBothHooks", false, true, []byte("?name=alice&peer=bob"), []byte("?what=arbitrary-data&why=to-test-bridge-targets")},
		{"BothTargetsNoHooks", true, true, nil, nil},
		{"BothTargetsReceiverHook", true, true, nil, []byte("?what=arbitrary-data&why=to-test-bridge-targets")},
		{"BothTargetsSenderHook", true, true, []byte("?name=alice&peer=bob"), nil},
		{"BothTargetsBothHooks", true, true, []byte("?name=alice&peer=bob"), []byte("?what=arbitrary-data&why=to-test-bridge-targets")},
	}

	for hops := 1; hops <= 2; hops += 1 {
		for _, tc := range testCases {
			tc := tc
			name := fmt.Sprintf("%s_%dHop", tc.name, hops)
			s.Run(name, func() {
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

				var overriddenPacketData []byte
				overrideSendPacketData := func(ctx sdk.Context, cdc codec.Codec, data []byte) ([]byte, error) {
					newData, err := s.overrideSendPacketData(cdc, data, sender)
					overriddenPacketData = newData
					return overriddenPacketData, err
				}
				// Reset the chain state.
				for i := 0; i <= hops; i += 1 {
					chain := s.GetChainByIndex(i)
					s.resetActionQueue(chain)
					s.GetApp(chain).VtransferKeeper.SetDebugging(StorePacketData, overrideSendPacketData)

					// Only the first chain is the sender, so don't override any other packets.
					overrideSendPacketData = nil
				}

				// Construct the transfer path from chainA=0, [chainC=2, [chainD=3...]], and finally chainB=1.
				// This guarantees that the first and last chains are s.chainA and s.chainB.
				paths := make([]*ibctesting.Path, hops)
				{
					endpointAChainIndex := 0 // s.chainA
					endpointBChainIndex := 2 // s.chainC
					for i := 0; i < hops; i += 1 {
						if i == hops-1 {
							// Final path's endpointB is s.chainB=1.
							endpointBChainIndex = 1
						}
						// Each path is an endpointA->endpointB pair.  We specify them by index.
						paths[i] = s.NewTransferPath(endpointAChainIndex, endpointBChainIndex)
						// The next path's A is the current path's B...
						endpointAChainIndex = endpointBChainIndex
						// and the next path's B is the next chain in the sequence.
						endpointBChainIndex += 1
					}
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

				denomTrace := "uosmo"
				transferData := ibctransfertypes.NewFungibleTokenPacketData(
					denomTrace,
					"1000000",
					baseSender, // TODO: ideally this would just be sender, and `TransferKeeper.Transfer` would accept address hooks.
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

				sendPacket, err := ParsePacketFromEvents(sendContext.EventManager().ABCIEvents())
				s.Require().NoError(err)

				s.coordinator.CommitBlock(s.chainA)

				// Relay the packet through the intermediaries to the final destination.
				var packetRes *abci.ExecTxResult
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

					denomTrace = s.prependDenomTrace(nextPath.EndpointB, denomTrace)

					{
						expectedRecords := []swingsettypes.InboundQueueRecord{}
						s.assertActionQueue(nextPath.EndpointA.Chain, expectedRecords)
					}

					if pathIdx >= hops-1 {
						break
					}

					// The PFM should have received the packet and advertised a send toward the last path.

					sendPacket, err = ParsePacketFromEvents(packetRes.Events)
					s.Require().NoError(err)
				}

				var ack ibcexported.Acknowledgement
				var ackedPacket channeltypes.Packet

				expectedAck := channeltypes.NewResultAcknowledgement([]byte{1})

				{
					var events []abci.Event
					var ackData []byte
					if packetRes != nil {
						events = packetRes.Events
						ackData, err = ParseAckFromEvents(events)
					}
					if tc.receiverIsTarget {
						s.Require().Nil(ackData)
						// The packet was not yet acknowledged, so write out an ack from the VM, one block later
						s.coordinator.CommitBlock(s.chainB)

						vmAckContext := s.chainB.GetContext()
						err = s.GetApp(s.chainB).VtransferKeeper.ReceiveWriteAcknowledgement(vmAckContext, sendPacket, expectedAck)
						s.Require().NoError(err)

						events = vmAckContext.EventManager().ABCIEvents()
						ackData, err = ParseAckFromEvents(events)
					}

					s.Require().NoError(err)

					ackedPacket, err = ParsePacketFromFilteredEvents(events, channeltypes.EventTypeWriteAck)
					s.Require().NoError(err)
					ack = vibctypes.NewRawAcknowledgement(ackData)

					s.coordinator.CommitBlock(s.chainB)

					expectedRecords := []swingsettypes.InboundQueueRecord{}
					if tc.receiverIsTarget {
						expectedRecords = append(expectedRecords, swingsettypes.InboundQueueRecord{
							Action: &vibctypes.WriteAcknowledgementEvent{
								ActionHeader: &vm.ActionHeader{
									Type:        "VTRANSFER_IBC_EVENT",
									BlockHeight: writeAcknowledgementHeight,
									BlockTime:   writeAcknowledgementTime,
								},
								Event:           "writeAcknowledgement",
								Target:          baseReceiver,
								Packet:          types.CopyToIBCPacket(sendPacket),
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

					ackedPacket, err = ParsePacketFromFilteredEvents(ackRes.Events, channeltypes.EventTypeWriteAck)
					s.Require().NoError(err)

					ackData, err := ParseAckFromEvents(ackRes.Events)
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
				ackRes, err := acknowledgePacketWithResult(paths[0].EndpointA, ackedPacket, ack.Acknowledgement())
				s.Require().NoError(err)

				// Commit the block to finalize the acknowledgement.
				s.coordinator.CommitBlock(s.chainA, s.chainB)

				// Verify the resulting events.
				gotEvents := 0
				expectedEvents := 2
				for _, event := range ackRes.Events {
					if event.Type == ibctransfertypes.EventTypePacket {
						gotEvents += 1
						if gotEvents == 2 && len(event.Attributes) == 2 {
							// We get a trailing event with a single "success" attribute.
							s.Require().Equal(ibctransfertypes.AttributeKeyAckSuccess, string(event.Attributes[0].Key))
							s.Require().Equal("\x01", string(event.Attributes[0].Value))
							s.Require().Equal("msg_index", string(event.Attributes[1].Key))
							s.Require().Equal("0", string(event.Attributes[1].Value))
							continue
						}
						expectedAttrs := 6
						gotAttrs := 0
						for _, attr := range event.Attributes {
							switch string(attr.Key) {
							case "module":
								s.Require().Equal(ibctransfertypes.ModuleName, string(attr.Value))
								gotAttrs += 1
							case ibctransfertypes.AttributeKeyAckSuccess:
								s.Require().Equal("\x01", string(attr.Value))
								gotAttrs += 1
							case ibctransfertypes.AttributeKeyMemo:
								s.Require().Equal(transferData.Memo, string(attr.Value))
								gotAttrs += 1
							case ibctransfertypes.AttributeKeyReceiver:
								s.Require().Equal(transferData.Receiver, string(attr.Value))
								gotAttrs += 1
							case "sender": // ibctransfertypes.AttributeKeySender:
								s.Require().Equal(transferData.Sender, string(attr.Value))
								gotAttrs += 1
							case ibctransfertypes.AttributeKeyDenom:
								s.Require().Equal(transferData.Denom, string(attr.Value))
								gotAttrs += 1
							case ibctransfertypes.AttributeKeyAmount:
								s.Require().Equal(transferData.Amount, string(attr.Value))
								gotAttrs += 1
							}
						}
						s.Require().Equal(expectedAttrs, gotAttrs, `expected %d %s type attributes, got %d`, expectedAttrs, ibctransfertypes.EventTypePacket, gotAttrs)
					}
				}

				// The resulting IBC packet event should be what we expected.
				s.Require().Equal(expectedEvents, gotEvents, `expected %d %s type events, got %d`, expectedEvents, ibctransfertypes.EventTypePacket, gotEvents)

				{
					// Undo the sender data override.
					expectedPacket := ackedPacket
					expectedPacket.Data = overriddenPacketData

					expectedRecords := []swingsettypes.InboundQueueRecord{}
					if tc.senderIsTarget {
						expectedRecords = append(expectedRecords, swingsettypes.InboundQueueRecord{
							Action: &vibctypes.AcknowledgementPacketEvent{
								ActionHeader: &vm.ActionHeader{
									Type:        "VTRANSFER_IBC_EVENT",
									BlockHeight: acknowledgementHeight,
									BlockTime:   acknowledgementTime,
								},
								Event:           "acknowledgementPacket",
								Target:          baseSender,
								Packet:          types.CopyToIBCPacket(expectedPacket),
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

				// Verify the resulting received coin balance.
				req := &banktypes.QueryAllBalancesRequest{
					Address: baseReceiver,
				}
				res, err := s.GetApp(s.chainB).BankKeeper.AllBalances(s.chainB.GetContext(), req)
				s.Require().NoError(err)

				amt, ok := sdkmath.NewIntFromString(transferData.Amount)
				s.Require().True(ok)

				// Decode the denom trace to get the denom hash.
				hashReq := &ibctransfertypes.QueryDenomHashRequest{
					Trace: denomTrace,
				}
				hashRes, err := s.GetApp(s.chainB).TransferKeeper.DenomHash(s.chainB.GetContext(), hashReq)
				s.Require().NoError(err)
				receivedDenom := `ibc/` + hashRes.Hash

				coins := sdk.NewCoins(sdk.NewCoin(receivedDenom, amt))
				s.Require().True(coins.Equal(res.Balances))
			})
		}
	}
}
