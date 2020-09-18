package keeper

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"

	"github.com/tendermint/tendermint/libs/log"

	"github.com/cosmos/cosmos-sdk/codec"
	"github.com/cosmos/cosmos-sdk/store/prefix"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/x/auth"
	"github.com/cosmos/cosmos-sdk/x/bank"

	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	"github.com/cosmos/cosmos-sdk/x/capability"
	channel "github.com/cosmos/cosmos-sdk/x/ibc/04-channel"
	channelexported "github.com/cosmos/cosmos-sdk/x/ibc/04-channel/exported"
	channeltypes "github.com/cosmos/cosmos-sdk/x/ibc/04-channel/types"
	porttypes "github.com/cosmos/cosmos-sdk/x/ibc/05-port/types"
	ibctypes "github.com/cosmos/cosmos-sdk/x/ibc/types"

	"github.com/Agoric/cosmic-swingset/x/swingset/internal/types"
)

// Keeper maintains the link to data storage and exposes getter/setter methods for the various parts of the state machine
type Keeper struct {
	storeKey sdk.StoreKey
	cdc      *codec.Codec

	accountKeeper auth.AccountKeeper
	bankKeeper    bank.Keeper
	channelKeeper types.ChannelKeeper
	portKeeper    types.PortKeeper
	scopedKeeper  capability.ScopedKeeper

	// CallToController dispatches a message to the controlling process
	CallToController func(ctx sdk.Context, str string) (string, error)
}

// NewKeeper creates a new IBC transfer Keeper instance
func NewKeeper(
	cdc *codec.Codec, key sdk.StoreKey,
	channelKeeper types.ChannelKeeper, portKeeper types.PortKeeper,
	accountKeeper auth.AccountKeeper, bankKeeper bank.Keeper,
	scopedKeeper capability.ScopedKeeper,
) Keeper {

	return Keeper{
		storeKey:      key,
		cdc:           cdc,
		accountKeeper: accountKeeper,
		bankKeeper:    bankKeeper,
		channelKeeper: channelKeeper,
		portKeeper:    portKeeper,
		scopedKeeper:  scopedKeeper,
	}
}

func (k Keeper) GetBalance(ctx sdk.Context, addr sdk.AccAddress, denom string) sdk.Coin {
	return k.bankKeeper.GetBalance(ctx, addr, denom)
}

// GetEgress gets the entire egress struct for a peer
func (k Keeper) GetEgress(ctx sdk.Context, addr sdk.AccAddress) types.Egress {
	path := "egress." + addr.String()
	storage := k.GetStorage(ctx, path)
	if storage.Value == "" {
		return types.Egress{}
	}

	var egress types.Egress
	err := json.Unmarshal([]byte(storage.Value), &egress)
	if err != nil {
		panic(err)
	}

	return egress
}

