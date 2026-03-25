package vtransfer_test

import (
	"encoding/hex"
	"fmt"
	"strconv"

	abci "github.com/cometbft/cometbft/abci/types"
	clienttypes "github.com/cosmos/ibc-go/v8/modules/core/02-client/types"
	channeltypes "github.com/cosmos/ibc-go/v8/modules/core/04-channel/types"
	host "github.com/cosmos/ibc-go/v8/modules/core/24-host"
	ibctesting "github.com/cosmos/ibc-go/v8/testing"
)

// acknowledgePacketWithResult sends a MsgAcknowledgement to the channel associated with the endpoint.
// [AGORIC] Would be nice to create a new ibctesting.AcknowledgePacketWithResult
func acknowledgePacketWithResult(endpoint *ibctesting.Endpoint, packet channeltypes.Packet, ack []byte) (*abci.ExecTxResult, error) {
	// get proof of acknowledgement on counterparty
	packetKey := host.PacketAcknowledgementKey(packet.GetDestPort(), packet.GetDestChannel(), packet.GetSequence())
	proof, proofHeight := endpoint.Counterparty.QueryProof(packetKey)

	ackMsg := channeltypes.NewMsgAcknowledgement(packet, ack, proof, proofHeight, endpoint.Chain.SenderAccount.GetAddress().String())

	return endpoint.Chain.SendMsgs(ackMsg)
}

// ParseAckFromEvents parses events emitted from a MsgRecvPacket and returns the
// acknowledgement.
// [AGORIC] Signature taken from ibctesting.ParseAckFromEvents
func ParseAckFromEvents(events []abci.Event) ([]byte, error) {
	return ParseAckFromFilteredEvents(events, channeltypes.EventTypeWriteAck)
}

// ParseAckFromFilteredEvents parses events emitted matching filteredType and returns the acknowledgement.
// [AGORIC] Would be nice to improve the implementation and upstream it
func ParseAckFromFilteredEvents(events []abci.Event, filteredType string) ([]byte, error) {
	for _, ev := range events {
		if ev.Type == filteredType {
			for _, attr := range ev.Attributes {
				switch attr.Key {
				case channeltypes.AttributeKeyAckHex:
					hexAck, err := hex.DecodeString(attr.Value)
					if err != nil {
						return nil, fmt.Errorf("failed to parse hex ack: %w", err)
					}
					return hexAck, nil
				case channeltypes.AttributeKeyAck: //nolint:staticcheck // DEPRECATED
					return []byte(attr.Value), nil
				}
			}
		}
	}
	return nil, fmt.Errorf("acknowledgement event attribute not found")
}

// ParsePacketFromEvents parses the send_packet type events emitted by the IBC
// module and returns the packet.
// [AGORIC] Signature taken from ibctesting.ParsePacketFromEvents
func ParsePacketFromEvents(events []abci.Event) (channeltypes.Packet, error) {
	return ParsePacketFromFilteredEvents(events, channeltypes.EventTypeSendPacket)
}

// ParsePacketFromFilteredEvents parses events emitted matching filteredType and returns the packet.
// [AGORIC] Would be nice to improve the implementation and upstream it
func ParsePacketFromFilteredEvents(events []abci.Event, filteredType string) (channeltypes.Packet, error) {
	for _, ev := range events {
		if ev.Type == filteredType {
			packet := channeltypes.Packet{}
			for _, attr := range ev.Attributes {
				switch attr.Key {
				case channeltypes.AttributeKeyDataHex:
					hexData, err := hex.DecodeString(attr.Value)
					if err != nil {
						return channeltypes.Packet{}, fmt.Errorf("failed to parse hex data: %w", err)
					}
					packet.Data = hexData

				case channeltypes.AttributeKeyData: //nolint:staticcheck // DEPRECATED
					packet.Data = []byte(attr.Value)

				case channeltypes.AttributeKeySequence:
					seq, err := strconv.ParseUint(attr.Value, 10, 64)
					if err != nil {
						return channeltypes.Packet{}, err
					}

					packet.Sequence = seq

				case channeltypes.AttributeKeySrcPort:
					packet.SourcePort = attr.Value

				case channeltypes.AttributeKeySrcChannel:
					packet.SourceChannel = attr.Value

				case channeltypes.AttributeKeyDstPort:
					packet.DestinationPort = attr.Value

				case channeltypes.AttributeKeyDstChannel:
					packet.DestinationChannel = attr.Value

				case channeltypes.AttributeKeyTimeoutHeight:
					height, err := clienttypes.ParseHeight(attr.Value)
					if err != nil {
						return channeltypes.Packet{}, err
					}

					packet.TimeoutHeight = height

				case channeltypes.AttributeKeyTimeoutTimestamp:
					timestamp, err := strconv.ParseUint(attr.Value, 10, 64)
					if err != nil {
						return channeltypes.Packet{}, err
					}

					packet.TimeoutTimestamp = timestamp

				default:
					continue
				}
			}

			return packet, nil
		}
	}
	return channeltypes.Packet{}, fmt.Errorf("filtered event type %s not found", filteredType)
}
