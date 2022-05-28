package vstorage

import (
	"encoding/json"
	"errors"
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
)

type vstorageHandler struct {
	keeper Keeper
}

type vstorageMessage struct {
	Method string `json:"method"`
	Key    string `json:"key"`
	Value  string `json:"value"`
}

func NewStorageHandler(keeper Keeper) vstorageHandler {
	return vstorageHandler{keeper: keeper}
}

func (sh vstorageHandler) Receive(cctx *vm.ControllerContext, str string) (ret string, err error) {
	keeper := sh.keeper
	msg := new(vstorageMessage)
	err = json.Unmarshal([]byte(str), &msg)
	if err != nil {
		return
	}

	// Allow recovery from OutOfGas panics so that we don't crash
	defer func() {
		if r := recover(); r != nil {
			switch rType := r.(type) {
			case sdk.ErrorOutOfGas:
				err = fmt.Errorf(
					"out of gas in location: %v; gasUsed: %d",
					rType.Descriptor, cctx.Context.GasMeter().GasConsumed(),
				)
			default:
				// Not ErrorOutOfGas, so panic again.
				panic(r)
			}
		}
	}()

	// Handle generic paths.
	switch msg.Method {
	case "set":
		//fmt.Printf("giving Keeper.SetStorage(%s) %s\n", msg.Key, msg.Value)
		keeper.LegacySetStorageAndNotify(cctx.Context, msg.Key, msg.Value)
		return "true", nil

	case "get":
		value := keeper.GetData(cctx.Context, msg.Key)
		if value == "" {
			return "null", nil
		}
		//fmt.Printf("Keeper.GetStorage gave us %bz\n", value)
		bz, err := json.Marshal(value)
		if err != nil {
			return "", err
		}
		return string(bz), nil

	case "has":
		value := keeper.GetData(cctx.Context, msg.Key)
		if value == "" {
			return "false", nil
		}
		return "true", nil

	case "keys":
		keys := keeper.GetKeys(cctx.Context, msg.Key)
		if keys.Keys == nil {
			return "[]", nil
		}
		bytes, err := json.Marshal(keys.Keys)
		if err != nil {
			return "", err
		}
		return string(bytes), nil

	case "entries":
		keys := keeper.GetKeys(cctx.Context, msg.Key)
		ents := make([][]string, len(keys.Keys))
		for i, key := range keys.Keys {
			ents[i] = make([]string, 2)
			ents[i][0] = key
			ents[i][i] = keeper.GetData(cctx.Context, fmt.Sprintf("%s.%s", msg.Key, key))
		}
		bytes, err := json.Marshal(ents)
		if err != nil {
			return "", err
		}
		return string(bytes), nil

	case "values":
		keys := keeper.GetKeys(cctx.Context, msg.Key)
		vals := make([]string, len(keys.Keys))
		for i, key := range keys.Keys {
			vals[i] = keeper.GetData(cctx.Context, fmt.Sprintf("%s.%s", msg.Key, key))
		}
		bytes, err := json.Marshal(vals)
		if err != nil {
			return "", err
		}
		return string(bytes), nil

	case "size":
		keys := keeper.GetKeys(cctx.Context, msg.Key)
		if keys.Keys == nil {
			return "0", nil
		}
		return fmt.Sprint(len(keys.Keys)), nil
	}

	return "", errors.New("Unrecognized msg.Method " + msg.Method)
}
