package keeper

import (
	"encoding/json"

	"github.com/cosmos/cosmos-sdk/codec"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"

	capability "github.com/cosmos/cosmos-sdk/x/capability/types"

	vibckeeper "github.com/Agoric/agoric-sdk/golang/cosmos/x/vibc/keeper"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vtransfer/types"
	transfertypes "github.com/cosmos/ibc-go/v6/modules/apps/transfer/types"
	channeltypes "github.com/cosmos/ibc-go/v6/modules/core/04-channel/types"
	porttypes "github.com/cosmos/ibc-go/v6/modules/core/05-port/types"
	host "github.com/cosmos/ibc-go/v6/modules/core/24-host"
	ibcexported "github.com/cosmos/ibc-go/v6/modules/core/exported"
)

var (
	_ porttypes.ICS4Wrapper = (*Keeper)(nil)
)

// Keeper maintains the link to data storage and exposes getter/setter methods for the various parts of the state machine
type Keeper struct {
	vibckeeper.Keeper
	cdc codec.Codec
}

// NewKeeper creates a new dIBC Keeper instance
func NewKeeper(
	cdc codec.Codec,
	vibcKeeper vibckeeper.Keeper,
) Keeper {
	return Keeper{
		Keeper: vibcKeeper,
		cdc:    cdc,
	}
}

func (k Keeper) ReceiveWriteAcknowledgement(ctx sdk.Context, packet ibcexported.PacketI, ack ibcexported.Acknowledgement) error {
	portID := packet.GetDestPort()
	channelID := packet.GetDestChannel()
	capName := host.ChannelCapabilityPath(portID, channelID)
	chanCap, ok := k.GetCapability(ctx, capName)
	if !ok {
		return sdkerrors.Wrapf(channeltypes.ErrChannelCapabilityNotFound, "could not retrieve channel capability at: %s", capName)
	}
	return k.WriteAcknowledgement(ctx, chanCap, packet, ack)
}

// WriteAcknowledgement implements our middleware's custom WriteAcknowledgement.
// Essentially we check to see if the memo contains a contract
// invocation, and if so, send it to the VM.
func (k Keeper) WriteAcknowledgement(
	ctx sdk.Context,
	chanCap *capability.Capability,
	packet ibcexported.PacketI,
	ack ibcexported.Acknowledgement,
) error {
	_, err := k.parseInvokeMemo(ctx, packet)
	if err != nil {
		// We can't parse, but that means just to pass it up the middleware stack.
		return k.Keeper.WriteAcknowledgement(ctx, chanCap, packet, ack)
	}

	// AFTER THIS POINT, WE KNOW THAT THE MEMO IS A CONTRACT INVOCATION
	// Send to VM
	event := vibckeeper.WriteAcknowledgementEvent{
		Acknowledgement: ack.Acknowledgement(),
	}

	if err := k.PushAction(ctx, event); err != nil {
		errAck := channeltypes.NewErrorAcknowledgement(err)
		return k.Keeper.WriteAcknowledgement(ctx, chanCap, packet, errAck)
	}

	return nil
}

// Check the memo to see if this is a contract invocation.
func (k Keeper) parseInvokeMemo(ctx sdk.Context, packet ibcexported.PacketI) (*types.InvokeMemo, error) {
	var transferData transfertypes.FungibleTokenPacketData
	err := k.cdc.UnmarshalJSON(packet.GetData(), &transferData)
	if err != nil {
		return nil, err
	}

	var invoke types.InvokeMemo
	err = json.Unmarshal([]byte(transferData.Memo), &invoke)
	if err != nil {
		return nil, err
	}

	return &invoke, nil
}
