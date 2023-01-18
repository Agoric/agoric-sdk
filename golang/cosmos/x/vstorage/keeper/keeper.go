package keeper

import (
	"bytes"
	"encoding/json"
	"sort"
	"strconv"
	"strings"

	sdk "github.com/cosmos/cosmos-sdk/types"
	db "github.com/tendermint/tm-db"

	agoric "github.com/Agoric/agoric-sdk/golang/cosmos/types"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vstorage/types"
)

// StreamCell is an envelope representing a sequence of values written at a path in a single block.
// It is persisted to storage as a { "blockHeight": "<digits>", "values": ["...", ...] } JSON text
// that off-chain consumers rely upon.
// Many of those consumers *also* rely upon the strings of "values" being valid JSON text
// (cf. scripts/get-flattened-publication.sh), but we do not enforce that in this package.
type StreamCell struct {
	BlockHeight string   `json:"blockHeight"`
	Values      []string `json:"values"`
}

type ProposedChange struct {
	Path               string
	ValueFromLastBlock string
	NewValue           string
	LegacyEvents       bool
}

type ChangeManager interface {
	Track(ctx sdk.Context, k Keeper, path, value string, isLegacy bool)
	EmitEvents(ctx sdk.Context, k Keeper)
	Rollback(ctx sdk.Context)
}

type BatchingChangeManager struct {
	// Map from storage path to proposed change.
	changes map[string]*ProposedChange
}

var _ ChangeManager = (*BatchingChangeManager)(nil)

// Keeper maintains the link to data storage and exposes getter/setter methods
// for the various parts of the state machine
type Keeper struct {
	changeManager ChangeManager
	storeKey      sdk.StoreKey
}

func (bcm *BatchingChangeManager) Track(ctx sdk.Context, k Keeper, path, value string, isLegacy bool) {
	if change, ok := bcm.changes[path]; ok {
		change.NewValue = value
		if isLegacy {
			change.LegacyEvents = true
		}
		return
	}
	bcm.changes[path] = &ProposedChange{
		Path:               path,
		NewValue:           value,
		ValueFromLastBlock: k.GetData(ctx, path),
		LegacyEvents:       isLegacy,
	}
}

func (bcm *BatchingChangeManager) Rollback(ctx sdk.Context) {
	bcm.changes = make(map[string]*ProposedChange)
}

// EmitEvents emits events for all actual changes.
// This does not clear the cache, so the caller must call Rollback() to do so.
func (bcm *BatchingChangeManager) EmitEvents(ctx sdk.Context, k Keeper) {
	changes := bcm.changes
	if len(changes) == 0 {
		return
	}

	// Deterministic order.
	sortedPaths := make([]string, 0, len(changes))
	for path := range changes {
		sortedPaths = append(sortedPaths, path)
	}
	sort.Strings(sortedPaths)

	for _, path := range sortedPaths {
		change := bcm.changes[path]
		k.EmitChange(ctx, change)
	}
}

// The BatchingChangeManager needs to be a pointer because its state is mutated.
func NewBatchingChangeManager() *BatchingChangeManager {
	bcm := BatchingChangeManager{changes: make(map[string]*ProposedChange)}
	return &bcm
}

func NewKeeper(storeKey sdk.StoreKey) Keeper {
	return Keeper{
		storeKey:      storeKey,
		changeManager: NewBatchingChangeManager(),
	}
}

// ExportStorage fetches all storage
func (k Keeper) ExportStorage(ctx sdk.Context) []*types.DataEntry {
	store := ctx.KVStore(k.storeKey)

	iterator := sdk.KVStorePrefixIterator(store, nil)

	exported := []*types.DataEntry{}
	defer iterator.Close()
	for ; iterator.Valid(); iterator.Next() {
		path := types.EncodedKeyToPath(iterator.Key())
		value := string(bytes.TrimPrefix(iterator.Value(), types.EncodedDataPrefix))
		if len(value) == 0 {
			continue
		}
		entry := types.DataEntry{Path: path, Value: value}
		exported = append(exported, &entry)
	}
	return exported
}

func (k Keeper) ImportStorage(ctx sdk.Context, entries []*types.DataEntry) {
	for _, entry := range entries {
		// This set does the bookkeeping for us in case the entries aren't a
		// complete tree.
		k.SetStorage(ctx, entry.Path, entry.Value)
	}
}

func (k Keeper) EmitChange(ctx sdk.Context, change *ProposedChange) {
	if change.NewValue == change.ValueFromLastBlock {
		// No change.
		return
	}

	if change.LegacyEvents {
		// Emit the legacy change event.
		ctx.EventManager().EmitEvent(
			types.NewLegacyStorageEvent(change.Path, change.NewValue),
		)
	}

	// Emit the new state change event.
	ctx.EventManager().EmitEvent(
		agoric.NewStateChangeEvent(
			k.GetStoreName(),
			k.PathToEncodedKey(change.Path),
			[]byte(change.NewValue),
		),
	)
}

// GetData gets generic storage.  The default value is an empty string.
func (k Keeper) GetData(ctx sdk.Context, path string) string {
	//fmt.Printf("GetData(%s)\n", path);
	store := ctx.KVStore(k.storeKey)
	encodedKey := types.PathToEncodedKey(path)
	bz := bytes.TrimPrefix(store.Get(encodedKey), types.EncodedDataPrefix)
	value := string(bz)
	return value
}

