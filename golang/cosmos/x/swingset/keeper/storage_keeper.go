package keeper

import (
	"bytes"
	"fmt"
	"strings"

	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
	"github.com/cosmos/cosmos-sdk/store/prefix"
	db "github.com/tendermint/tm-db"
)

// For space efficiency, path keys are structured as:
// `${numberOfPathElements}\0${zeroSeparatedPath}`, such as `0\0` for the root
// element, and `1\0foo` for `foo`, and `3\0foo\0bar\0baz` for `foo.bar.baz`.
//
// Thus, we can scan for all of `foo.bar`'s children by iterating over the
// prefix
//    `3\0foo\0bar\0`
//
// We still need to iterate up the tree until we are sure the correct ancestor
// nodes are present or absent, but we don't need to fetch all an ancestor's
// keys to do so.
var (
	metaKeySeparator   = []byte{0}
	pathSeparator      = "."
	pathSeparatorBytes = []byte(pathSeparator)
	dataKeyPrefix      = ":"
	emptyMeta          = []byte{1}
)

// keyToPath converts a string key to a byte slice path
func keyToPath(key []byte) string {
	// Split the key into its path depth and path components.
	split := bytes.SplitN(key, metaKeySeparator, 2)
	encodedPath := split[1]
	pathBytes := bytes.ReplaceAll(encodedPath, metaKeySeparator, pathSeparatorBytes)
	return string(pathBytes)
}

// pathToDataKey returns the key for a data element at a given path
func pathToDataKey(path string) []byte {
	return append([]byte(dataKeyPrefix), []byte(path)...)
}

// pathToMetaKey converts a path to a byte slice key
func pathToMetaKey(path string) []byte {
	depth := strings.Count(path, pathSeparator)
	encodedPath := pathSeparator + path
	if len(path) > 0 {
		// Increment so that only the empty path is at depth 0.
		depth += 1
	}
	encoded := []byte(fmt.Sprintf("%d%s", depth, encodedPath))
	if bytes.Contains(encoded, metaKeySeparator) {
		panic(fmt.Errorf("pathToKey: encoded %q contains key separator %q", encoded, metaKeySeparator))
	}
	return bytes.ReplaceAll(encoded, pathSeparatorBytes, metaKeySeparator)
}

// pathToChildrenPrefix converts a path to a prefix for its children
func pathToChildrenPrefix(path string) []byte {
	encodedPrefix := pathSeparator + path
	if len(path) > 0 {
		// Append so that only the empty prefix has no trailing separator.
		encodedPrefix += pathSeparator
	}
	depth := strings.Count(encodedPrefix, pathSeparator)
	encoded := []byte(fmt.Sprintf("%d%s", depth, encodedPrefix))
	if bytes.Contains(encoded, metaKeySeparator) {
		panic(fmt.Errorf("pathToChildrenPrefix: encoded %q contains key separator %q", encoded, metaKeySeparator))
	}
	return bytes.ReplaceAll(encoded, pathSeparatorBytes, metaKeySeparator)
}

// ExportStorage fetches all storage
func (k Keeper) ExportStorage(ctx sdk.Context) []*types.StorageEntry {
	store := ctx.KVStore(k.storeKey)
	pathStore := prefix.NewStore(store, types.MetaKeyPrefix)

	iterator := sdk.KVStorePrefixIterator(pathStore, nil)

	exported := []*types.StorageEntry{}
	defer iterator.Close()
	for ; iterator.Valid(); iterator.Next() {
		keyStr := keyToPath(iterator.Key())
		value := k.GetStorage(ctx, keyStr)
		if value != "" {
			entry := types.StorageEntry{Key: keyStr, Value: value}
			exported = append(exported, &entry)
		}
	}
	return exported
}

// GetStorage gets generic storage
func (k Keeper) GetStorage(ctx sdk.Context, path string) string {
	//fmt.Printf("GetStorage(%s)\n", path);
	store := ctx.KVStore(k.storeKey)
	dataStore := prefix.NewStore(store, types.DataKeyPrefix)
	dataKey := pathToDataKey(path)
	if !dataStore.Has(dataKey) {
		return ""
	}
	bz := dataStore.Get(dataKey)
	value := string(bz)
	return value
}

func (k Keeper) getKeyIterator(ctx sdk.Context, path string) db.Iterator {
	store := ctx.KVStore(k.storeKey)
	pathStore := prefix.NewStore(store, types.MetaKeyPrefix)
	keyPrefix := pathToChildrenPrefix(path)

	return sdk.KVStorePrefixIterator(pathStore, keyPrefix)
}

// GetKeys gets all storage child keys at a given path
func (k Keeper) GetKeys(ctx sdk.Context, path string) *types.Keys {
	iterator := k.getKeyIterator(ctx, path)

	var keys types.Keys
	keys.Keys = []string{}
	defer iterator.Close()
	for ; iterator.Valid(); iterator.Next() {
		parts := strings.Split(keyToPath(iterator.Key()), pathSeparator)
		keyStr := parts[len(parts)-1]
		keys.Keys = append(keys.Keys, keyStr)
	}
	return &keys
}

// HasStorage tells if a given path has data.
func (k Keeper) HasStorage(ctx sdk.Context, path string) bool {
	store := ctx.KVStore(k.storeKey)
	dataStore := prefix.NewStore(store, types.DataKeyPrefix)
	dataKey := pathToDataKey(path)

	// Check if we have data.
	return dataStore.Has(dataKey)
}

// HasKeys tells if a given path has child keys.
func (k Keeper) HasKeys(ctx sdk.Context, path string) bool {
	// Check if we have children.
	iterator := k.getKeyIterator(ctx, path)
	defer iterator.Close()
	return iterator.Valid()
}

func (k Keeper) LegacySetStorage(ctx sdk.Context, path, value string) {
	if !k.SetStorage(ctx, path, value) {
		return
	}

	// Our stream has changed, so emit the change event.
	ctx.EventManager().EmitEvent(
		types.NewLegacyStorageEvent(path, value),
	)
}

// SetStorage sets the string value for a path.  Returns true if changed.
func (k Keeper) SetStorage(ctx sdk.Context, path, value string) (changed bool) {
	if k.GetStorage(ctx, path) == value {
		// No change.
		return
	}

	changed = true
	store := ctx.KVStore(k.storeKey)
	dataStore := prefix.NewStore(store, types.DataKeyPrefix)

	// Update the value.
	metaStore := prefix.NewStore(store, types.MetaKeyPrefix)
	dataKey := pathToDataKey(path)
	if value == "" {
		dataStore.Delete(dataKey)
	} else {
		dataStore.Set(dataKey, []byte(value))
	}

	// Update our and other parent keys.
	pathComponents := strings.Split(path, ".")
	for i := len(pathComponents); i >= 0; i-- {
		ancestor := strings.Join(pathComponents[0:i], ".")

		// Decide if we need to add or remove the ancestor.
		if value == "" {
			if k.HasStorage(ctx, ancestor) || k.HasKeys(ctx, ancestor) {
				// If the key is needed, skip out.
				return
			}
			// Delete the key.
			metaStore.Delete(pathToMetaKey(ancestor))
		} else if i < len(pathComponents) && k.HasStorage(ctx, ancestor) {
			// The key is present, so we can skip out.
			return
		} else {
			// Add the key as an empty value.
			metaStore.Set(pathToMetaKey(ancestor), emptyMeta)
		}
	}
	return
}
