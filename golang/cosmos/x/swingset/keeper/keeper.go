package keeper

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/tendermint/tendermint/libs/log"
	db "github.com/tendermint/tm-db"

	"github.com/cosmos/cosmos-sdk/codec"
	"github.com/cosmos/cosmos-sdk/store/prefix"
	sdk "github.com/cosmos/cosmos-sdk/types"
	bankkeeper "github.com/cosmos/cosmos-sdk/x/bank/keeper"
	paramtypes "github.com/cosmos/cosmos-sdk/x/params/types"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
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

// Keys are structured as: `${numberOfPathElements}\0${zeroSeparatedPath}`, such
// as `0\0` for the root element, and `1\0foo` for `foo`, and `3\0foo\0bar\0baz`
// for `foo.bar.baz`.  The reason for this is space efficiency:
//   - we can read a node's data with just a single store operation
//     after mapping the key
//   - we can scan for all of `foo.bar`'s children by iterating over the prefix
//    `3\0foo\0bar\0`.
// We still need to iterate up the tree until we are sure the correct ancestor
// nodes are present or absent, but we don't need to fetch all an ancestor's
// keys to do so.
var (
	keySeparator      = []byte{0}
	keySeparatorRune  = rune(0)
	pathSeparatorRune = '.'
	pathSeparator     = string(pathSeparatorRune)
	dataPrefix        = ":"
	emptyValue        = []byte{1}
)

// keyToPath converts a byte slice path to a string key
func keyToPath(key []byte) string {
	// Split the key into its length and path components.
	split := bytes.SplitN(key, keySeparator, 2)
	pathBytes := split[1]

	pathStr := strings.Map(func(chr rune) rune {
		switch chr {
		case pathSeparatorRune:
			panic(fmt.Sprintf("key %q cannot contain %q", key, pathSeparatorRune))
		case keySeparatorRune:
			return pathSeparatorRune
		default:
			return chr
		}
	}, string(pathBytes))

	return pathStr
}

func pathToDataKey(keyStr string) []byte {
	return append([]byte(dataPrefix), []byte(keyStr)...)
}

// pathToKey converts a string key to a byte slice path
func pathToKey(keyStr string) []byte {
	return pathWithLengthToKey(keyStr, 0)
}

func pathWithLengthToKey(keyStr string, initialPathLength int) []byte {
	pathLength := initialPathLength
	if len(keyStr) > 0 {
		pathLength += 1
	}
	pathStr := strings.Map(func(chr rune) rune {
		switch chr {
		case keySeparatorRune:
			panic(fmt.Sprintf("key %q cannot contain %q", keyStr, keySeparatorRune))
		case pathSeparatorRune:
			pathLength += 1
			return keySeparatorRune
		default:
			return chr
		}
	}, keyStr)
	return []byte(fmt.Sprintf("%d%c%s", pathLength, keySeparatorRune, pathStr))
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
	return "beansOwing." + addr.String()
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
	path := "egress." + addr.String()
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
	path := "egress." + egress.Peer.String()

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
	dataStore := prefix.NewStore(store, types.DataKeyPrefix)

	iterator := sdk.KVStorePrefixIterator(dataStore, nil)

	exported := []*types.StorageEntry{}
	defer iterator.Close()
	for ; iterator.Valid(); iterator.Next() {
		keyStr := keyToPath(iterator.Key())
		entry := types.StorageEntry{Key: keyStr, Value: string(iterator.Value())}
		exported = append(exported, &entry)
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
	pathStore := prefix.NewStore(store, types.PathKeyPrefix)
	var keyPrefix []byte
	if path == "" {
		keyPrefix = pathWithLengthToKey("", 1)
	} else {
		keyPrefix = pathToKey(path + pathSeparator)
	}

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

// SetStorage sets the entire generic storage for a path
func (k Keeper) SetStorage(ctx sdk.Context, path, value string) {
	ctx.EventManager().EmitEvent(
		types.NewStorageEvent(path, value),
	)

	store := ctx.KVStore(k.storeKey)
	dataStore := prefix.NewStore(store, types.DataKeyPrefix)
	pathStore := prefix.NewStore(store, types.PathKeyPrefix)

	// Update the value.
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
			pathStore.Delete(pathToKey(ancestor))
		} else if i < len(pathComponents) && k.HasStorage(ctx, ancestor) {
			// The key is present, so we can skip out.
			return
		} else {
			// Add the key as an empty value.
			pathStore.Set(pathToKey(ancestor), emptyValue)
		}
	}
}

// Logger returns a module-specific logger.
func (k Keeper) Logger(ctx sdk.Context) log.Logger {
	return ctx.Logger().With("module", fmt.Sprintf("x/%s", types.ModuleName))
}

// GetMailbox gets the entire mailbox struct for a peer
func (k Keeper) GetMailbox(ctx sdk.Context, peer string) string {
	path := "mailbox." + peer
	return k.GetStorage(ctx, path)
}

// SetMailbox sets the entire mailbox struct for a peer
func (k Keeper) SetMailbox(ctx sdk.Context, peer string, mailbox string) {
	path := "mailbox." + peer
	k.SetStorage(ctx, path, mailbox)
}
