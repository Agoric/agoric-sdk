package keeper

import (
	"encoding/json"
	"errors"
	"fmt"
	stdlog "log"
	"math"

	corestore "cosmossdk.io/core/store"
	"cosmossdk.io/log"
	sdkmath "cosmossdk.io/math"
	"cosmossdk.io/store/prefix"
	storetypes "cosmossdk.io/store/types"
	"github.com/cosmos/cosmos-sdk/baseapp"
	"github.com/cosmos/cosmos-sdk/codec"
	"github.com/cosmos/cosmos-sdk/runtime"
	sdk "github.com/cosmos/cosmos-sdk/types"
	paramtypes "github.com/cosmos/cosmos-sdk/x/params/types"

	"github.com/Agoric/agoric-sdk/golang/cosmos/ante"
	agoric "github.com/Agoric/agoric-sdk/golang/cosmos/types"
	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
)

// Top-level paths for chain storage should remain synchronized with
// packages/internal/src/chain-storage-paths.js
const (
	StoragePathActionQueue         = "actionQueue"
	StoragePathHighPriorityQueue   = "highPriorityQueue"
	StoragePathHighPrioritySenders = "highPrioritySenders"
	StoragePathBeansOwing          = "beansOwing"
	StoragePathEgress              = "egress"
	StoragePathMailbox             = "mailbox"
	StoragePathCustom              = "published"
	StoragePathBundles             = "bundles"
	StoragePathSwingStore          = "swingStore"
)

const (
	// WalletStoragePathSegment matches the value of WALLET_STORAGE_PATH_SEGMENT
	// packages/vats/src/core/startWalletFactory.js
	WalletStoragePathSegment = "wallet"
)

const (
	stateKey                      = "state"
	pendingChunkDataKeyPrefix     = "pendingChunkData."
	pendingBundleInstallKeyPrefix = "pendingBundleInstall."
	pendingNodeKeyPrefix          = "pending."
	swingStoreKeyPrefix           = "swingStore."
)

// Keeper maintains the link to data vstorage and exposes getter/setter methods for the various parts of the state machine
type Keeper struct {
	storeService corestore.KVStoreService
	cdc          codec.Codec
	paramSpace   paramtypes.Subspace

	accountKeeper    types.AccountKeeper
	bankKeeper       types.BankKeeper
	vstorageKeeper   types.VstorageKeeper
	feeCollectorName string

	authority string

	// CallToController dispatches a message to the controlling process
	callToController func(ctx sdk.Context, str string) (string, error)
}

var _ types.SwingSetKeeper = &Keeper{}
var _ ante.SwingsetKeeper = &Keeper{}

// NewKeeper creates a new IBC transfer Keeper instance
func NewKeeper(
	cdc codec.Codec, storeService corestore.KVStoreService,
	paramSpace paramtypes.Subspace,
	accountKeeper types.AccountKeeper, bankKeeper types.BankKeeper,
	vstorageKeeper types.VstorageKeeper, feeCollectorName string, authority string,
	callToController func(ctx sdk.Context, str string) (string, error),
) Keeper {

	// set KeyTable if it has not already been set
	if !paramSpace.HasKeyTable() {
		paramSpace = paramSpace.WithKeyTable(types.ParamKeyTable())
	}

	return Keeper{
		cdc:              cdc,
		storeService:     storeService,
		paramSpace:       paramSpace,
		accountKeeper:    accountKeeper,
		bankKeeper:       bankKeeper,
		vstorageKeeper:   vstorageKeeper,
		feeCollectorName: feeCollectorName,
		callToController: callToController,
		authority:        authority,
	}
}

func populateAction(ctx sdk.Context, action vm.Action) (vm.Action, error) {
	action = vm.PopulateAction(ctx, action)
	ah := action.GetActionHeader()
	if len(ah.Type) == 0 {
		return nil, fmt.Errorf("action %q cannot have an empty ActionHeader.Type", action)
	}

	return action, nil
}

