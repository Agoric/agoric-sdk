package types

import (
	sdkioerrors "cosmossdk.io/errors"
	"cosmossdk.io/x/tx/signing"

	sdk "github.com/cosmos/cosmos-sdk/types"

	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"

	agtypes "github.com/Agoric/agoric-sdk/golang/cosmos/types"
	clienttypes "github.com/cosmos/ibc-go/v10/modules/core/02-client/types"
	ibcexported "github.com/cosmos/ibc-go/v10/modules/core/exported"

	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/protoadapt"
	"google.golang.org/protobuf/reflect/protoreflect"
)

const RouterKey = ModuleName // this was defined in your key.go file

var _ sdk.Msg = &MsgSendPacket{}
var _ ibcexported.PacketI = (*Packet)(nil)

// Replacing msg.GetSigners() but before we can adopt AddressString.
// https://github.com/cosmos/cosmos-sdk/issues/20077#issuecomment-2062601533
func createSignerFieldFunc(fieldName protoreflect.Name) signing.GetSignersFunc {
	return func(msgIn proto.Message) ([][]byte, error) {
		msg := msgIn.ProtoReflect()
		if !msg.Has(msg.Descriptor().Fields().ByName(fieldName)) {
			return nil, sdkioerrors.Wrapf(sdkerrors.ErrInvalidRequest, "message %T does not have field %s", msgIn, fieldName)
		}
		addr := msg.Get(msg.Descriptor().Fields().ByName(fieldName)).Interface().([]byte)
		return [][]byte{addr}, nil
	}
}

func DefineCustomGetSigners(options *signing.Options) {
	options.DefineCustomGetSigners(
		proto.MessageName(protoadapt.MessageV2Of(&MsgSendPacket{})),
		createSignerFieldFunc("sender"),
	)
}

func (p Packet) ValidateBasic() error {
	channelPacket := agtypes.CopyToChannelPacket(p);
	return channelPacket.ValidateBasic()
}

// NewMsgSendPacket returns a new send request
func NewMsgSendPacket(packet ibcexported.PacketI, sender sdk.AccAddress) *MsgSendPacket {
	timeoutHeight := clienttypes.MustParseHeight(packet.GetTimeoutHeight().String())
	localPacket := Packet{
		Sequence:       packet.GetSequence(),
		SourcePort:     packet.GetSourcePort(),
		SourceChannel:  packet.GetSourceChannel(),
		DestinationPort: packet.GetDestPort(),
		DestinationChannel: packet.GetDestChannel(),
		Data:           packet.GetData(),
		TimeoutHeight: Height{
			RevisionNumber: timeoutHeight.RevisionNumber,
			RevisionHeight: timeoutHeight.RevisionHeight,
		},
		TimeoutTimestamp: packet.GetTimeoutTimestamp(),
	}
	return &MsgSendPacket{
		Packet: localPacket,
		Sender: sender,
	}
}

// Route implements sdk.Msg
func (msg MsgSendPacket) Route() string { return RouterKey }

// ValidateBasic implements sdk.Msg
func (msg MsgSendPacket) ValidateBasic() error {
	if msg.Sender.Empty() {
		return sdkerrors.ErrInvalidAddress
	}

	return msg.Packet.ValidateBasic()
}

// GetSigners defines whose signature is required
func (msg MsgSendPacket) GetSigners() []sdk.AccAddress {
	return []sdk.AccAddress{msg.Sender}
}

// Type implements sdk.Msg
func (msg MsgSendPacket) Type() string {
	return "sendpacket"
}

func (p Packet) GetSequence() uint64 {
	return p.Sequence
}

func (p Packet) GetSourcePort() string {
	return p.SourcePort
}

func (p Packet) GetSourceChannel() string {
	return p.SourceChannel
}

func (p Packet) GetDestPort() string {
	return p.DestinationPort
}

func (p Packet) GetDestChannel() string {
	return p.DestinationChannel
}

func (p Packet) GetData() []byte {
	return p.Data
}

func (p Packet) GetTimeoutHeight() ibcexported.Height {
	return clienttypes.Height{
		RevisionNumber: p.TimeoutHeight.RevisionNumber,
		RevisionHeight: p.TimeoutHeight.RevisionHeight,
	}
}

func (p Packet) GetTimeoutTimestamp() uint64 {
	return p.TimeoutTimestamp
}
