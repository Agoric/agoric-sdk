package keeper

import (
	"context"
	"encoding/json"

	"github.com/cosmos/cosmos-sdk/codec"
	"github.com/cosmos/cosmos-sdk/store/prefix"
	storetypes "github.com/cosmos/cosmos-sdk/store/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"

	capabilitykeeper "github.com/cosmos/cosmos-sdk/x/capability/keeper"
	capabilitytypes "github.com/cosmos/cosmos-sdk/x/capability/types"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vibc"
	vibctypes "github.com/Agoric/agoric-sdk/golang/cosmos/x/vibc/types"
	transfertypes "github.com/cosmos/ibc-go/v6/modules/apps/transfer/types"
	channeltypes "github.com/cosmos/ibc-go/v6/modules/core/04-channel/types"
	porttypes "github.com/cosmos/ibc-go/v6/modules/core/05-port/types"
	host "github.com/cosmos/ibc-go/v6/modules/core/24-host"
	ibcexported "github.com/cosmos/ibc-go/v6/modules/core/exported"
)

var _ porttypes.ICS4Wrapper = (*Keeper)(nil)
var _ vibctypes.ReceiverImpl = (*Keeper)(nil)
var _ vm.PortHandler = (*Keeper)(nil)

// "watched addresses" is logically a set and physically a collection of
// KVStore entries in which each key is a concatenation of a fixed prefix and
// the address, and its corresponding value is a non-empty but otherwise irrelevant
// sentinel.
const (
	watchedAddressStoreKeyPrefix = "watchedAddress/"
	watchedAddressSentinel       = "y"
)

// Keeper handles the interceptions from the vtransfer IBC middleware, passing
// them to the embedded vibc keeper if they involve a targeted address (which is
// an address associated with a VM listener). The embedded vibc keeper is used
// to bridge calls to swingset, but with a special wrapper on the bridge
// controller to use distinct action types. The keeper keeps a store of
// "targeted addresses", managed from Swingset by bridge messages.
type Keeper struct {
	porttypes.ICS4Wrapper
	vibctypes.ReceiverImpl

	vibcKeeper vibc.Keeper

	key storetypes.StoreKey
	cdc codec.Codec

	vibcModule porttypes.IBCModule
}

// NewKeeper creates a new vtransfer Keeper instance
func NewKeeper(
	cdc codec.Codec,
	key storetypes.StoreKey,
	prototypeVibcKeeper vibc.Keeper,
	scopedTransferKeeper capabilitykeeper.ScopedKeeper,
	pushAction vm.ActionPusher,
) Keeper {
	wrappedPushAction := wrapActionPusher(pushAction)

	// This vibcKeeper is used to send notifications from the vtransfer middleware
	// to the VM.
	vibcKeeper := prototypeVibcKeeper.WithScope(nil, scopedTransferKeeper, wrappedPushAction)
	return Keeper{
		ICS4Wrapper:  vibcKeeper,
		ReceiverImpl: vibcKeeper,

		vibcKeeper: vibcKeeper,
		key:        key,
		vibcModule: vibc.NewIBCModule(vibcKeeper),
		cdc:        cdc,
	}
}

// wrapActionPusher wraps an ActionPusher to prefix the action type with
// "VTRANSFER_".
func wrapActionPusher(pusher vm.ActionPusher) vm.ActionPusher {
	return func(ctx sdk.Context, action vm.Action) error {
		action = vm.PopulateAction(ctx, action)

		// Prefix the action type.
		ah := action.GetActionHeader()
		ah.Type = "VTRANSFER_" + ah.Type

		// fmt.Println("@@@ vtransfer action", action)
		return pusher(ctx, action)
	}
}

func (k Keeper) GetICS4Wrapper() porttypes.ICS4Wrapper {
	return k
}

func (k Keeper) GetReceiverImpl() vibctypes.ReceiverImpl {
	return k
}

// InterceptOnRecvPacket runs the ibcModule and eventually acknowledges a packet.
// Many error acknowledgments are sent synchronously, but most cases instead return nil
// to tell the IBC system that acknowledgment is async (i.e., that WriteAcknowledgement
// will be called later, after the VM has dealt with the packet).
func (k Keeper) InterceptOnRecvPacket(ctx sdk.Context, ibcModule porttypes.IBCModule, packet channeltypes.Packet, relayer sdk.AccAddress) ibcexported.Acknowledgement {
	ack := ibcModule.OnRecvPacket(ctx, packet, relayer)

	if ack == nil {
		// Already declared to be an async ack.
		return nil
	}
	portID := packet.GetDestPort()
	channelID := packet.GetDestChannel()
	capName := host.ChannelCapabilityPath(portID, channelID)
	chanCap, ok := k.vibcKeeper.GetCapability(ctx, capName)
	if !ok {
		err := sdkerrors.Wrapf(channeltypes.ErrChannelCapabilityNotFound, "could not retrieve channel capability at: %s", capName)
		return channeltypes.NewErrorAcknowledgement(err)
	}
	// Give the VM a chance to write (or override) the ack.
	if err := k.InterceptWriteAcknowledgement(ctx, chanCap, packet, ack); err != nil {
		return channeltypes.NewErrorAcknowledgement(err)
	}
	return nil
}