// pushAction appends an action to the controller's specified inbound queue.
// The queue is kept in the kvstore so that changes are properly reverted if the
// kvstore is rolled back.  By the time the block manager runs, it can commit
// its SwingSet transactions without fear of side-effecting the world with
// intermediate transaction state.
//
// The inbound queue's format is documented by `makeChainQueue` in
// `packages/cosmic-swingset/src/helpers/make-queue.js`.
func (k Keeper) pushAction(ctx sdk.Context, inboundQueuePath string, action vm.Action) error {
	action, err := populateAction(ctx, action)
	if err != nil {
		return err
	}
	txHash, txHashOk := ctx.Context().Value(baseapp.TxHashContextKey).(string)
	if !txHashOk {
		txHash = "unknown"
	}
	msgIdx, msgIdxOk := ctx.Context().Value(baseapp.TxMsgIdxContextKey).(int)
	if !txHashOk || !msgIdxOk {
		stdlog.Printf("error while extracting context for action %q\n", action)
	}
	record := types.InboundQueueRecord{
		Action: action,
		Context: types.ActionContext{
			BlockHeight: ctx.BlockHeight(),
			TxHash:      txHash,
			MsgIdx:      msgIdx,
		},
	}
	bz, err := json.Marshal(record)
	if err != nil {
		return err
	}

	return k.vstorageKeeper.PushQueueItem(ctx, inboundQueuePath, string(bz))
}

// PushAction appends an action to the controller's actionQueue.
func (k Keeper) PushAction(ctx sdk.Context, action vm.Action) error {
	return k.pushAction(ctx, StoragePathActionQueue, action)
}

// PushAction appends an action to the controller's highPriorityQueue.
func (k Keeper) PushHighPriorityAction(ctx sdk.Context, action vm.Action) error {
	return k.pushAction(ctx, StoragePathHighPriorityQueue, action)
}

func (k Keeper) IsHighPriorityAddress(ctx sdk.Context, addr sdk.AccAddress) (bool, error) {
	path := StoragePathHighPrioritySenders + "." + addr.String()
	return k.vstorageKeeper.HasEntry(ctx, path), nil
}

// GetSmartWalletState returns the provision state of the smart wallet for the account address
func (k Keeper) GetSmartWalletState(ctx sdk.Context, addr sdk.AccAddress) types.SmartWalletState {
	// walletStoragePath is path of `walletStorageNode` constructed in
	// `provideSmartWallet` from packages/smart-wallet/src/walletFactory.js
	walletStoragePath := StoragePathCustom + "." + WalletStoragePathSegment + "." + addr.String()

	// TODO: implement a pending provision state
	if k.vstorageKeeper.HasEntry(ctx, walletStoragePath) {
		return types.SmartWalletStateProvisioned
	}

	return types.SmartWalletStateNone
}

func (k Keeper) InboundQueueLength(ctx sdk.Context) (int32, error) {
	size := sdkmath.NewInt(0)

	highPriorityQueueLength, err := k.vstorageKeeper.GetQueueLength(ctx, StoragePathHighPriorityQueue)
	if err != nil {
		return 0, err
	}
	size = size.Add(highPriorityQueueLength)

	actionQueueLength, err := k.vstorageKeeper.GetQueueLength(ctx, StoragePathActionQueue)
	if err != nil {
		return 0, err
	}
	size = size.Add(actionQueueLength)

	if !size.IsInt64() {
		return 0, fmt.Errorf("inbound queue size too big: %s", size)
	}

	int64Size := size.Int64()
	if int64Size > math.MaxInt32 {
		return math.MaxInt32, nil
	}
	return int32(int64Size), nil
}

func (k Keeper) UpdateQueueAllowed(ctx sdk.Context) error {
	params := k.GetParams(ctx)
	inboundQueueMax, found := types.QueueSizeEntry(params.QueueMax, types.QueueInbound)
	if !found {
		return errors.New("could not find max inboundQueue size in params")
	}
	inboundMempoolQueueMax := inboundQueueMax / 2

	inboundQueueSize, err := k.InboundQueueLength(ctx)
	if err != nil {
		return err
	}

	var inboundQueueAllowed int32
	if inboundQueueMax > inboundQueueSize {
		inboundQueueAllowed = inboundQueueMax - inboundQueueSize
	}

	var inboundMempoolQueueAllowed int32
	if inboundMempoolQueueMax > inboundQueueSize {
		inboundMempoolQueueAllowed = inboundMempoolQueueMax - inboundQueueSize
	}

	state := k.GetState(ctx)
	state.QueueAllowed = []types.QueueSize{
		{Key: types.QueueInbound, Size_: inboundQueueAllowed},
		{Key: types.QueueInboundMempool, Size_: inboundMempoolQueueAllowed},
	}
	k.SetState(ctx, state)

	return nil
}

