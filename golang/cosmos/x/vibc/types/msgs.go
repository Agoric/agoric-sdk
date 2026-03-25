package types

import (
	sdkioerrors "cosmossdk.io/errors"
	"cosmossdk.io/x/tx/signing"

	sdk "github.com/cosmos/cosmos-sdk/types"

	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"

	chanTypes "github.com/cosmos/ibc-go/v8/modules/core/04-channel/types"

	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/protoadapt"
	"google.golang.org/protobuf/reflect/protoreflect"
)

const RouterKey = ModuleName // this was defined in your key.go file

var _ sdk.Msg = &MsgSendPacket{}

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

// NewMsgSendPacket returns a new send request
func NewMsgSendPacket(packet chanTypes.Packet, sender sdk.AccAddress) *MsgSendPacket {
	return &MsgSendPacket{
		Packet: packet,
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