// SetEgress sets the egress struct for a peer, and ensures its account exists
func (k Keeper) SetEgress(ctx sdk.Context, egress types.Egress) error {
	path := "egress." + egress.Peer.String()

	json, err := json.Marshal(egress)
	if err != nil {
		return err
	}

	storage := types.Storage{string(json)}
	k.SetStorage(ctx, path, storage)

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
func (k Keeper) ExportStorage(ctx sdk.Context) map[string]string {
	store := ctx.KVStore(k.storeKey)
	dataStore := prefix.NewStore(store, types.DataPrefix)

	iterator := sdk.KVStorePrefixIterator(dataStore, nil)

	exported := make(map[string]string)
	defer iterator.Close()
	for ; iterator.Valid(); iterator.Next() {
		var storage types.Storage
		k.cdc.MustUnmarshalBinaryLengthPrefixed(iterator.Value(), &storage)
		exported[string(iterator.Key())] = storage.Value
	}
	return exported
}

// GetStorage gets generic storage
func (k Keeper) GetStorage(ctx sdk.Context, path string) types.Storage {
	//fmt.Printf("GetStorage(%s)\n", path);
	store := ctx.KVStore(k.storeKey)
	dataStore := prefix.NewStore(store, types.DataPrefix)
	if !dataStore.Has([]byte(path)) {
		return types.Storage{""}
	}
	bz := dataStore.Get([]byte(path))
	var storage types.Storage
	k.cdc.MustUnmarshalBinaryLengthPrefixed(bz, &storage)
	return storage
}

// GetKeys gets all storage child keys at a given path
func (k Keeper) GetKeys(ctx sdk.Context, path string) types.Keys {
	store := ctx.KVStore(k.storeKey)
	keysStore := prefix.NewStore(store, types.KeysPrefix)
	if !keysStore.Has([]byte(path)) {
		return types.NewKeys()
	}
	bz := keysStore.Get([]byte(path))
	var keys types.Keys
	k.cdc.MustUnmarshalBinaryLengthPrefixed(bz, &keys)
	return keys
}

// SetStorage sets the entire generic storage for a path
func (k Keeper) SetStorage(ctx sdk.Context, path string, storage types.Storage) {
	store := ctx.KVStore(k.storeKey)
	dataStore := prefix.NewStore(store, types.DataPrefix)
	keysStore := prefix.NewStore(store, types.KeysPrefix)

	fullPathArray := strings.Split(path, ".")
	oneUp := strings.Join(fullPathArray[0:len(fullPathArray)-1], ".")
	lastKey := fullPathArray[len(fullPathArray)-1]

	// Get a map corresponding to the keys for the parent key.
	keyNode := k.GetKeys(ctx, oneUp)
	keyList := keyNode.Keys
	keyMap := make(map[string]bool, len(keyList)+1)
	for _, key := range keyList {
		keyMap[key] = true
	}

	if storage.Value == "" {
		delete(keyMap, lastKey)
	} else {
		keyMap[lastKey] = true
	}

	// Update the list of keys
	keyList = make([]string, 0, len(keyMap))
	for key := range keyMap {
		keyList = append(keyList, key)
	}

	// Update the value.
	if storage.Value == "" {
		dataStore.Delete([]byte(path))
	} else {
		dataStore.Set([]byte(path), k.cdc.MustMarshalBinaryLengthPrefixed(storage))
	}

	// Update the keys.
	if len(keyList) == 0 {
		keysStore.Delete([]byte(oneUp))
	} else {
		// Update the key node.
		sort.Strings(keyList)
		keyNode.Keys = keyList
		keysStore.Set([]byte(oneUp), k.cdc.MustMarshalBinaryLengthPrefixed(keyNode))
	}
}

// Logger returns a module-specific logger.
func (k Keeper) Logger(ctx sdk.Context) log.Logger {
	return ctx.Logger().With("module", fmt.Sprintf("x/%s", types.ModuleName))
}

// GetMailbox gets the entire mailbox struct for a peer
func (k Keeper) GetMailbox(ctx sdk.Context, peer string) types.Storage {
	path := "mailbox." + peer
	return k.GetStorage(ctx, path)
}

// SetMailbox sets the entire mailbox struct for a peer
func (k Keeper) SetMailbox(ctx sdk.Context, peer string, mailbox types.Storage) {
	path := "mailbox." + peer
	k.SetStorage(ctx, path, mailbox)
}

// GetPeersIterator works over all peers in which the keys are the peers and the values are the mailbox
func (k Keeper) GetPeersIterator(ctx sdk.Context) sdk.Iterator {
	store := ctx.KVStore(k.storeKey)
	return sdk.KVStorePrefixIterator(store, nil)
}

// GetNextSequenceSend defines a wrapper function for the channel Keeper's function
// in order to expose it to the SwingSet IBC handler.
func (k Keeper) GetNextSequenceSend(ctx sdk.Context, portID, channelID string) (uint64, bool) {
	return k.channelKeeper.GetNextSequenceSend(ctx, portID, channelID)
}

// ChanOpenInit defines a wrapper function for the channel Keeper's function
// in order to expose it to the SwingSet IBC handler.
func (k Keeper) ChanOpenInit(ctx sdk.Context, order ibctypes.Order, connectionHops []string,
	portID, channelID, rPortID, rChannelID, version string,
) error {
	capName := ibctypes.PortPath(portID)
	portCap, ok := k.GetCapability(ctx, capName)
	if !ok {
		return sdkerrors.Wrapf(porttypes.ErrInvalidPort, "could not retrieve port capability at: %s", capName)
	}
	counterparty := channeltypes.Counterparty{
		ChannelID: rChannelID,
		PortID:    rPortID,
	}
	chanCap, err := k.channelKeeper.ChanOpenInit(ctx, order, connectionHops, portID, channelID, portCap, counterparty, version)
	if err != nil {
		return err
	}
	chanCapName := ibctypes.ChannelCapabilityPath(portID, channelID)
	return k.ClaimCapability(ctx, chanCap, chanCapName)
}

// SendPacket defines a wrapper function for the channel Keeper's function
// in order to expose it to the SwingSet IBC handler.
func (k Keeper) SendPacket(ctx sdk.Context, packet channelexported.PacketI) error {
	portID := packet.GetSourcePort()
	channelID := packet.GetSourceChannel()
	capName := ibctypes.ChannelCapabilityPath(portID, channelID)
	chanCap, ok := k.GetCapability(ctx, capName)
	if !ok {
		return sdkerrors.Wrapf(channel.ErrChannelCapabilityNotFound, "could not retrieve channel capability at: %s", capName)
	}
	return k.channelKeeper.SendPacket(ctx, chanCap, packet)
}

// PacketExecuted defines a wrapper function for the channel Keeper's function
// in order to expose it to the SwingSet IBC handler.
func (k Keeper) PacketExecuted(ctx sdk.Context, packet channelexported.PacketI, acknowledgement []byte) error {
	portID := packet.GetDestPort()
	channelID := packet.GetDestChannel()
	capName := ibctypes.ChannelCapabilityPath(portID, channelID)
	chanCap, ok := k.GetCapability(ctx, capName)
	if !ok {
		return sdkerrors.Wrapf(channel.ErrChannelCapabilityNotFound, "could not retrieve channel capability at: %s", capName)
	}
	return k.channelKeeper.PacketExecuted(ctx, chanCap, packet, acknowledgement)
}

// ChanCloseInit defines a wrapper function for the channel Keeper's function
// in order to expose it to the SwingSet IBC handler.
func (k Keeper) ChanCloseInit(ctx sdk.Context, portID, channelID string) error {
	capName := ibctypes.ChannelCapabilityPath(portID, channelID)
	chanCap, ok := k.GetCapability(ctx, capName)
	if !ok {
		return sdkerrors.Wrapf(channel.ErrChannelCapabilityNotFound, "could not retrieve channel capability at: %s", capName)
	}
	return k.channelKeeper.ChanCloseInit(ctx, portID, channelID, chanCap)
}

// BindPort defines a wrapper function for the port Keeper's function in
// order to expose it to the SwingSet IBC handler.
func (k Keeper) BindPort(ctx sdk.Context, portID string) error {
	cap := k.portKeeper.BindPort(ctx, portID)
	return k.ClaimCapability(ctx, cap, ibctypes.PortPath(portID))
}

// TimeoutExecuted defines a wrapper function for the channel Keeper's function
// in order to expose it to the SwingSet IBC handler.
func (k Keeper) TimeoutExecuted(ctx sdk.Context, packet channelexported.PacketI) error {
	portID := packet.GetSourcePort()
	channelID := packet.GetSourceChannel()
	capName := ibctypes.ChannelCapabilityPath(portID, channelID)
	chanCap, ok := k.GetCapability(ctx, capName)
	if !ok {
		return sdkerrors.Wrapf(channel.ErrChannelCapabilityNotFound, "could not retrieve channel capability at: %s", capName)
	}
	return k.channelKeeper.TimeoutExecuted(ctx, chanCap, packet)
}

// ClaimCapability allows the SwingSet module to claim a capability that IBC module
// passes to it
func (k Keeper) ClaimCapability(ctx sdk.Context, cap *capability.Capability, name string) error {
	return k.scopedKeeper.ClaimCapability(ctx, cap, name)
}

func (k Keeper) GetCapability(ctx sdk.Context, name string) (*capability.Capability, bool) {
	return k.scopedKeeper.GetCapability(ctx, name)
}
