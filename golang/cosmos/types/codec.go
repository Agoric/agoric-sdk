package types

import (
	"github.com/cosmos/cosmos-sdk/codec"
	cdctypes "github.com/cosmos/cosmos-sdk/codec/types"
)

var (
	// packageCdc is the codec used for proto3 JSON serialization of proto.Message
	// data structures that wouldn't otherwise survive round-tripping via a
	// regular "encoding/json" Marshal->JSON.parse.
	//
	// The naïve json.Marshal output for an int64 (64-bit precision) is a JSON
	// number, which is subject to rounding errors when parsed by JavaScript
	// (whose numbers are IEEE 754 binary64 values with only 53-bit precision).
	// The codec.ProtoCodec uses a custom JSON marshaller that converts each int64
	// to and from a string with no loss of precision.
	//
	// The current package's IBCPacket was one such affected data structure, which
	// now implements Marshaler and Unmarshaler interfaces for "encoding/json" to
	// take advantage of the packageCdc.
	packageCdc = codec.NewProtoCodec(cdctypes.NewInterfaceRegistry())
)