// BlockingSend sends a message to the controller and blocks the Golang process
// until the response.  It is orthogonal to PushAction, and should only be used
// by SwingSet to perform block lifecycle events (BEGIN_BLOCK, END_BLOCK,
// COMMIT_BLOCK).
func (k Keeper) BlockingSend(ctx sdk.Context, action vm.Action) (string, error) {
	action, err := populateAction(ctx, action)
	if err != nil {
		return "", err
	}
	bz, err := json.Marshal(action)
	if err != nil {
		return "", err
	}
	return k.callToController(ctx, string(bz))
}

func (k Keeper) GetParams(ctx sdk.Context) (params types.Params) {
	// Note the use of "IfExists"...
	// migration fills in missing data with defaults,
	// so it is the only consumer that should ever see a nil pair.
	k.paramSpace.GetParamSetIfExists(ctx, &params)
	return params
}

func (k Keeper) SetParams(ctx sdk.Context, params types.Params) {
	k.paramSpace.SetParamSet(ctx, &params)
}

func (k Keeper) GetState(ctx sdk.Context) types.State {
	kvstore := k.storeService.OpenKVStore(ctx)
	store := runtime.KVStoreAdapter(kvstore)
	bz := store.Get([]byte(stateKey))
	state := types.State{}
	k.cdc.MustUnmarshal(bz, &state)
	return state
}

func (k Keeper) SetState(ctx sdk.Context, state types.State) {
	kvstore := k.storeService.OpenKVStore(ctx)
	store := runtime.KVStoreAdapter(kvstore)
	bz := k.cdc.MustMarshal(&state)
	store.Set([]byte(stateKey), bz)
}