// InterceptOnAcknowledgementPacket checks to see if the packet sender is a
// targeted account, and if so, delegates to the VM.
func (k Keeper) InterceptOnAcknowledgementPacket(
	ctx sdk.Context,
	ibcModule porttypes.IBCModule,
	packet channeltypes.Packet,
	acknowledgement []byte,
	relayer sdk.AccAddress,
) error {
	// Pass every acknowledgement to the wrapped IBC module.
	modErr := ibcModule.OnAcknowledgementPacket(ctx, packet, acknowledgement, relayer)

	// If the sender is not a targeted account, we're done.
	sender, _, err := k.parseTransfer(ctx, packet)
	if err != nil || sender == "" {
		return modErr
	}

	// Trigger VM, regardless of errors in the ibcModule.
	vmErr := k.vibcKeeper.TriggerOnAcknowledgementPacket(ctx, sender, packet, acknowledgement, relayer)

	// Any error from the VM is trumped by one from the wrapped IBC module.
	if modErr != nil {
		return modErr
	}
	return vmErr
}

// InterceptOnTimeoutPacket checks to see if the packet sender is a targeted
// account, and if so, delegates to the VM.
func (k Keeper) InterceptOnTimeoutPacket(
	ctx sdk.Context,
	ibcModule porttypes.IBCModule,
	packet channeltypes.Packet,
	relayer sdk.AccAddress,
) error {
	// Pass every timeout to the wrapped IBC module.
	modErr := ibcModule.OnTimeoutPacket(ctx, packet, relayer)

	// If the sender is not a targeted account, we're done.
	sender, _, err := k.parseTransfer(ctx, packet)
	if err != nil || sender == "" {
		return modErr
	}

	// Trigger VM, regardless of errors in the app.
	vmErr := k.vibcKeeper.TriggerOnTimeoutPacket(ctx, sender, packet, relayer)

	// Any error from the VM is trumped by one from the wrapped IBC module.
	if modErr != nil {
		return modErr
	}
	return vmErr
}

// InterceptWriteAcknowledgement checks to see if the packet's receiver is a
// targeted account, and if so, delegates to the VM.
func (k Keeper) InterceptWriteAcknowledgement(ctx sdk.Context, chanCap *capabilitytypes.Capability, packet ibcexported.PacketI, ack ibcexported.Acknowledgement) error {
	_, receiver, err := k.parseTransfer(ctx, packet)
	if err != nil || receiver == "" {
		// We can't parse, but that means just to ack directly.
		return k.WriteAcknowledgement(ctx, chanCap, packet, ack)
	}

	// Trigger VM
	if err = k.vibcKeeper.TriggerWriteAcknowledgement(ctx, receiver, packet, ack); err != nil {
		errAck := channeltypes.NewErrorAcknowledgement(err)
		return k.WriteAcknowledgement(ctx, chanCap, packet, errAck)
	}

	return nil
}

// parseTransfer checks if a packet's sender and/or receiver are targeted accounts.
func (k Keeper) parseTransfer(ctx sdk.Context, packet ibcexported.PacketI) (string, string, error) {
	var transferData transfertypes.FungibleTokenPacketData
	err := k.cdc.UnmarshalJSON(packet.GetData(), &transferData)
	if err != nil {
		return "", "", err
	}

	var sender string
	var receiver string
	prefixStore := prefix.NewStore(
		ctx.KVStore(k.key),
		[]byte(watchedAddressStoreKeyPrefix),
	)
	if prefixStore.Has([]byte(transferData.Sender)) {
		sender = transferData.Sender
	}
	if prefixStore.Has([]byte(transferData.Receiver)) {
		receiver = transferData.Receiver
	}
	return sender, receiver, nil
}

// GetWatchedAdresses returns the watched addresses from the keeper as a slice
// of account addresses.
func (k Keeper) GetWatchedAddresses(ctx sdk.Context) ([]sdk.AccAddress, error) {
	addresses := make([]sdk.AccAddress, 0)
	prefixStore := prefix.NewStore(ctx.KVStore(k.key), []byte(watchedAddressStoreKeyPrefix))
	iterator := sdk.KVStorePrefixIterator(prefixStore, []byte{})
	defer iterator.Close()
	for ; iterator.Valid(); iterator.Next() {
		addr, err := sdk.AccAddressFromBech32(string(iterator.Key()))
		if err != nil {
			return nil, err
		}
		addresses = append(addresses, addr)
	}
	return addresses, nil
}

// SetWatchedAddresses sets the watched addresses in the keeper from a slice of
// SDK account addresses.
func (k Keeper) SetWatchedAddresses(ctx sdk.Context, addresses []sdk.AccAddress) {
	prefixStore := prefix.NewStore(
		ctx.KVStore(k.key),
		[]byte(watchedAddressStoreKeyPrefix),
	)
	for _, addr := range addresses {
		prefixStore.Set([]byte(addr.String()), []byte(watchedAddressSentinel))
	}
}

type registrationAction struct {
	Type   string `json:"type"` // BRIDGE_TARGET_REGISTER or BRIDGE_TARGET_UNREGISTER
	Target string `json:"target"`
}

// Receive implements the vm.PortHandler interface.
func (k Keeper) Receive(cctx context.Context, jsonRequest string) (jsonReply string, err error) {
	ctx := sdk.UnwrapSDKContext(cctx)
	var msg registrationAction
	if err := json.Unmarshal([]byte(jsonRequest), &msg); err != nil {
		return "", err
	}

	prefixStore := prefix.NewStore(
		ctx.KVStore(k.key),
		[]byte(watchedAddressStoreKeyPrefix),
	)
	switch msg.Type {
	case "BRIDGE_TARGET_REGISTER":
		prefixStore.Set([]byte(msg.Target), []byte(watchedAddressSentinel))
	case "BRIDGE_TARGET_UNREGISTER":
		prefixStore.Delete([]byte(msg.Target))
	default:
		return "", sdkerrors.Wrapf(sdkerrors.ErrUnknownRequest, "unknown action type: %s", msg.Type)
	}
	return "true", nil
}
