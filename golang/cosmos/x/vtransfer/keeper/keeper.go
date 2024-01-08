package keeper

import (
	"encoding/json"

	"github.com/cosmos/cosmos-sdk/codec"
	storetypes "github.com/cosmos/cosmos-sdk/store/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"

	capability "github.com/cosmos/cosmos-sdk/x/capability/types"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vibc"
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
	vibc.Keeper

	key storetypes.StoreKey
	cdc codec.Codec

	vibcModule porttypes.IBCModule
}

// NewKeeper creates a new dIBC Keeper instance
func NewKeeper(
	cdc codec.Codec,
	key storetypes.StoreKey,
	vibcKeeper vibc.Keeper,
) Keeper {
	return Keeper{
		Keeper:     vibcKeeper,
		key:        key,
		cdc:        cdc,
		vibcModule: vibc.NewIBCModule(vibcKeeper),
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

// InterceptWriteAcknowledgement checks to see if the memo contains a contract
// invocation, and if so, send it to the VM.
func (k Keeper) InterceptWriteAcknowledgement(
	ctx sdk.Context,
	chanCap *capability.Capability,
	packet ibcexported.PacketI,
	ack ibcexported.Acknowledgement,
) error {
	im, err := k.parseInvokeMemo(ctx, packet)
	if err != nil || im.InvokeWriteAcknowledgement == "" {
		// We can't parse, but that means just to pass it up the middleware stack.
		return k.Keeper.WriteAcknowledgement(ctx, chanCap, packet, ack)
	}

	// Trigger VM
	if err = k.Keeper.TriggerWriteAcknowledgement(ctx, im.InvokeWriteAcknowledgement, packet, ack); err != nil {
		// Send the error to the other side.
		errAck := channeltypes.NewErrorAcknowledgement(err)
		return k.Keeper.WriteAcknowledgement(ctx, chanCap, packet, errAck)
	}

	return err
}

// InterceptOnAcknowledgementPacket checks to see if the memo contains a contract
// invocation, and if so, send it to the VM.
func (k Keeper) InterceptOnAcknowledgementPacket(
	ctx sdk.Context,
	app porttypes.IBCModule,
	packet channeltypes.Packet,
	acknowledgement []byte,
	relayer sdk.AccAddress,
) error {
	// Always trigger the application.
	firstErr := app.OnAcknowledgementPacket(ctx, packet, acknowledgement, relayer)

	im, err := k.parseInvokeMemo(ctx, packet)
	if err != nil || im.InvokeOnAcknowledgementPacket == "" {
		return firstErr
	}

	// Trigger VM
	err = k.Keeper.TriggerOnAcknowledgementPacket(ctx, im.InvokeOnAcknowledgementPacket, packet, acknowledgement, relayer)
	if firstErr == nil {
		return err
	}
	return firstErr
}

// InterceptOnTimeoutPacket checks to see if the memo contains a contract
// invocation, and if so, send it to the VM.
func (k Keeper) InterceptOnTimeoutPacket(
	ctx sdk.Context,
	app porttypes.IBCModule,
	packet channeltypes.Packet,
	relayer sdk.AccAddress,
) error {
	// Always trigger the application.
	firstErr := app.OnTimeoutPacket(ctx, packet, relayer)

	im, err := k.parseInvokeMemo(ctx, packet)
	if err != nil || im.InvokeOnTimeoutPacket == "" {
		return firstErr
	}

	// Trigger VM
	err = k.Keeper.TriggerOnTimeoutPacket(ctx, im.InvokeOnTimeoutPacket, packet, relayer)
	if firstErr == nil {
		return err
	}
	return firstErr
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
