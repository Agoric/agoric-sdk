package keeper

import (
	"github.com/cosmos/cosmos-sdk/codec"
	storetypes "github.com/cosmos/cosmos-sdk/store/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"

	capabilitytypes "github.com/cosmos/cosmos-sdk/x/capability/types"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vibc"
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

func (k Keeper) InterceptOnSendAck(ctx sdk.Context, packet ibcexported.PacketI, ack ibcexported.Acknowledgement) ibcexported.Acknowledgement {
	if ack == nil {
		// We need to wait for somebody else to send the acknowledgement.
		return nil
	}
	portID := packet.GetDestPort()
	channelID := packet.GetDestChannel()
	capName := host.ChannelCapabilityPath(portID, channelID)
	chanCap, ok := k.GetCapability(ctx, capName)
	if !ok {
		err := sdkerrors.Wrapf(channeltypes.ErrChannelCapabilityNotFound, "could not retrieve channel capability at: %s", capName)
		return channeltypes.NewErrorAcknowledgement(err)
	}
	if err := k.InterceptWriteAcknowledgement(ctx, chanCap, packet, ack); err != nil {
		return channeltypes.NewErrorAcknowledgement(err)
	}
	// Written elsewhere.
	return nil
}

func (k Keeper) InterceptWriteAcknowledgement(ctx sdk.Context, chanCap *capabilitytypes.Capability, packet ibcexported.PacketI, ack ibcexported.Acknowledgement) error {
	_, receiver, err := k.parseTransfer(ctx, packet)
	if err != nil || receiver == "" {
		// We can't parse, but that means just to ack directly.
		return k.WriteAcknowledgement(ctx, chanCap, packet, ack)
	}

	// Trigger VM
	if err = k.Keeper.TriggerWriteAcknowledgement(ctx, receiver, packet, ack); err != nil {
		// Send the error to the other side.
		errAck := channeltypes.NewErrorAcknowledgement(err)
		return k.WriteAcknowledgement(ctx, chanCap, packet, errAck)
	}

	return nil
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

// InterceptOnAcknowledgementPacket checks to see if the packet contains a contract
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

	sender, _, err := k.parseTransfer(ctx, packet)
	if err != nil || sender == "" {
		return firstErr
	}

	// Trigger VM
	err = k.Keeper.TriggerOnAcknowledgementPacket(ctx, sender, packet, acknowledgement, relayer)
	if firstErr == nil {
		return err
	}
	return firstErr
}

// InterceptOnTimeoutPacket checks to see if the packet contains a contract
// invocation, and if so, send it to the VM.
func (k Keeper) InterceptOnTimeoutPacket(
	ctx sdk.Context,
	app porttypes.IBCModule,
	packet channeltypes.Packet,
	relayer sdk.AccAddress,
) error {
	// Always trigger the application.
	firstErr := app.OnTimeoutPacket(ctx, packet, relayer)

	sender, _, err := k.parseTransfer(ctx, packet)
	if err != nil || sender == "" {
		return firstErr
	}

	// Trigger VM
	err = k.Keeper.TriggerOnTimeoutPacket(ctx, sender, packet, relayer)
	if firstErr == nil {
		return err
	}
	return firstErr
}

// Check the packet to see if this is a contract invocation.
func (k Keeper) parseTransfer(_ sdk.Context, packet ibcexported.PacketI) (string, string, error) {
	var transferData transfertypes.FungibleTokenPacketData
	err := k.cdc.UnmarshalJSON(packet.GetData(), &transferData)
	if err != nil {
		return "", "", err
	}

	return transferData.Sender, transferData.Receiver, nil
}
