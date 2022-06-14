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
	Path   string `json:"key"` // TODO: rename JSON to "path"
	Value  string `json:"value"`
}

type vstorageStoreKey struct {
	StoreName       string `json:"storeName"`
	StoreSubkey     string `json:"storeSubkey"`
	DataPrefixBytes string `json:"dataPrefixBytes"`
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
		keeper.SetStorageAndNotify(cctx.Context, msg.Path, msg.Value)
		return "true", nil

	case "get":
		value := keeper.GetData(cctx.Context, msg.Path)
		if value == "" {
			return "null", nil
		}
		//fmt.Printf("Keeper.GetStorage gave us %bz\n", value)
		bz, err := json.Marshal(value)
		if err != nil {
			return "", err
		}
		return string(bz), nil

	case "getStoreKey":
		value := vstorageStoreKey{
			StoreName:       keeper.GetStoreName(),
			StoreSubkey:     string(keeper.PathToEncodedKey(msg.Path)),
			DataPrefixBytes: string(keeper.GetDataPrefix()),
		}
		bz, err := json.Marshal(value)
		if err != nil {
			return "", err
		}
		return string(bz), nil

	case "has":
		value := keeper.GetData(cctx.Context, msg.Path)
		if value == "" {
			return "false", nil
		}
		return "true", nil

	// TODO: "keys" is deprecated
	case "children", "keys":
		children := keeper.GetChildren(cctx.Context, msg.Path)
		if children.Children == nil {
			return "[]", nil
		}
		bytes, err := json.Marshal(children.Children)
		if err != nil {
			return "", err
		}
		return string(bytes), nil

	case "entries":
		children := keeper.GetChildren(cctx.Context, msg.Path)
		ents := make([][]string, len(children.Children))
		for i, child := range children.Children {
			ents[i] = make([]string, 2)
			ents[i][0] = child
			ents[i][i] = keeper.GetData(cctx.Context, fmt.Sprintf("%s.%s", msg.Path, child))
		}
		bytes, err := json.Marshal(ents)
		if err != nil {
			return "", err
		}
		return string(bytes), nil

	case "values":
		children := keeper.GetChildren(cctx.Context, msg.Path)
		vals := make([]string, len(children.Children))
		for i, child := range children.Children {
			vals[i] = keeper.GetData(cctx.Context, fmt.Sprintf("%s.%s", msg.Path, child))
		}
		bytes, err := json.Marshal(vals)
		if err != nil {
			return "", err
		}
		return string(bytes), nil

	case "size":
		children := keeper.GetChildren(cctx.Context, msg.Path)
		if children.Children == nil {
			return "0", nil
		}
		return fmt.Sprint(len(children.Children)), nil
	}

	return "", errors.New("Unrecognized msg.Method " + msg.Method)
}
