package types

import (
	"encoding/json"

	clienttypes "github.com/cosmos/ibc-go/v7/modules/core/02-client/types"
	channeltypes "github.com/cosmos/ibc-go/v7/modules/core/04-channel/types"
	"github.com/cosmos/ibc-go/v7/modules/core/exported"
)

var _ json.Marshaler = IBCPacket{}
var _ json.Unmarshaler = (*IBCPacket)(nil)
var _ exported.PacketI = IBCPacket{}

type IBCPacket struct {
	channeltypes.Packet
}

func (p IBCPacket) MarshalJSON() ([]byte, error) {
	return packageCdc.MarshalJSON(&p.Packet)
}

func (p *IBCPacket) UnmarshalJSON(bz []byte) error {
	return packageCdc.UnmarshalJSON(bz, &p.Packet)
}

func MakeIBCPacket(
	data []byte,
	sequence uint64,
	sourcePort string,
	sourceChannel string,
	destPort string,
	destChannel string,
	timeoutHeight clienttypes.Height,
	timeoutTimestamp uint64,
) IBCPacket {
	cp := channeltypes.NewPacket(
		data, sequence,
		sourcePort, sourceChannel,
		destPort, destChannel,
		timeoutHeight, timeoutTimestamp,
	)
	return IBCPacket{Packet: cp}
}

func CopyToChannelPacket(packet exported.PacketI) channeltypes.Packet {
	timeoutHeight := clienttypes.MustParseHeight(packet.GetTimeoutHeight().String())
	return channeltypes.NewPacket(
		packet.GetData(), packet.GetSequence(),
		packet.GetSourcePort(), packet.GetSourceChannel(),
		packet.GetDestPort(), packet.GetDestChannel(),
		timeoutHeight, packet.GetTimeoutTimestamp(),
	)
}

func CopyToIBCPacket(packet exported.PacketI) IBCPacket {
	timeoutHeight := clienttypes.MustParseHeight(packet.GetTimeoutHeight().String())
	return MakeIBCPacket(
		packet.GetData(), packet.GetSequence(),
		packet.GetSourcePort(), packet.GetSourceChannel(),
		packet.GetDestPort(), packet.GetDestChannel(),
		timeoutHeight, packet.GetTimeoutTimestamp(),
	)
}
