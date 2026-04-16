package types

import (
	"encoding/json"
	fmt "fmt"
	io "io"

	"cosmossdk.io/x/tx/signing/aminojson"
	types "github.com/cosmos/cosmos-sdk/types"
	"google.golang.org/protobuf/reflect/protoreflect"
)

func marshalJson(value interface{}, w io.Writer) error {
	marshalledAddr, err := json.Marshal(value)
	if err != nil {
		return err
	}
	_, err = w.Write(marshalledAddr)
	return err
}

func LegacyAddressEncoder(_enc *aminojson.Encoder, value protoreflect.Value, w io.Writer) error {
	switch valueAddress := value.Interface().(type) {
	case []byte:
		if len(valueAddress) == 0 {
			err := marshalJson("", w)
			return err
		}
		err := types.VerifyAddressFormat(valueAddress)
		if err != nil {
			return err
		}
		var accAddr types.AccAddress = valueAddress
		err = marshalJson(accAddr, w)
		if err != nil {
			return err
		}
		return nil

	case string:
		if valueAddress == "" {
			err := marshalJson(valueAddress, w)
			return err
		}
		accAddr, err := types.AccAddressFromBech32(valueAddress)
		if err != nil {
			return err
		}
		err = marshalJson(accAddr, w)
		if err != nil {
			return err
		}
		return nil

	default:
		return fmt.Errorf("address cannot be encoded wrong type")
	}
}
