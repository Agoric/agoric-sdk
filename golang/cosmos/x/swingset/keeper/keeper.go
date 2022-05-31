package keeper

import (
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"strings"

	"github.com/tendermint/tendermint/libs/log"

	"github.com/cosmos/cosmos-sdk/codec"
	"github.com/cosmos/cosmos-sdk/store/prefix"
	sdk "github.com/cosmos/cosmos-sdk/types"
	bankkeeper "github.com/cosmos/cosmos-sdk/x/bank/keeper"
	paramtypes "github.com/cosmos/cosmos-sdk/x/params/types"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
)

// Top-level paths for chain storage should remain synchronized with
// packages/cosmic-swingset/src/chain-storage-paths.js
const (
	StoragePathActivityhash = "activityhash"
	StoragePathBeansOwing   = "beansOwing"
	StoragePathEgress       = "egress"
	StoragePathMailbox      = "mailbox"
	StoragePathCustom       = "published"
)

// Keeper maintains the link to data storage and exposes getter/setter methods for the various parts of the state machine
type Keeper struct {
	storeKey   sdk.StoreKey
	cdc        codec.Codec
	paramSpace paramtypes.Subspace

	accountKeeper    types.AccountKeeper
	bankKeeper       bankkeeper.Keeper
	feeCollectorName string

	// CallToController dispatches a message to the controlling process
	callToController func(ctx sdk.Context, str string) (string, error)
}

var _ types.SwingSetKeeper = &Keeper{}

// A prefix of bytes, since KVStores can't handle empty slices as keys.
var keyPrefix = []byte{':'}

// keyToString converts a byte slice path to a string key
func keyToString(key []byte) string {
	return string(key[len(keyPrefix):])
}

// stringToKey converts a string key to a byte slice path
func stringToKey(keyStr string) []byte {
	key := keyPrefix
	key = append(key, []byte(keyStr)...)
	return key
}

// NewKeeper creates a new IBC transfer Keeper instance
func NewKeeper(
	cdc codec.Codec, key sdk.StoreKey, paramSpace paramtypes.Subspace,
	accountKeeper types.AccountKeeper, bankKeeper bankkeeper.Keeper,
	feeCollectorName string,
	callToController func(ctx sdk.Context, str string) (string, error),
) Keeper {

	// set KeyTable if it has not already been set
	if !paramSpace.HasKeyTable() {
		paramSpace = paramSpace.WithKeyTable(types.ParamKeyTable())
	}

	return Keeper{
		storeKey:         key,
		cdc:              cdc,
		paramSpace:       paramSpace,
		accountKeeper:    accountKeeper,
		bankKeeper:       bankKeeper,
		feeCollectorName: feeCollectorName,
		callToController: callToController,
	}
}

// PushAction appends an action to the controller's action queue.  This queue is
// kept in the kvstore so that changes to it are properly reverted if the
// kvstore is rolled back.  By the time the block manager runs, it can commit
// its SwingSet transactions without fear of side-effecting the world with
// intermediate transaction state.
//
// The actionQueue's format is documented by `makeChainQueue` in
// `packages/cosmic-swingset/src/chain-main.js`.
func (k Keeper) PushAction(ctx sdk.Context, action vm.Jsonable) error {
	bz, err := json.Marshal(action)
	if err != nil {
		return err
	}

	// Get the current queue tail, defaulting to zero if its storage doesn't exist.
	tail := uint64(0)
	tailStr := k.GetStorage(ctx, "actionQueue.tail")
	if len(tailStr) > 0 {
		// Found, so parse it.
		tail, err = strconv.ParseUint(tailStr, 10, 64)
		if err != nil {
			return err
		}
	}

	// Set the storage corresponding to the queue entry for the current tail.
	k.SetStorage(ctx, fmt.Sprintf("actionQueue.%d", tail), string(bz))

	// Update the tail to point to the next available entry.
	k.SetStorage(ctx, "actionQueue.tail", fmt.Sprintf("%d", tail+1))
	return nil
}

// BlockingSend sends a message to the controller and blocks the Golang process
// until the response.  It is orthogonal to PushAction, and should only be used
// by SwingSet to perform block lifecycle events (BEGIN_BLOCK, END_BLOCK,
// COMMIT_BLOCK).
func (k Keeper) BlockingSend(ctx sdk.Context, action vm.Jsonable) (string, error) {
	bz, err := json.Marshal(action)
	if err != nil {
		return "", err
	}
	return k.callToController(ctx, string(bz))
}

func (k Keeper) GetParams(ctx sdk.Context) (params types.Params) {
	k.paramSpace.GetParamSet(ctx, &params)
	return params
}

func (k Keeper) SetParams(ctx sdk.Context, params types.Params) {
	k.paramSpace.SetParamSet(ctx, &params)
}

