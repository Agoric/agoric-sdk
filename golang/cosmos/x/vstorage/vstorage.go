package vstorage

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/cosmos/cosmos-sdk/telemetry"
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

func unmarshalSinglePathFromArgs(args []json.RawMessage, path *string) error {
	if len(args) == 0 {
		return fmt.Errorf("missing 'path' argument")
	}
	if len(args) != 1 {
		return fmt.Errorf("extra arguments after 'path'")
	}
	return json.Unmarshal(args[0], path)
}

const vstorageMetricKey = "vstorage_size_delta"

// reportKVEntrySizeDelta reports the size delta of a KVEntry to the telemetry
// system. The size delta is the change in size of the key and value of the
// KVEntry. The label is used to identify the operation that caused the size
// delta.
// The function uses simplified accounting for the size of the key: a full size
// of the key is used regardless of whether it shares a prefix with aby other key
// This tends to overestimate the total storage size consumed by the keys, but
// balances out when the keys are deleted by setting them with nil values.
func reportKVEntrySizeDelta(ctx sdk.Context, keeper Keeper, newEntry agoric.KVEntry, label string) {
	var oldEntry agoric.KVEntry
	var valueSizeDelta int = 0
	var keySizeDelta int = 0

	if !newEntry.IsValidKey() {
		// invalid key - no change in size
		return
	}

	// get the old entry to compare
	oldEntry = keeper.GetEntry(ctx, newEntry.Key())

	if !oldEntry.HasValue() && !newEntry.HasValue() {
		// There is no change in size if both the old and new entries have no value
		return
	} else if oldEntry.HasValue() && newEntry.HasValue() {
		// Updating the existing value, no change in key size
		valueSizeDelta = len(*newEntry.Value()) - len(*oldEntry.Value())
	} else if oldEntry.HasValue() && !newEntry.HasValue() {
		// Deleting the value, removing the key
		valueSizeDelta = -len(*oldEntry.Value())
		keySizeDelta = -len(oldEntry.Key())
	} else {
		// !oldEntry.HasValue() && newEntry.HasValue()
		// Adding a new value, adding the key
		valueSizeDelta = len(*newEntry.Value())
		keySizeDelta = len(newEntry.Key())
	}

	telemetry.IncrCounter(float32(keySizeDelta + valueSizeDelta), vstorageMetricKey, label)
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
			reportKVEntrySizeDelta(ctx, keeper, entry, msg.Method)
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
			reportKVEntrySizeDelta(ctx, keeper, entry, msg.Method)
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
			reportKVEntrySizeDelta(ctx, keeper, entry, msg.Method)
			keeper.SetStorage(ctx, entry)
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
		var path string
		err = unmarshalSinglePathFromArgs(msg.Args, &path)
		if err != nil {
			return
		}

		entry := keeper.GetEntry(ctx, path)
		bz, err := json.Marshal(entry.Value())
		if err != nil {
			return "", err
		}
		return string(bz), nil

	case "getStoreKey":
		var path string
		err = unmarshalSinglePathFromArgs(msg.Args, &path)
		if err != nil {
			return
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
		var path string
		err = unmarshalSinglePathFromArgs(msg.Args, &path)
		if err != nil {
			return
		}
		value := keeper.HasStorage(ctx, path)
		if !value {
			return "false", nil
		}
		return "true", nil

	// TODO: "keys" is deprecated
	case "children", "keys":
		var path string
		err = unmarshalSinglePathFromArgs(msg.Args, &path)
		if err != nil {
			return
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
		var path string
		err = unmarshalSinglePathFromArgs(msg.Args, &path)
		if err != nil {
			return
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
		var path string
		err = unmarshalSinglePathFromArgs(msg.Args, &path)
		if err != nil {
			return
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
		var path string
		err = unmarshalSinglePathFromArgs(msg.Args, &path)
		if err != nil {
			return
		}
		children := keeper.GetChildren(ctx, path)
		if children.Children == nil {
			return "0", nil
		}
		return fmt.Sprint(len(children.Children)), nil
	}

	return "", errors.New("Unrecognized msg.Method " + msg.Method)
}
