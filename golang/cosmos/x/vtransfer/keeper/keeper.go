package keeper

import (
	"encoding/json"

	"github.com/cosmos/cosmos-sdk/codec"
	sdk "github.com/cosmos/cosmos-sdk/types"

	capabilitykeeper "github.com/cosmos/cosmos-sdk/x/capability/keeper"

	bankkeeper "github.com/cosmos/cosmos-sdk/x/bank/keeper"

	vm "github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vtransfer/types"
	transfertypes "github.com/cosmos/ibc-go/v4/modules/apps/transfer/types"
	channeltypes "github.com/cosmos/ibc-go/v4/modules/core/04-channel/types"
	porttypes "github.com/cosmos/ibc-go/v4/modules/core/05-port/types"
	"github.com/cosmos/ibc-go/v4/modules/core/exported"
)

// Keeper maintains the link to data storage and exposes getter/setter methods for the various parts of the state machine
type Keeper struct {
	storeKey sdk.StoreKey
	cdc      codec.Codec

	channelKeeper types.ChannelKeeper
	portKeeper    types.PortKeeper
	scopedKeeper  capabilitykeeper.ScopedKeeper
	ics4Wrapper   porttypes.ICS4Wrapper

	PushAction vm.ActionPusher
}

// NewKeeper creates a new dIBC Keeper instance
func NewKeeper(
	cdc codec.Codec, key sdk.StoreKey,
	channelKeeper types.ChannelKeeper, portKeeper types.PortKeeper,
	bankKeeper bankkeeper.Keeper,
	scopedKeeper capabilitykeeper.ScopedKeeper,
	ics4Wrapper porttypes.ICS4Wrapper,
	pushAction vm.ActionPusher,
) Keeper {

	return Keeper{
		storeKey:      key,
		cdc:           cdc,
		channelKeeper: channelKeeper,
		portKeeper:    portKeeper,
		scopedKeeper:  scopedKeeper,
		ics4Wrapper:   ics4Wrapper,
		PushAction:    pushAction,
	}
}

// GetAppVersion returns the underlying application version.
func (k Keeper) GetAppVersion(ctx sdk.Context, portID, channelID string) (string, bool) {
	return k.ics4Wrapper.GetAppVersion(ctx, portID, channelID)
}

// OnRecvPacket implements our middleware's custom OnRecvPacket. Essentially we check to see if the memo contains a contract
// invocation, and if so, send it to the VM.
func (k Keeper) OnRecvPacket(
	ctx sdk.Context,
	packet channeltypes.Packet,
	relayer sdk.AccAddress,
) (ack exported.Acknowledgement, invoked bool) {

	// Check the memo to see if this is a contract invocation.
	transferData := transfertypes.MsgTransfer{}
	err := transferData.Unmarshal(packet.GetData())
	if err != nil {
		return nil, false
	}
	if transferData.Memo != "" {
		var call types.ContractInvoke
		err = json.Unmarshal([]byte(transferData.Memo), &call)
		// If the memo is not a contract invocation, we don't need to do anything and assume nothing needs to be done.
		// Thus, it gets pushed up the middleware stack.
		if err != nil {
			return nil, false
		}

		// AFTER THIS POINT, WE KNOW THAT THE MEMO IS A CONTRACT INVOCATION

		// Send to VM
		event := types.ReceiveInvokeEvent{
			Type:        "VTRANSFER_INVOKE",
			Event:       "callContract",
			Call:        call,
			BlockHeight: ctx.BlockHeight(),
			BlockTime:   ctx.BlockTime().Unix(),
		}

		err = k.PushAction(ctx, event)
		if err != nil {
			return channeltypes.NewErrorAcknowledgement(err), true
		}
		return nil, true
	}

	return nil, false
}
