package keeper

import (
	"fmt"
	"sort"
	"strings"

	"github.com/tendermint/tendermint/libs/log"

	"github.com/cosmos/cosmos-sdk/codec"
	"github.com/cosmos/cosmos-sdk/store/prefix"
	sdk "github.com/cosmos/cosmos-sdk/types"

	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	"github.com/cosmos/cosmos-sdk/x/capability"
	channel "github.com/cosmos/cosmos-sdk/x/ibc/04-channel"
	channelexported "github.com/cosmos/cosmos-sdk/x/ibc/04-channel/exported"
	channeltypes "github.com/cosmos/cosmos-sdk/x/ibc/04-channel/types"
	porttypes "github.com/cosmos/cosmos-sdk/x/ibc/05-port/types"
	ibctypes "github.com/cosmos/cosmos-sdk/x/ibc/types"

	"github.com/Agoric/agoric-sdk/packages/cosmic-swingset/x/swingset/internal/types"
)

// Keeper maintains the link to data storage and exposes getter/setter methods for the various parts of the state machine
type Keeper struct {
	storeKey sdk.StoreKey
	cdc      *codec.Codec

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
	scopedKeeper capability.ScopedKeeper,
) Keeper {

	return Keeper{
		storeKey:      key,
		cdc:           cdc,
		channelKeeper: channelKeeper,
		portKeeper:    portKeeper,
		scopedKeeper:  scopedKeeper,
	}
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
	store := ctx.KVStore(k.storeKey)
	dataStore := prefix.NewStore(store, types.DataPrefix)
	path := "mailbox." + peer
	if !dataStore.Has([]byte(path)) {
		return types.NewMailbox()
	}
	bz := dataStore.Get([]byte(path))
	var mailbox types.Storage
	k.cdc.MustUnmarshalBinaryLengthPrefixed(bz, &mailbox)
	return mailbox
}

// SetMailbox sets the entire mailbox struct for a peer
func (k Keeper) SetMailbox(ctx sdk.Context, peer string, mailbox types.Storage) {
	store := ctx.KVStore(k.storeKey)
	dataStore := prefix.NewStore(store, types.DataPrefix)
	path := "mailbox." + peer
	dataStore.Set([]byte(path), k.cdc.MustMarshalBinaryLengthPrefixed(mailbox))
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
func (k Keeper) ChanOpenInit(ctx sdk.Context, order channelexported.Order, connectionHops []string, portID, channelID string,
	portCap *capability.Capability, counterparty channeltypes.Counterparty, version string,
) (*capability.Capability, error) {
	return k.channelKeeper.ChanOpenInit(ctx, order, connectionHops, portID, channelID, portCap, counterparty, version)
}

// SendPacket defines a wrapper function for the channel Keeper's function
// in order to expose it to the SwingSet IBC handler.
func (k Keeper) SendPacket(ctx sdk.Context, packet channelexported.PacketI) error {
	portID := packet.GetSourcePort()
	channelID := packet.GetSourceChannel()
	capName := ibctypes.ChannelCapabilityPath(portID, channelID)
	chanCap, ok := k.scopedKeeper.GetCapability(ctx, capName)
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
	chanCap, ok := k.scopedKeeper.GetCapability(ctx, capName)
	if !ok {
		return sdkerrors.Wrapf(channel.ErrChannelCapabilityNotFound, "could not retrieve channel capability at: %s", capName)
	}
	return k.channelKeeper.PacketExecuted(ctx, chanCap, packet, acknowledgement)
}

// ChanCloseInit defines a wrapper function for the channel Keeper's function
// in order to expose it to the SwingSet IBC handler.
func (k Keeper) ChanCloseInit(ctx sdk.Context, portID, channelID string) error {
	capName := ibctypes.ChannelCapabilityPath(portID, channelID)
	chanCap, ok := k.scopedKeeper.GetCapability(ctx, capName)
	if !ok {
		return sdkerrors.Wrapf(channel.ErrChannelCapabilityNotFound, "could not retrieve channel capability at: %s", capName)
	}
	return k.channelKeeper.ChanCloseInit(ctx, portID, channelID, chanCap)
}

// BindPort defines a wrapper function for the port Keeper's function in
// order to expose it to the SwingSet IBC handler.
func (k Keeper) BindPort(ctx sdk.Context, portID string) error {
	cap := k.portKeeper.BindPort(ctx, portID)
	return k.ClaimCapability(ctx, cap, porttypes.PortPath(portID))
}

// TimeoutExecuted defines a wrapper function for the channel Keeper's function
// in order to expose it to the SwingSet IBC handler.
func (k Keeper) TimeoutExecuted(ctx sdk.Context, packet channelexported.PacketI) error {
	portID := packet.GetSourcePort()
	channelID := packet.GetSourceChannel()
	capName := ibctypes.ChannelCapabilityPath(portID, channelID)
	chanCap, ok := k.scopedKeeper.GetCapability(ctx, capName)
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
