package vstorage

import (
	"encoding/json"
	"errors"
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vstorage/types"
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
	NoDataValue     string `json:"noDataValue"`
}

func MakeSetEntryFromMessage(msg *vstorageMessage) types.StorageEntry {
	if msg.Value == "" {
		return types.NewStorageEntryWithNoData(msg.Path)
	} else {
		return types.NewStorageEntry(msg.Path, msg.Value)
	}
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
		keeper.SetStorageAndNotify(cctx.Context, MakeSetEntryFromMessage(msg))
		return "true", nil

		// We sometimes need to use LegacySetStorageAndNotify, because the solo's
		// chain-cosmos-sdk.js consumes legacy events for `mailbox.*` and `egress.*`.
		// FIXME: Use just "set" and remove this case.
	case "legacySet":
		//fmt.Printf("giving Keeper.SetStorage(%s) %s\n", msg.Key, msg.Value)
		keeper.LegacySetStorageAndNotify(cctx.Context, MakeSetEntryFromMessage(msg))
		return "true", nil

	case "setWithoutNotify":
		keeper.SetStorage(cctx.Context, MakeSetEntryFromMessage(msg))
		return "true", nil

	case "append":
		err = keeper.AppendStorageValueAndNotify(cctx.Context, msg.Path, msg.Value)
		if err != nil {
			return "", err
		}
		return "true", nil

	case "get":
		// Note that "get" does not (currently) unwrap a StreamCell.
		entry := keeper.GetEntry(cctx.Context, msg.Path)
		if !entry.HasData() {
			return "null", nil
		}
		bz, err := json.Marshal(entry.StringValue())
		if err != nil {
			return "", err
		}
		return string(bz), nil

	case "getStoreKey":
		value := vstorageStoreKey{
			StoreName:       keeper.GetStoreName(),
			StoreSubkey:     string(keeper.PathToEncodedKey(msg.Path)),
			DataPrefixBytes: string(keeper.GetDataPrefix()),
			NoDataValue:     string(keeper.GetNoDataValue()),
		}
		bz, err := json.Marshal(value)
		if err != nil {
			return "", err
		}
		return string(bz), nil

	case "has":
		value := keeper.HasStorage(cctx.Context, msg.Path)
		if !value {
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
			ents[i][i] = keeper.GetEntry(cctx.Context, fmt.Sprintf("%s.%s", msg.Path, child)).StringValue()
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
			vals[i] = keeper.GetEntry(cctx.Context, fmt.Sprintf("%s.%s", msg.Path, child)).StringValue()
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
