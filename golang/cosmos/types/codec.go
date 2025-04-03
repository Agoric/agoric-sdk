package types

import (
	"github.com/cosmos/cosmos-sdk/codec"
	cdctypes "github.com/cosmos/cosmos-sdk/codec/types"
)

var (
	// ModuleCdc references the global agtypes module codec. Note, the codec
	// should ONLY be used in certain instances of tests and for JSON encoding.
	//
	// The actual codec used for serialization should be provided to x/swingset and
	// defined at the application level.
	packageCdc = codec.NewProtoCodec(cdctypes.NewInterfaceRegistry())
)
