package types

import (
	"encoding/json"
	fmt "fmt"
	io "io"

	"cosmossdk.io/x/tx/signing/aminojson"
	types "github.com/cosmos/cosmos-sdk/types"
	"google.golang.org/protobuf/reflect/protoreflect"
)

func LegacyAddressEncoder(_enc *aminojson.Encoder, value protoreflect.Value, w io.Writer) error {
	fmt.Printf("DEBUG: LegacyAddressEncoder!!!!!!!!!!!!: %+v\n")
	switch valueAddress := value.Interface().(type) {
	case []byte:
		if len(valueAddress) == 0 {
			_, err := w.Write([]byte(`""`))
			return err
		}
		err := types.VerifyAddressFormat(valueAddress)
		if err != nil {
			return err
		}
		var accAddr types.AccAddress = valueAddress
		marshalledAddr, err := json.Marshal(accAddr)
		if err != nil {
			return err
		}

		_, err = w.Write(marshalledAddr)

		return err

	case string:
		if valueAddress == "" {
			_, err := w.Write([]byte(`""`))
			return err
		}
		accAddr, err := types.AccAddressFromBech32(valueAddress)
		if err != nil {
			return err
		}
		marshalledAddr, err := json.Marshal(accAddr)
		if err != nil {
			return err
		}

		_, err = w.Write(marshalledAddr)
		return err

	default:
		return fmt.Errorf("address cannot be encoded wrong type")
	}
}

// DefineFieldEncoding defines a custom encoding for a protobuf field.  The `name` field must match a usage of
// an (amino.encoding) option in the protobuf message as in the following example. This encoding will be used
// instead of the default encoding for all usages of the tagged field.
//
//	message Balance {
//	  repeated cosmos.base.v1beta1.Coin coins = 2 [
//	    (amino.encoding)         = "legacy_coins",
//	    (gogoproto.castrepeated) = "github.com/cosmos/cosmos-sdk/types.Coins",
//	    (gogoproto.nullable)     = false,
//	    (amino.dont_omitempty)   = true
//	  ];
//	  ...
//	}
// func (enc Encoder) DefineFieldEncoding(name string, encoder FieldEncoder) Encoder {
// 	if enc.aminoFieldEncoders == nil {
// 		enc.aminoFieldEncoders = map[string]FieldEncoder{}
// 	}
// 	enc.aminoFieldEncoders[name] = encoder
// 	return enc
// }

// // nullSliceAsEmptyEncoder replicates the behavior at:
// // https://github.com/cosmos/cosmos-sdk/blob/be9bd7a8c1b41b115d58f4e76ee358e18a52c0af/types/coin.go#L199-L205
// func nullSliceAsEmptyEncoder(enc *aminojson.Encoder, v protoreflect.Value, w io.Writer) error {
// 	switch list := v.Interface().(type) {
// 	case protoreflect.List:
// 		if list.Len() == 0 {
// 			_, err := io.WriteString(w, "[]")
// 			return err
// 		}
// 		return enc.marshalList(list, nil /* no field descriptor available here */, w)
// 	default:x
// 		return fmt.Errorf("unsupported type %T", list)
// 	}
// }
