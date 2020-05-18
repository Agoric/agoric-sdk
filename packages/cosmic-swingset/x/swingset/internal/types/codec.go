package types

import (
	"github.com/cosmos/cosmos-sdk/codec"
)

var ModuleCdc *codec.Codec

// RegisterCodec registers concrete types on the Amino codec
func RegisterCodec(cdc *codec.Codec) {
	cdc.RegisterConcrete(MsgDeliverInbound{}, "swingset/DeliverInbound", nil)
	cdc.RegisterConcrete(MsgSendPacket{}, "swingset/SendPacket", nil)
	cdc.RegisterConcrete(MsgProvision{}, "swingset/Provision", nil)
	ModuleCdc = cdc
}
