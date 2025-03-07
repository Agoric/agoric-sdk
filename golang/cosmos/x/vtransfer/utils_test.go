package vtransfer_test

import (
	"fmt"
	"strconv"

	sdk "github.com/cosmos/cosmos-sdk/types"
	clienttypes "github.com/cosmos/ibc-go/v6/modules/core/02-client/types"
	channeltypes "github.com/cosmos/ibc-go/v6/modules/core/04-channel/types"
	host "github.com/cosmos/ibc-go/v6/modules/core/24-host"
	ibctesting "github.com/cosmos/ibc-go/v6/testing"
)

// acknowledgePacketWithResult sends a MsgAcknowledgement to the channel associated with the endpoint.
// [AGORIC] Would be nice to create a new ibctesting.AcknowledgePacketWithResult
func acknowledgePacketWithResult(endpoint *ibctesting.Endpoint, packet channeltypes.Packet, ack []byte) (*sdk.Result, error) {
	// get proof of acknowledgement on counterparty
	packetKey := host.PacketAcknowledgementKey(packet.GetDestPort(), packet.GetDestChannel(), packet.GetSequence())
	proof, proofHeight := endpoint.Counterparty.QueryProof(packetKey)

	ackMsg := channeltypes.NewMsgAcknowledgement(packet, ack, proof, proofHeight, endpoint.Chain.SenderAccount.GetAddress().String())

	return endpoint.Chain.SendMsgs(ackMsg)
}

// ParseAckFromEvents parses events emitted from a MsgRecvPacket and returns the
// acknowledgement.
// [AGORIC] Signature taken from ibctesting.ParseAckFromEvents
func ParseAckFromEvents(events sdk.Events) ([]byte, error) {
	return ParseAckFromFilteredEvents(events, channeltypes.EventTypeWriteAck)
}

// ParseAckFromFilteredEvents parses events emitted matching filteredType and returns the acknowledgement.
// [AGORIC] Would be nice to improve the implementation and upstream it
func ParseAckFromFilteredEvents(events sdk.Events, filteredType string) ([]byte, error) {
	for _, ev := range events {
		if ev.Type == filteredType {
			for _, attr := range ev.Attributes {
				if string(attr.Key) == channeltypes.AttributeKeyAck { //nolint:staticcheck // DEPRECATED
					return attr.Value, nil
				}
			}
		}
	}
	return nil, fmt.Errorf("acknowledgement event attribute not found")
}

// ParsePacketFromEvents parses the send_packet type events emitted by the IBC
// module and returns the packet.
// [AGORIC] Signature taken from ibctesting.ParsePacketFromEvents
func ParsePacketFromEvents(events sdk.Events) (channeltypes.Packet, error) {
	return ParsePacketFromFilteredEvents(events, channeltypes.EventTypeSendPacket)
}

// ParsePacketFromFilteredEvents parses events emitted matching filteredType and returns the packet.
// [AGORIC] Would be nice to improve the implementation and upstream it
func ParsePacketFromFilteredEvents(events sdk.Events, filteredType string) (channeltypes.Packet, error) {
	for _, ev := range events {
		if ev.Type == filteredType {
			packet := channeltypes.Packet{}
			for _, attr := range ev.Attributes {
				switch string(attr.Key) {
				case channeltypes.AttributeKeyData: //nolint:staticcheck // DEPRECATED
					packet.Data = attr.Value

				case channeltypes.AttributeKeySequence:
					seq, err := strconv.ParseUint(string(attr.Value), 10, 64)
					if err != nil {
						return channeltypes.Packet{}, err
					}

					packet.Sequence = seq

				case channeltypes.AttributeKeySrcPort:
					packet.SourcePort = string(attr.Value)

				case channeltypes.AttributeKeySrcChannel:
					packet.SourceChannel = string(attr.Value)

				case channeltypes.AttributeKeyDstPort:
					packet.DestinationPort = string(attr.Value)

				case channeltypes.AttributeKeyDstChannel:
					packet.DestinationChannel = string(attr.Value)

				case channeltypes.AttributeKeyTimeoutHeight:
					height, err := clienttypes.ParseHeight(string(attr.Value))
					if err != nil {
						return channeltypes.Packet{}, err
					}

					packet.TimeoutHeight = height

				case channeltypes.AttributeKeyTimeoutTimestamp:
					timestamp, err := strconv.ParseUint(string(attr.Value), 10, 64)
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
