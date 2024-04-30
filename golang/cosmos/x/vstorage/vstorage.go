package vstorage

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"

	agoric "github.com/Agoric/agoric-sdk/golang/cosmos/types"
)

type vstorageHandler struct {
	keeper Keeper
}

type vstorageMessage struct {
	Method string            `json:"method"`
	Args   []json.RawMessage `json:"args"`
}

type vstorageStoreKey struct {
	StoreName       string `json:"storeName"`
	StoreSubkey     string `json:"storeSubkey"`
	DataPrefixBytes string `json:"dataPrefixBytes"`
	NoDataValue     string `json:"noDataValue"`
}

func NewStorageHandler(keeper Keeper) vstorageHandler {
	return vstorageHandler{keeper: keeper}
}

func unmarshalString(jsonText json.RawMessage) (string, error) {
	var str *string
	if err := json.Unmarshal(jsonText, &str); err != nil {
		return "", err
	} else if str == nil {
		return "", fmt.Errorf("cannot unmarshal `null` into string")
	}
	return *str, nil
}

func unmarshalSinglePathFromArgs(args []json.RawMessage) (string, error) {
	if len(args) == 0 {
		return "", fmt.Errorf("missing 'path' argument")
	} else if len(args) != 1 {
		return "", fmt.Errorf("extra arguments after 'path'")
	}
	return unmarshalString(args[0])
}

func unmarshalPathsFromArgs(args []json.RawMessage) ([]string, error) {
	paths := make([]string, len(args))
	for i, arg := range args {
		path, err := unmarshalString(arg)
		if err != nil {
			return nil, err
		}
		paths[i] = path
	}
	return paths, nil
}

func (sh vstorageHandler) Receive(cctx context.Context, str string) (ret string, err error) {
	ctx := sdk.UnwrapSDKContext(cctx)
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
					rType.Descriptor, ctx.GasMeter().GasConsumed(),
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
		for _, arg := range msg.Args {
			var entry agoric.KVEntry
			err = json.Unmarshal(arg, &entry)
			if err != nil {
				return
			}
			keeper.SetStorageAndNotify(ctx, entry)
		}
		return "true", nil

		// We sometimes need to use LegacySetStorageAndNotify, because the solo's
		// chain-cosmos-sdk.js consumes legacy events for `mailbox.*` and `egress.*`.
		// FIXME: Use just "set" and remove this case.
	case "legacySet":
		for _, arg := range msg.Args {
			var entry agoric.KVEntry
			err = json.Unmarshal(arg, &entry)
			if err != nil {
				return
			}
			//fmt.Printf("giving Keeper.SetStorage(%s) %s\n", entry.Path(), entry.Value())
			keeper.LegacySetStorageAndNotify(ctx, entry)
		}
		return "true", nil

	case "setWithoutNotify":
		for _, arg := range msg.Args {
			var entry agoric.KVEntry
			err = json.Unmarshal(arg, &entry)
			if err != nil {
				return
			}
			keeper.SetStorage(ctx, entry)
		}
		return "true", nil

	case "delete":
		paths, err := unmarshalPathsFromArgs(msg.Args)
		if err != nil {
			return "", err
		}
		for _, path := range paths {
			newEntry := types.NewStorageEntryWithNoData(path)
			keeper.SetStorageAndNotify(cctx.Context, newEntry)
		}
		return "true", nil

	case "append":
		for _, arg := range msg.Args {
			var entry agoric.KVEntry
			err = json.Unmarshal(arg, &entry)
			if err != nil {
				return
			}
			if !entry.HasValue() {
				err = fmt.Errorf("no value for append entry with path: %q", entry.Key())
				return
			}
			err = keeper.AppendStorageValueAndNotify(ctx, entry.Key(), entry.StringValue())
			if err != nil {
				return
			}
		}
		return "true", nil

	case "get":
		// Note that "get" does not (currently) unwrap a StreamCell.
		path, err := unmarshalSinglePathFromArgs(msg.Args)
		if err != nil {
			return "", err
		}

		entry := keeper.GetEntry(ctx, path)
		bz, err := json.Marshal(entry.Value())
		if err != nil {
			return "", err
		}
		return string(bz), nil

	case "getStoreKey":
		path, err := unmarshalSinglePathFromArgs(msg.Args)
		if err != nil {
			return "", err
		}
		value := vstorageStoreKey{
			StoreName:       keeper.GetStoreName(),
			StoreSubkey:     string(keeper.PathToEncodedKey(path)),
			DataPrefixBytes: string(keeper.GetDataPrefix()),
			NoDataValue:     string(keeper.GetNoDataValue()),
		}
		bz, err := json.Marshal(value)
		if err != nil {
			return "", err
		}
		return string(bz), nil

	case "has":
		path, err := unmarshalSinglePathFromArgs(msg.Args)
		if err != nil {
			return "", err
		}
		value := keeper.HasStorage(ctx, path)
		if !value {
			return "false", nil
		}
		return "true", nil

	// TODO: "keys" is deprecated
	case "children", "keys":
		path, err := unmarshalSinglePathFromArgs(msg.Args)
		if err != nil {
			return "", err
		}
		children := keeper.GetChildren(ctx, path)
		if children.Children == nil {
			return "[]", nil
		}
		bytes, err := json.Marshal(children.Children)
		if err != nil {
			return "", err
		}
		return string(bytes), nil

	case "entries":
		path, err := unmarshalSinglePathFromArgs(msg.Args)
		if err != nil {
			return "", err
		}
		children := keeper.GetChildren(ctx, path)
		entries := make([]agoric.KVEntry, len(children.Children))
		for i, child := range children.Children {
			entry := keeper.GetEntry(ctx, fmt.Sprintf("%s.%s", path, child))
			if !entry.HasValue() {
				entries[i] = agoric.NewKVEntryWithNoValue(child)
			} else {
				entries[i] = agoric.NewKVEntry(child, entry.StringValue())
			}
		}
		bytes, err := json.Marshal(entries)
		if err != nil {
			return "", err
		}
		return string(bytes), nil

	case "values":
		path, err := unmarshalSinglePathFromArgs(msg.Args)
		if err != nil {
			return "", err
		}
		children := keeper.GetChildren(ctx, path)
		vals := make([]*string, len(children.Children))
		for i, child := range children.Children {
			vals[i] = keeper.GetEntry(ctx, fmt.Sprintf("%s.%s", path, child)).Value()
		}
		bytes, err := json.Marshal(vals)
		if err != nil {
			return "", err
		}
		return string(bytes), nil

	case "size":
		path, err := unmarshalSinglePathFromArgs(msg.Args)
		if err != nil {
			return "", err
		}
		children := keeper.GetChildren(ctx, path)
		if children.Children == nil {
			return "0", nil
		}
		return fmt.Sprint(len(children.Children)), nil
	}

	return "", errors.New("Unrecognized msg.Method " + msg.Method)
}
