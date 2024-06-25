package vm

import (
	"encoding/json"

	"github.com/Agoric/agoric-sdk/golang/cosmos/types/conv"
	"github.com/gogo/protobuf/jsonpb"
	"github.com/gogo/protobuf/proto"
)

// We need jsonpb for its access to the global registry.
var marshaller = jsonpb.Marshaler{EmitDefaults: true}

func ProtoJSONMarshal(val interface{}) (string, error) {
	if pm, ok := val.(proto.Message); ok {
		var s string
		s, err := marshaller.MarshalToString(pm)
		return s, err
	}

	// Marshal a non-proto value to JSON.
	return conv.MarshalToJSONString(val)
}

// ProtoJSONMarshalSlice marshals a slice of proto messages and non-proto values to
// a single JSON string.
func ProtoJSONMarshalSlice(vals []interface{}) (string, error) {
	jsonSlice := make([]json.RawMessage, len(vals))
	for i, val := range vals {
		slice, err := ProtoJSONMarshal(val)
		if err != nil {
			return "", err
		}
		jsonSlice[i] = []byte(slice)
	}

	// Marshal the JSON array to a single JSON string.
	return conv.MarshalToJSONString(jsonSlice)
}