func (k Keeper) getKeyIterator(ctx sdk.Context, path string) db.Iterator {
	store := ctx.KVStore(k.storeKey)
	keyPrefix := types.PathToChildrenPrefix(path)

	return sdk.KVStorePrefixIterator(store, keyPrefix)
}

// GetChildren gets all vstorage child children at a given path
func (k Keeper) GetChildren(ctx sdk.Context, path string) *types.Children {
	iterator := k.getKeyIterator(ctx, path)

	var children types.Children
	children.Children = []string{}
	defer iterator.Close()
	for ; iterator.Valid(); iterator.Next() {
		parts := strings.Split(types.EncodedKeyToPath(iterator.Key()), types.PathSeparator)
		childrentr := parts[len(parts)-1]
		children.Children = append(children.Children, childrentr)
	}
	return &children
}

// HasStorage tells if a given path has data.  Some storage nodes have no data
// (just an empty string) and exist only to provide linkage to subnodes with
// data.
func (k Keeper) HasStorage(ctx sdk.Context, path string) bool {
	return k.GetData(ctx, path) != ""
}

// HasEntry tells if a given path has either subnodes or data.
func (k Keeper) HasEntry(ctx sdk.Context, path string) bool {
	store := ctx.KVStore(k.storeKey)
	encodedKey := types.PathToEncodedKey(path)

	// Check if we have a path entry.
	return store.Has(encodedKey)
}

// HasChildren tells if a given path has child children.
func (k Keeper) HasChildren(ctx sdk.Context, path string) bool {
	// Check if we have children.
	iterator := k.getKeyIterator(ctx, path)
	defer iterator.Close()
	return iterator.Valid()
}

func (k Keeper) NewChangeBatch(ctx sdk.Context) {
	k.changeManager.Rollback(ctx)
}

func (k Keeper) FlushChangeEvents(ctx sdk.Context) {
	k.changeManager.EmitEvents(ctx, k)
	k.changeManager.Rollback(ctx)
}

func (k Keeper) SetStorageAndNotify(ctx sdk.Context, path, value string) {
	k.changeManager.Track(ctx, k, path, value, false)
	k.SetStorage(ctx, path, value)
}

func (k Keeper) LegacySetStorageAndNotify(ctx sdk.Context, path, value string) {
	k.changeManager.Track(ctx, k, path, value, true)
	k.SetStorage(ctx, path, value)
}

func (k Keeper) AppendStorageValueAndNotify(ctx sdk.Context, path, value string) error {
	blockHeight := strconv.FormatInt(ctx.BlockHeight(), 10)

	// Preserve correctly-formatted data within the current block,
	// otherwise initialize a blank cell.
	currentData := k.GetData(ctx, path)
	var cell StreamCell
	_ = json.Unmarshal([]byte(currentData), &cell)
	if cell.BlockHeight != blockHeight {
		cell = StreamCell{BlockHeight: blockHeight, Values: make([]string, 0, 1)}
	}

	// Append the new value.
	cell.Values = append(cell.Values, value)

	// Perform the write.
	bz, err := json.Marshal(cell)
	if err != nil {
		return err
	}
	k.SetStorageAndNotify(ctx, path, string(bz))
	return nil
}

func componentsToPath(components []string) string {
	return strings.Join(components, types.PathSeparator)
}

// SetStorage sets the data value for a path.
//
// Maintains the invariant: path entries exist if and only if self or some
// descendant has non-empty storage
func (k Keeper) SetStorage(ctx sdk.Context, path, value string) {
	store := ctx.KVStore(k.storeKey)
	encodedKey := types.PathToEncodedKey(path)

	if value == "" && !k.HasChildren(ctx, path) {
		// We have no children, can delete.
		store.Delete(encodedKey)
	} else {
		// Update the value.
		bz := bytes.Join([][]byte{types.EncodedDataPrefix, []byte(value)}, []byte{})
		store.Set(encodedKey, bz)
	}

	// Update our other parent children.
	pathComponents := strings.Split(path, types.PathSeparator)
	if value == "" {
		// delete placeholder ancestors if they're no longer needed
		for i := len(pathComponents) - 1; i >= 0; i-- {
			ancestor := componentsToPath(pathComponents[0:i])
			if k.HasStorage(ctx, ancestor) || k.HasChildren(ctx, ancestor) {
				// this and further ancestors are needed, skip out
				break
			}
			store.Delete(types.PathToEncodedKey(ancestor))
		}
	} else {
		// add placeholders as needed
		for i := len(pathComponents) - 1; i >= 0; i-- {
			ancestor := componentsToPath(pathComponents[0:i])
			if k.HasEntry(ctx, ancestor) {
				// The ancestor exists, implying all further ancestors exist, so we can break.
				break
			}
			store.Set(types.PathToEncodedKey(ancestor), types.EncodedDataPrefix)
		}
	}
}

func (k Keeper) PathToEncodedKey(path string) []byte {
	return types.PathToEncodedKey(path)
}

func (k Keeper) GetStoreName() string {
	return k.storeKey.Name()
}

func (k Keeper) GetDataPrefix() []byte {
	return types.EncodedDataPrefix
}
