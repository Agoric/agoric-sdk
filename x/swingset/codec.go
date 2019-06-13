package swingset

import (
	"github.com/cosmos/cosmos-sdk/codec"
)

var ModuleCdc *codec.Codec

// RegisterCodec registers concrete types on the Amino codec
func RegisterCodec(cdc *codec.Codec) {
	ModuleCdc = cdc
	cdc.RegisterConcrete(MsgDeliverInbound{}, "swingset/DeliverInbound", nil)
}