// GetBeansPerUnit returns a map taken from the current SwingSet parameters from
// a unit (key) string to an unsigned integer amount of beans.
func (k Keeper) GetBeansPerUnit(ctx sdk.Context) map[string]sdk.Uint {
	params := k.GetParams(ctx)
	beansPerUnit := make(map[string]sdk.Uint, len(params.BeansPerUnit))
	for _, bpu := range params.BeansPerUnit {
		beansPerUnit[bpu.Key] = bpu.Beans
	}
	return beansPerUnit
}

func getBeansOwingPathForAddress(addr sdk.AccAddress) string {
	return StoragePathBeansOwing + "." + addr.String()
}

// GetBeansOwing returns the number of beans that the given address owes to
// the FeeAccount but has not yet paid.
func (k Keeper) GetBeansOwing(ctx sdk.Context, addr sdk.AccAddress) sdk.Uint {
	path := getBeansOwingPathForAddress(addr)
	value := k.GetStorage(ctx, path)
	if value == "" {
		return sdk.ZeroUint()
	}
	return sdk.NewUintFromString(value)
}

// SetBeansOwing sets the number of beans that the given address owes to the
// feeCollector but has not yet paid.
func (k Keeper) SetBeansOwing(ctx sdk.Context, addr sdk.AccAddress, beans sdk.Uint) {
	path := getBeansOwingPathForAddress(addr)
	k.SetStorage(ctx, path, beans.String())
}

// ChargeBeans charges the given address the given number of beans.  It divides
// the beans into the number to debit immediately vs. the number to store in the
// beansOwing.
func (k Keeper) ChargeBeans(ctx sdk.Context, addr sdk.AccAddress, beans sdk.Uint) error {
	beansPerUnit := k.GetBeansPerUnit(ctx)

	wasOwing := k.GetBeansOwing(ctx, addr)
	nowOwing := wasOwing.Add(beans)

	// Actually debit immediately in integer multiples of the minimum debit, since
	// nowOwing must be less than the minimum debit.
	beansPerMinFeeDebit := beansPerUnit[types.BeansPerMinFeeDebit]
	remainderOwing := nowOwing.Mod(beansPerMinFeeDebit)
	beansToDebit := nowOwing.Sub(remainderOwing)

	// Convert the debit to coins.
	beansPerFeeUnitDec := sdk.NewDecFromBigInt(beansPerUnit[types.BeansPerFeeUnit].BigInt())
	beansToDebitDec := sdk.NewDecFromBigInt(beansToDebit.BigInt())
	feeUnitPrice := k.GetParams(ctx).FeeUnitPrice
	feeDecCoins := sdk.NewDecCoinsFromCoins(feeUnitPrice...).MulDec(beansToDebitDec).QuoDec(beansPerFeeUnitDec)

	// Charge the account immediately if they owe more than BeansPerMinFeeDebit.
	// NOTE: We assume that BeansPerMinFeeDebit is a multiple of BeansPerFeeUnit.
	feeCoins, _ := feeDecCoins.TruncateDecimal()
	if !feeCoins.IsZero() {
		err := k.bankKeeper.SendCoinsFromAccountToModule(ctx, addr, k.feeCollectorName, feeCoins)
		if err != nil {
			return err
		}
	}

	// Record the new owing value, whether we have debited immediately or not
	// (i.e. there is more owing than before, but not enough to debit).
	k.SetBeansOwing(ctx, addr, remainderOwing)
	return nil
}

// GetBalance returns the amount of denom coins in the addr's account balance.
func (k Keeper) GetBalance(ctx sdk.Context, addr sdk.AccAddress, denom string) sdk.Coin {
	return k.bankKeeper.GetBalance(ctx, addr, denom)
}

// GetEgress gets the entire egress struct for a peer
func (k Keeper) GetEgress(ctx sdk.Context, addr sdk.AccAddress) types.Egress {
	path := StoragePathEgress + "." + addr.String()
	value := k.GetStorage(ctx, path)
	if value == "" {
		return types.Egress{}
	}

	var egress types.Egress
	err := json.Unmarshal([]byte(value), &egress)
	if err != nil {
		panic(err)
	}

	return egress
}

// SetEgress sets the egress struct for a peer, and ensures its account exists
func (k Keeper) SetEgress(ctx sdk.Context, egress *types.Egress) error {
	path := StoragePathEgress + "." + egress.Peer.String()

	bz, err := json.Marshal(egress)
	if err != nil {
		return err
	}

	k.SetStorage(ctx, path, string(bz))

	// Now make sure the corresponding account has been initialised.
	if acc := k.accountKeeper.GetAccount(ctx, egress.Peer); acc != nil {
		// Account already exists.
		return nil
	}

	// Create an account object with the specified address.
	acc := k.accountKeeper.NewAccountWithAddress(ctx, egress.Peer)

	// Store it in the keeper (panics on error).
	k.accountKeeper.SetAccount(ctx, acc)

	// Tell we were successful.
	return nil
}