// GetBeansPerUnit returns a map taken from the current SwingSet parameters from
// a unit (key) string to an unsigned integer amount of beans.
func (k Keeper) GetBeansPerUnit(ctx sdk.Context) map[string]sdkmath.Uint {
	params := k.GetParams(ctx)
	beansPerUnit := make(map[string]sdkmath.Uint, len(params.BeansPerUnit))
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
func (k Keeper) GetBeansOwing(ctx sdk.Context, addr sdk.AccAddress) sdkmath.Uint {
	path := getBeansOwingPathForAddress(addr)
	entry := k.vstorageKeeper.GetEntry(ctx, path)
	if !entry.HasValue() {
		return sdkmath.ZeroUint()
	}
	return sdkmath.NewUintFromString(entry.StringValue())
}

// SetBeansOwing sets the number of beans that the given address owes to the
// feeCollector but has not yet paid.
func (k Keeper) SetBeansOwing(ctx sdk.Context, addr sdk.AccAddress, beans sdkmath.Uint) {
	path := getBeansOwingPathForAddress(addr)
	k.vstorageKeeper.SetStorage(ctx, agoric.NewKVEntry(path, beans.String()))
}

// ChargeBeans charges the given address the given number of beans.  It divides
// the beans into the number to debit immediately vs. the number to store in the
// beansOwing.
func (k Keeper) ChargeBeans(
	ctx sdk.Context,
	beansPerUnit map[string]sdkmath.Uint,
	addr sdk.AccAddress,
	beans sdkmath.Uint,
) error {
	wasOwing := k.GetBeansOwing(ctx, addr)
	nowOwing := wasOwing.Add(beans)

	// Actually debit immediately in integer multiples of the minimum debit, since
	// nowOwing must be less than the minimum debit.
	beansPerMinFeeDebit := beansPerUnit[types.BeansPerMinFeeDebit]
	remainderOwing := nowOwing.Mod(beansPerMinFeeDebit)
	beansToDebit := nowOwing.Sub(remainderOwing)

	// Convert the debit to coins.
	beansPerFeeUnitDec := sdkmath.LegacyNewDecFromBigInt(beansPerUnit[types.BeansPerFeeUnit].BigInt())
	beansToDebitDec := sdkmath.LegacyNewDecFromBigInt(beansToDebit.BigInt())
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

// ChargeForSmartWallet charges the fee for provisioning a smart wallet.
func (k Keeper) ChargeForSmartWallet(
	ctx sdk.Context,
	beansPerUnit map[string]sdkmath.Uint,
	addr sdk.AccAddress,
) error {
	beans := beansPerUnit[types.BeansPerSmartWalletProvision]
	err := k.ChargeBeans(ctx, beansPerUnit, addr, beans)
	if err != nil {
		return err
	}

	// TODO: mark that a smart wallet provision is pending. However in that case,
	// auto-provisioning should still be performed (but without fees being charged),
	// until the controller actually provisions the smart wallet (the operation may
	// transiently fail, requiring retries until success).
	// However the provisioning code is not currently idempotent, and has side
	// effects when the smart wallet is already provisioned.

	return nil
}

// makeFeeMenu returns a map from power flag to its fee.  In the case of duplicates, the
// first one wins.
func makeFeeMenu(powerFlagFees []types.PowerFlagFee) map[string]sdk.Coins {
	feeMenu := make(map[string]sdk.Coins, len(powerFlagFees))
	for _, pff := range powerFlagFees {
		if _, ok := feeMenu[pff.PowerFlag]; !ok {
			feeMenu[pff.PowerFlag] = pff.Fee
		}
	}
	return feeMenu
}

var privilegedProvisioningCoins sdk.Coins = sdk.NewCoins(sdk.NewInt64Coin("provisionpass", 1))

func calculateFees(balances sdk.Coins, powerFlags []string, powerFlagFees []types.PowerFlagFee) (sdk.Coins, error) {
	fees := sdk.NewCoins()

	// See if we have the balance needed for privileged provisioning.
	if balances.IsAllGTE(privilegedProvisioningCoins) {
		// We do, and notably we don't deduct anything from the submitter.
		return fees, nil
	}

	if len(powerFlags) == 0 {
		return nil, fmt.Errorf("must specify powerFlags for fee-based provisioning")
	}

	// Collate the power flags into a map of power flags to the fee coins.
	feeMenu := makeFeeMenu(powerFlagFees)

	// Calculate the total fee according to that map.
	for _, powerFlag := range powerFlags {
		if fee, ok := feeMenu[powerFlag]; ok {
			fees = fees.Add(fee...)
		} else {
			return nil, fmt.Errorf("unrecognized powerFlag: %s", powerFlag)
		}
	}

	return fees, nil
}

func (k Keeper) ChargeForProvisioning(ctx sdk.Context, submitter sdk.AccAddress, powerFlags []string) error {
	balances := k.bankKeeper.GetAllBalances(ctx, submitter)
	fees, err := calculateFees(balances, powerFlags, k.GetParams(ctx).PowerFlagFees)
	if err != nil {
		return err
	}

	// Deduct the fee from the submitter.
	if fees.IsZero() {
		return nil
	}
	return k.bankKeeper.SendCoinsFromAccountToModule(ctx, submitter, k.feeCollectorName, fees)
}

// GetEgress gets the entire egress struct for a peer
func (k Keeper) GetEgress(ctx sdk.Context, addr sdk.AccAddress) types.Egress {
	path := StoragePathEgress + "." + addr.String()
	entry := k.vstorageKeeper.GetEntry(ctx, path)
	if !entry.HasValue() {
		return types.Egress{}
	}

	var egress types.Egress
	err := json.Unmarshal([]byte(entry.StringValue()), &egress)
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

	// FIXME: We should use just SetStorageAndNotify here, but solo needs legacy for now.
	k.vstorageKeeper.LegacySetStorageAndNotify(ctx, agoric.NewKVEntry(path, string(bz)))

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

// Logger returns a module-specific logger.
func (k Keeper) Logger(ctx sdk.Context) log.Logger {
	return ctx.Logger().With("module", fmt.Sprintf("x/%s", types.ModuleName))
}

// GetMailbox gets the entire mailbox struct for a peer
func (k Keeper) GetMailbox(ctx sdk.Context, peer string) string {
	path := StoragePathMailbox + "." + peer
	return k.vstorageKeeper.GetEntry(ctx, path).StringValue()
}

// SetMailbox sets the entire mailbox struct for a peer
func (k Keeper) SetMailbox(ctx sdk.Context, peer string, mailbox string) {
	path := StoragePathMailbox + "." + peer
	// FIXME: We should use just SetStorageAndNotify here, but solo needs legacy for now.
	k.vstorageKeeper.LegacySetStorageAndNotify(ctx, agoric.NewKVEntry(path, mailbox))
}

func (k Keeper) GetPendingChunkData(ctx sdk.Context, chunkedArtifactId uint64, chunkIndex uint64) []byte {
	kvstore := k.storeService.OpenKVStore(ctx)
	store := runtime.KVStoreAdapter(kvstore)
	pendingChunkData := prefix.NewStore(store, []byte(pendingChunkDataKeyPrefix))

	key := append(sdk.Uint64ToBigEndian(chunkedArtifactId), sdk.Uint64ToBigEndian(chunkIndex)...)
	if !pendingChunkData.Has(key) {
		return nil
	}
	return pendingChunkData.Get(key)
}

func (k Keeper) SetPendingChunkData(ctx sdk.Context, chunkedArtifactId uint64, chunkIndex uint64, data []byte) {
	kvstore := k.storeService.OpenKVStore(ctx)
	store := runtime.KVStoreAdapter(kvstore)
	pendingChunkData := prefix.NewStore(store, []byte(pendingChunkDataKeyPrefix))

	key := append(sdk.Uint64ToBigEndian(chunkedArtifactId), sdk.Uint64ToBigEndian(chunkIndex)...)
	if len(data) == 0 {
		pendingChunkData.Delete(key)
		return
	}
	pendingChunkData.Set(key, data)
}

func (k Keeper) GetPendingBundleInstall(ctx sdk.Context, chunkedArtifactId uint64) *types.MsgInstallBundle {
	kvstore := k.storeService.OpenKVStore(ctx)
	store := runtime.KVStoreAdapter(kvstore)
	pendingStore := prefix.NewStore(store, []byte(pendingBundleInstallKeyPrefix))
	key := sdk.Uint64ToBigEndian(chunkedArtifactId)
	if !pendingStore.Has(key) {
		return nil
	}
	bz := pendingStore.Get(key)
	msg := &types.MsgInstallBundle{}
	k.cdc.MustUnmarshal(bz, msg)
	return msg
}

func (k Keeper) AddPendingBundleInstall(ctx sdk.Context, msg *types.MsgInstallBundle) uint64 {
	state := k.GetState(ctx)
	state.LastChunkedArtifactId++
	k.SetState(ctx, state)

	chunkedArtifactId := state.LastChunkedArtifactId
	k.SetPendingBundleInstall(ctx, chunkedArtifactId, msg)

	// Attach the pending install node to the linked list.
	node := &types.ChunkedArtifactNode{
		ChunkedArtifactId: chunkedArtifactId,
		StartTimeUnix:     ctx.BlockTime().Unix(),
		StartBlockHeight:  ctx.BlockHeight(),
	}
	kvstore := k.storeService.OpenKVStore(ctx)
	store := runtime.KVStoreAdapter(kvstore)
	key := sdk.Uint64ToBigEndian(chunkedArtifactId)
	startStore := prefix.NewStore(store, []byte(pendingNodeKeyPrefix))
	bz := k.cdc.MustMarshal(node)
	startStore.Set(key, bz)

	return chunkedArtifactId
}

// PruneExpiredBundleInstalls removes pending bundle installs that have passed
// their deadline, as set by the keeper parameters.
func (k Keeper) PruneExpiredBundleInstalls(ctx sdk.Context) {
	params := k.GetParams(ctx)
	currentSeconds := ctx.BlockTime().Unix()
	currentBlocks := ctx.BlockHeight()
	deadlineSeconds := params.InstallationDeadlineSeconds
	deadlineBlocks := params.InstallationDeadlineBlocks

	kvstore := k.storeService.OpenKVStore(ctx)
	store := runtime.KVStoreAdapter(kvstore)
	startStore := prefix.NewStore(store, []byte(pendingNodeKeyPrefix))

	state := k.GetState(ctx)
	for state.FirstChunkedArtifactId != 0 {
		chunkedArtifactId := state.FirstChunkedArtifactId
		key := sdk.Uint64ToBigEndian(chunkedArtifactId)
		bz := startStore.Get(key)
		node := &types.ChunkedArtifactNode{}
		k.cdc.MustUnmarshal(bz, node)

		if deadlineSeconds < 0 || currentSeconds-node.StartTimeUnix < deadlineSeconds {
			if deadlineBlocks < 0 || currentBlocks-node.StartBlockHeight < deadlineBlocks {
				// Still alive.  Stop the search.
				break
			}
		}

		// This pending bundle install is dead.  Remove it.
		k.SetPendingBundleInstall(ctx, chunkedArtifactId, nil)

		// Advance to the next node.
		state.FirstChunkedArtifactId = node.NextId
	}

	k.SetState(ctx, state)
}

func (k Keeper) makeListTools(ctx sdk.Context) *types.ListTools {
	kvstore := k.storeService.OpenKVStore(ctx)
	store := runtime.KVStoreAdapter(kvstore)
	listStore := prefix.NewStore(store, []byte(pendingNodeKeyPrefix))
	return types.NewListTools(ctx, listStore, k.cdc)
}

func (k Keeper) SetPendingBundleInstall(ctx sdk.Context, chunkedArtifactId uint64, newMsg *types.MsgInstallBundle) {
	kvstore := k.storeService.OpenKVStore(ctx)
	store := runtime.KVStoreAdapter(kvstore)
	pendingStore := prefix.NewStore(store, []byte(pendingBundleInstallKeyPrefix))

	key := sdk.Uint64ToBigEndian(chunkedArtifactId)
	if newMsg != nil {
		bz := k.cdc.MustMarshal(newMsg)
		pendingStore.Set(key, bz)
		return
	}

	var msg types.MsgInstallBundle
	k.cdc.MustUnmarshal(pendingStore.Get(key), &msg)
	if msg.ChunkedArtifact != nil && len(msg.ChunkedArtifact.Chunks) > 0 {
		// Remove the chunks.
		for i := range msg.ChunkedArtifact.Chunks {
			k.SetPendingChunkData(ctx, chunkedArtifactId, uint64(i), nil)
		}
	}
	pendingStore.Delete(key)

	// Remove auxilliary data structure entries.
	k.RemoveChunkedArtifactNode(ctx, chunkedArtifactId)
}

// RemoveChunkedArtifactNode removes this pending install from the keeper's
// ordered linked list structures, and deletes it from the store.
func (k Keeper) RemoveChunkedArtifactNode(ctx sdk.Context, chunkedArtifactId uint64) {
	lt := k.makeListTools(ctx)

	victimKey := lt.Key(chunkedArtifactId)
	victimNode := lt.Fetch(victimKey)

	// Remove the victim from the linked list, keeping the structure intact.
	lt.Unlink(victimNode, func(firstp, lastp *uint64) {
		state := k.GetState(ctx)
		if firstp != nil {
			state.FirstChunkedArtifactId = *firstp
		}
		if lastp != nil {
			state.LastChunkedArtifactId = *lastp
		}
		k.SetState(ctx, state)
	})

	// Finally, delete the victim node's storage.
	lt.Delete(victimKey)
}

func (k Keeper) GetChunkedArtifactNode(ctx sdk.Context, chunkedArtifactId uint64) *types.ChunkedArtifactNode {
	lt := k.makeListTools(ctx)
	return lt.Fetch(lt.Key(chunkedArtifactId))
}

func (k Keeper) GetSwingStore(ctx sdk.Context) storetypes.KVStore {
	kvstore := k.storeService.OpenKVStore(ctx)
	store := runtime.KVStoreAdapter(kvstore)
	return prefix.NewStore(store, []byte(swingStoreKeyPrefix))
}

func (k Keeper) PathToEncodedKey(path string) []byte {
	return k.vstorageKeeper.PathToEncodedKey(path)
}

func (k Keeper) GetStoreName() string {
	return k.vstorageKeeper.GetStoreName()
}
