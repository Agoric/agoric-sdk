package swingset

import (
	"github.com/cosmos/cosmos-sdk/codec"
)

// RegisterCodec registers concrete types on the Amino codec
func RegisterCodec(cdc *codec.Codec) {
	cdc.RegisterConcrete(MsgSetName{}, "swingset/SetName", nil)
	cdc.RegisterConcrete(MsgBuyName{}, "swingset/BuyName", nil)
}