// ExportStorage fetches all storage
func (k Keeper) ExportStorage(ctx sdk.Context) []*types.StorageEntry {
	store := ctx.KVStore(k.storeKey)
	dataStore := prefix.NewStore(store, types.DataPrefix)

	iterator := sdk.KVStorePrefixIterator(dataStore, nil)

	exported := []*types.StorageEntry{}
	defer iterator.Close()
	for ; iterator.Valid(); iterator.Next() {
		keyStr := keyToString(iterator.Key())
		entry := types.StorageEntry{Key: keyStr, Value: string(iterator.Value())}
		exported = append(exported, &entry)
	}
	return exported
}

// GetStorage gets generic storage
func (k Keeper) GetStorage(ctx sdk.Context, path string) string {
	//fmt.Printf("GetStorage(%s)\n", path);
	store := ctx.KVStore(k.storeKey)
	dataStore := prefix.NewStore(store, types.DataPrefix)
	dataKey := stringToKey(path)
	if !dataStore.Has(dataKey) {
		return ""
	}
	bz := dataStore.Get(dataKey)
	value := string(bz)
	return value
}

// GetKeys gets all storage child keys at a given path
func (k Keeper) GetKeys(ctx sdk.Context, path string) *types.Keys {
	store := ctx.KVStore(k.storeKey)
	keysStore := prefix.NewStore(store, types.KeysPrefix)
	key := stringToKey(path)
	if !keysStore.Has(key) {
		return types.NewKeys()
	}
	bz := keysStore.Get(key)
	var keys types.Keys
	k.cdc.MustUnmarshalLengthPrefixed(bz, &keys)
	return &keys
}

// SetStorage sets the entire generic storage for a path
func (k Keeper) SetStorage(ctx sdk.Context, path, value string) {
	store := ctx.KVStore(k.storeKey)
	dataStore := prefix.NewStore(store, types.DataPrefix)
	keysStore := prefix.NewStore(store, types.KeysPrefix)

	// Update the value.
	pathKey := stringToKey(path)
	if value == "" {
		dataStore.Delete(pathKey)
	} else {
		dataStore.Set(pathKey, []byte(value))
	}

	ctx.EventManager().EmitEvent(
		types.NewStorageEvent(path, value),
	)

	if value == "" && len(k.GetKeys(ctx, path).Keys) > 0 {
		// If we're deleting and we had children, we need to keep our ancestor keys
		// around.
		return
	}

	// Update the parent keys.
	pathComponents := strings.Split(path, ".")
	for i := len(pathComponents) - 1; i >= 0; i-- {
		ancestor := strings.Join(pathComponents[0:i], ".")
		lastKeyStr := pathComponents[i]

		// Get a map corresponding to the parent's keys.
		keyNode := k.GetKeys(ctx, ancestor)
		keyList := keyNode.Keys
		keyMap := make(map[string]bool, len(keyList)+1)
		for _, keyStr := range keyList {
			keyMap[keyStr] = true
		}

		// Decide if we need to add or remove the key.
		if value == "" {
			if _, ok := keyMap[lastKeyStr]; !ok {
				// If the key is already gone, we don't need to remove from the key
				// lists.
				return
			}
			// Delete the key.
			delete(keyMap, lastKeyStr)
		} else {
			if _, ok := keyMap[lastKeyStr]; ok {
				// If the key already exists, we don't need to add to the key lists.
				return
			}
			// Add the key.
			keyMap[lastKeyStr] = true
		}

		keyList = make([]string, 0, len(keyMap))
		for keyStr := range keyMap {
			keyList = append(keyList, keyStr)
		}

		// Update the list of keys
		ancestorKey := stringToKey(ancestor)
		if len(keyList) == 0 {
			// No keys left, delete the parent.
			keysStore.Delete(ancestorKey)
		} else {
			// Update the key node, ordering deterministically.
			sort.Strings(keyList)
			keyNode.Keys = keyList
			keysStore.Set(ancestorKey, k.cdc.MustMarshalLengthPrefixed(keyNode))
		}
	}
}

// Logger returns a module-specific logger.
func (k Keeper) Logger(ctx sdk.Context) log.Logger {
	return ctx.Logger().With("module", fmt.Sprintf("x/%s", types.ModuleName))
}

// GetMailbox gets the entire mailbox struct for a peer
func (k Keeper) GetMailbox(ctx sdk.Context, peer string) string {
	path := StoragePathMailbox + "." + peer
	return k.GetStorage(ctx, path)
}

// SetMailbox sets the entire mailbox struct for a peer
func (k Keeper) SetMailbox(ctx sdk.Context, peer string, mailbox string) {
	path := StoragePathMailbox + "." + peer
	k.SetStorage(ctx, path, mailbox)
}
