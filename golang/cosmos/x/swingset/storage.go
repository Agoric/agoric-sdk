package swingset

import (
	"encoding/json"
	"errors"
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

type storageHandler struct {
	keeper Keeper
}

type storageMessage struct {
	Method string `json:"method"`
	Key    string `json:"key"`
	Value  string `json:"value"`
}

func NewStorageHandler(keeper Keeper) storageHandler {
	return storageHandler{keeper: keeper}
}

func (sh storageHandler) Receive(ctx *ControllerContext, str string) (ret string, err error) {
	keeper := sh.keeper
	msg := new(storageMessage)
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
					rType.Descriptor, ctx.Context.GasMeter().GasConsumed(),
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
		storage := NewStorage()
		storage.Value = msg.Value
		//fmt.Printf("giving Keeper.SetStorage(%s) %s\n", msg.Key, storage.Value)
		keeper.SetStorage(ctx.Context, msg.Key, storage)
		return "true", nil

	case "get":
		storage := keeper.GetStorage(ctx.Context, msg.Key)
		if storage.Value == "" {
			return "null", nil
		}
		//fmt.Printf("Keeper.GetStorage gave us %s\n", storage.Value)
		s, err := json.Marshal(storage.Value)
		if err != nil {
			return "", err
		}
		return string(s), nil

	case "has":
		storage := keeper.GetStorage(ctx.Context, msg.Key)
		if storage.Value == "" {
			return "false", nil
		}
		return "true", nil

	case "keys":
		keys := keeper.GetKeys(ctx.Context, msg.Key)
		if keys.Keys == nil {
			return "[]", nil
		}
		bytes, err := json.Marshal(keys.Keys)
		if err != nil {
			return "", err
		}
		return string(bytes), nil

	case "entries":
		keys := keeper.GetKeys(ctx.Context, msg.Key)
		ents := make([][]string, len(keys.Keys))
		for i, key := range keys.Keys {
			ents[i] = make([]string, 2)
			ents[i][0] = key
			storage := keeper.GetStorage(ctx.Context, fmt.Sprintf("%s.%s", msg.Key, key))
			ents[i][1] = storage.Value
		}
		bytes, err := json.Marshal(ents)
		if err != nil {
			return "", err
		}
		return string(bytes), nil

	case "values":
		keys := keeper.GetKeys(ctx.Context, msg.Key)
		vals := make([]string, len(keys.Keys))
		for i, key := range keys.Keys {
			storage := keeper.GetStorage(ctx.Context, fmt.Sprintf("%s.%s", msg.Key, key))
			vals[i] = storage.Value
		}
		bytes, err := json.Marshal(vals)
		if err != nil {
			return "", err
		}
		return string(bytes), nil

	case "size":
		keys := keeper.GetKeys(ctx.Context, msg.Key)
		if keys.Keys == nil {
			return "0", nil
		}
		return string(len(keys.Keys)), nil
	}

	return "", errors.New("Unrecognized msg.Method " + msg.Method)
}
